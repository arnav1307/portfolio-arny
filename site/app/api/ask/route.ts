import {
  AGENT_MODEL,
  BUSY_MESSAGE,
  isLanguage,
  languageInstruction,
  MAX_HISTORY,
  MAX_INPUT_CHARS,
  MAX_TOKENS,
  OPEN_TO_WORK,
  SYSTEM_PROMPT,
  TOO_FAST,
} from "@/lib/agent-prompt";
import {
  checkAndRecord,
  clientIp,
  creditBack,
  registerAnswer,
  verifyToken,
} from "@/lib/agent-guard";

/**
 * The interview agent's brain. Streams Claude Haiku back to the widget.
 *
 * Deliberately NOT using the Anthropic SDK. A plain fetch keeps this feature at
 * zero new dependencies (lenis was already required), and the streaming shape is
 * about twenty lines either way.
 *
 * Wire format is our own, not OpenAI's, because we control both ends. Two event
 * types, newline-delimited JSON:
 *     {"t":"<text chunk>"}      incremental text
 *     {"id":"<answer id>"}      final, once; the 🔊 button needs it
 * Nothing here has to satisfy a third party's schema. (An earlier draft of the
 * spec did need OpenAI's SSE format, back when ElevenLabs Agents was going to
 * call us. That approach was dropped. See spec §2.)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

const enc = new TextEncoder();
const line = (obj: unknown) => enc.encode(JSON.stringify(obj) + "\n");

function plain(text: string, status = 200, extraHeaders?: Record<string, string>) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(line({ t: text }));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return plain("The agent isn't configured yet.", 500);

  let body: { messages?: Msg[]; token?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return plain("Something went wrong reading that.", 400);
  }

  // Anything other than the two we support falls back to English rather than
  // erroring — a bad lang value shouldn't cost the visitor a question.
  const lang = isLanguage(body.lang) ? body.lang : "en";

  if (!verifyToken(body.token)) {
    return plain("Session expired. Reopen the panel and try again.", 401);
  }

  // Trust nothing from the client except the words. Roles are re-derived, the
  // system prompt is ours, and history is truncated here rather than there.
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = incoming
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content.slice(0, MAX_INPUT_CHARS),
    }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return plain("Ask me something and I'll answer.", 400);
  }

  const ip = clientIp(req);
  const guard = checkAndRecord(ip);
  if (!guard.ok) {
    // Only the GLOBAL ceiling gets the open-to-work pitch (Arnav 2026-08-29). The per-IP wall lifts in about a
    // minute, so following "give it a minute" with "book a call" reads as a
    // brush-off for something that is not actually a dead end. Ted is out of
    // answers for the day in one case and briefly busy in the other; only the
    // first is a reason to move the conversation to a call.
    if (guard.reason === "global") {
      // The header tells the widget to render the booking CTA under this turn.
      // A body flag would not work: error copy streams in the same `{t}` shape
      // as a real answer, so the client cannot tell them apart from content.
      return plain(`${BUSY_MESSAGE[lang]}\n\n${OPEN_TO_WORK[lang]}`, 429, {
        "X-Agent-Wall": "global",
      });
    }
    return plain(TOO_FAST[lang], 429);
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: AGENT_MODEL,
      max_tokens: MAX_TOKENS,
      stream: true,
      // TWO blocks, and the split matters. The big grounding block is identical
      // for every request in every language and carries cache_control, so it
      // costs ~90% less on a read. The language line is a few dozen tokens and
      // is deliberately left OUT of the cached prefix — otherwise English and
      // Dutch would be two separate cache entries, and every toggle would pay a
      // fresh cache write on 2k tokens to save nothing.
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: languageInstruction(lang) },
      ],
      messages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    console.error("anthropic error", upstream.status, await upstream.text().catch(() => ""));
    // Nothing was delivered, so this shouldn't have cost the visitor a slice
    // of their real quota — see creditBack's own doc for why.
    creditBack(ip);
    return plain("I couldn't get to my own brain just then. Try again in a moment.", 502);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      let answer = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Last element may be a partial line; keep it for the next chunk.
          buffer = lines.pop() ?? "";

          for (const raw of lines) {
            if (!raw.startsWith("data:")) continue;
            const payload = raw.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const event = JSON.parse(payload);
              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta" &&
                typeof event.delta.text === "string"
              ) {
                answer += event.delta.text;
                controller.enqueue(line({ t: event.delta.text }));
              }
            } catch {
              // A malformed event is not worth killing a good stream over.
            }
          }
        }

        // The id is a signed answer token for /api/speak. Stateless across
        // Vercel instances — no shared Map. Browser never sends free-form text.
        if (answer.trim()) {
          controller.enqueue(line({ id: registerAnswer(answer.trim()) }));
        }
      } catch (err) {
        console.error("stream failed", err);
        // Only credit back if nothing was actually delivered — a stream that
        // produced partial text before erroring did spend real tokens, so
        // that one stays charged. An empty answer means zero spend and zero
        // value to the visitor, exactly the case creditBack exists for.
        if (!answer.trim()) creditBack(ip);
        controller.enqueue(line({ t: " ...lost my train of thought there. Ask again?" }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
