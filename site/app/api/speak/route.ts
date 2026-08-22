import {
  AGENT_MODEL,
  isLanguage,
  type Language,
  SPEAK_HARD_LIMIT,
  SPEAK_TARGET,
  SPEAK_VERBATIM_LIMIT,
  TTS_MODEL,
  VOICE_ID,
} from "@/lib/agent-prompt";
import {
  checkAndRecord,
  clientIp,
  lookupAnswer,
  verifyToken,
} from "@/lib/agent-guard";

/**
 * Turns one answer into audio. ElevenLabs TTS, free tier, ~10,000 characters a
 * month.
 *
 * ⚠️ Takes a signed ANSWER ID, never free-form text. This is the whole security
 * design: the browser cannot invent words to synthesise without the session
 * secret, so the route cannot be turned into an open TTS proxy on Arnav's free
 * quota. The id carries the answer (HMAC + timestamp) so ask/speak work across
 * separate Vercel instances with no shared Map.
 *
 * Two lengths, because reading and listening are different (spec §0):
 *   ≤320 chars  spoken verbatim
 *   >320 chars  one small Haiku call compresses it to ≤300 first
 * Compressing on demand beats generating a spoken variant with every answer,
 * since only a fraction of answers ever get played.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (status: number, code: string) =>
  Response.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Squeeze a long answer down to something worth listening to.
 *
 * Every character here is billed, so this is the main cost lever on the whole
 * feature. Dropping a whole detail beats shaving every sentence: the result has
 * to sound like a person talking, not a compressed summary.
 */
async function compress(text: string, key: string, lang: Language): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: AGENT_MODEL,
      max_tokens: 80,
      system:
        `Rewrite the text as it would be SPOKEN aloud, under ${SPEAK_TARGET} characters. ` +
        `Reply in ${lang === "nl" ? "Dutch" : "English"}, matching the input. ` +
        "Keep the first person, the meaning and the tone. Drop a whole detail rather " +
        "than trimming every sentence, so it still sounds like a person talking and " +
        "not a summary. Never use an em dash. Reply with the rewritten text only, " +
        "no preamble.",
      messages: [{ role: "user", content: text }],
    }),
  });

  // A failed compression must never fall through to sending the FULL answer to
  // TTS. Truncating at the limit is the safe failure: worse audio, bounded cost.
  if (!res.ok) return text.slice(0, SPEAK_TARGET);

  const data = await res.json();
  const out = data?.content?.[0]?.text;
  return typeof out === "string" && out.trim() ? out.trim() : text.slice(0, SPEAK_TARGET);
}

export async function POST(req: Request) {
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!elevenKey) return err(500, "unconfigured");

  let body: { id?: string; token?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return err(400, "bad_request");
  }

  if (!verifyToken(body.token)) return err(401, "expired");

  const lang: Language = isLanguage(body.lang) ? body.lang : "en";

  /**
   * 🔇 ENGLISH ONLY (Arnav 2026-08-15). Dutch answers are never spoken.
   *
   * Characters are the billed unit and the free tier is 10k a month, so every
   * Dutch playback was spending the English budget on a language the recruiter
   * can already read. Refusing here rather than in the browser matters: the
   * button is only hidden client-side, and this route is a public URL.
   *
   * It also skips the compression call, so a Dutch answer costs nothing at all.
   */
  if (lang !== "en") return err(400, "voice_english_only");

  const answer = lookupAnswer(body.id);
  if (!answer) return err(404, "unknown_answer");

  const guard = checkAndRecord(clientIp(req));
  if (!guard.ok) return err(429, "rate_limited");

  let text = answer;
  if (text.length > SPEAK_VERBATIM_LIMIT && anthropicKey) {
    text = await compress(text, anthropicKey, lang);
  }
  // Final backstop before anything reaches ElevenLabs, however it got here.
  // Characters are the billed unit, so this is a spend ceiling, not a nicety.
  if (text.length > SPEAK_HARD_LIMIT) text = text.slice(0, SPEAK_HARD_LIMIT);

  const speech = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "xi-api-key": elevenKey },
      body: JSON.stringify({
        text,
        model_id: TTS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        // `language_code` is only accepted by the turbo and flash models;
        // multilingual_v2 rejects it. TTS_MODEL is meant to be flipped between
        // the two, so this stays conditional rather than assuming turbo.
        ...(/turbo|flash/.test(TTS_MODEL) ? { language_code: lang } : {}),
      }),
    },
  );

  if (!speech.ok) {
    // 401 here means the free character quota is gone. The widget swaps the
    // buttons for a quiet note; it is not an error state (spec §6).
    const quotaGone = speech.status === 401 || speech.status === 429;
    console.error("elevenlabs error", speech.status);
    return err(quotaGone ? 429 : 502, quotaGone ? "quota" : "tts_failed");
  }

  return new Response(speech.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      // Same answer, same audio. Replaying a clip must never cost characters.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
