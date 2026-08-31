/**
 * Interview agent — guardrails. Server only.
 *
 * ⚠️ Read design/interview-agent-spec.md §7 before changing any number in here.
 * The reasoning matters more than the values:
 *
 *   The GUARANTEE that Arnav's bill cannot run away is the spend limit set in the
 *   Anthropic Console. It is not in this file, and it cannot be out-engineered
 *   because it is not code.
 *
 *   Everything here exists to shape the HONEST visitor's experience. That is why
 *   the limits are deliberately lenient. A visitor who clears localStorage to ask
 *   a fourth question costs a third of a cent and is, by definition, interested.
 *   Being strict would only punish three recruiters sharing one office IP while
 *   doing nothing an attacker could not route around with a proxy.
 *
 * Storage note: Vercel is stateless across instances, so these counters are
 * approximate and a cold start resets them. That is fine at this traffic, and the
 * Console spend limit is what makes it not matter. If it ever does matter,
 * Upstash Redis has a free tier. Do not add it on day one.
 */

import { createHmac, timingSafeEqual, randomUUID } from "crypto";

/** Per-IP. Wide on purpose: an office NAT never notices, a script hits it in a minute. */
const IP_PER_HOUR = 20;
const IP_PER_DAY = 60;

/** Site-wide answers per day. The in-code ceiling; ~$0.40 at Haiku prices. */
const GLOBAL_PER_DAY = 300;

/** Session tokens expire well before anyone finishes reading three answers. */
const TOKEN_TTL_MS = 30 * 60 * 1000;

/**
 * Per-IP cap on token MINTING (2026-08-31 review).
 *
 * `/api/session` used to be unlimited on the reasoning that issuing a token
 * costs nothing. True of the token itself — but each one is a valid 30-minute
 * key to the two routes that DO spend, and minting need not be correlated with
 * spending, so a script could stockpile thousands and pipeline them.
 *
 * Deliberately generous: a real visitor mints one per panel open, and a hard
 * reload mints another. 40/hour is far past any honest usage while still
 * capping a stockpile. This does not replace the per-answer limits below; it
 * removes the free unlimited step in front of them.
 */
const SESSION_PER_HOUR = 40;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function secret(): string | null {
  const s = process.env.AGENT_SESSION_SECRET;
  return s && s.length > 0 ? s : null;
}

// ── Session tokens ───────────────────────────────────────────────────────────
// Signed, not encrypted. They carry no secrets, they just prove the request came
// from someone who actually loaded the site. This does NOT stop a page refresh
// (nothing cheap does, and we do not want to). It stops requests that never
// loaded the site at all, which is how scripted abuse starts.

export function issueToken(): string {
  const key = secret();
  if (!key) throw new Error("AGENT_SESSION_SECRET is not set");
  const payload = `${randomUUID()}.${Date.now()}`;
  const sig = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string | undefined | null): boolean {
  const key = secret();
  if (!key || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [id, issued, sig] = parts;
  const expected = createHmac("sha256", key)
    .update(`${id}.${issued}`)
    .digest("base64url");

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on a mismatch rather than returning false.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const ts = Number(issued);
  return Number.isFinite(ts) && Date.now() - ts < TOKEN_TTL_MS;
}

// ── Rate limiting ────────────────────────────────────────────────────────────

type Bucket = { hour: number[]; day: number[] };
const ipBuckets = new Map<string, Bucket>();
let globalDay: number[] = [];

/** Separate from `ipBuckets` on purpose — minting a token and spending money
 *  are different budgets, and sharing one bucket would let a burst of page
 *  loads eat into a visitor's real answer quota. */
const sessionBuckets = new Map<string, number[]>();

/**
 * `x-forwarded-for` is client-settable and cannot be trusted for rate limiting
 * on its own — a request can send any value it wants there. Vercel's edge
 * additionally sets `x-vercel-forwarded-for`, which a client cannot override,
 * so that one is checked first. Falls back to the spoofable headers only when
 * not running behind Vercel (e.g. local dev).
 */
export function clientIp(req: Request): string {
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

const since = (stamps: number[], window: number, now: number) =>
  stamps.filter((t) => now - t < window);

type GuardResult =
  /** `stamp` is the value recorded for this hit — pass it to creditBack. */
  | { ok: true; stamp: number }
  | { ok: false; status: 429; reason: "ip" | "global" };

/**
 * Call once per answer, BEFORE spending anything. Records the hit on success.
 */
export function checkAndRecord(ip: string): GuardResult {
  const now = Date.now();

  globalDay = since(globalDay, DAY, now);
  if (globalDay.length >= GLOBAL_PER_DAY) {
    return { ok: false, status: 429, reason: "global" };
  }

  const bucket = ipBuckets.get(ip) ?? { hour: [], day: [] };
  bucket.hour = since(bucket.hour, HOUR, now);
  bucket.day = since(bucket.day, DAY, now);

  if (bucket.hour.length >= IP_PER_HOUR || bucket.day.length >= IP_PER_DAY) {
    ipBuckets.set(ip, bucket);
    return { ok: false, status: 429, reason: "ip" };
  }

  bucket.hour.push(now);
  bucket.day.push(now);
  ipBuckets.set(ip, bucket);
  globalDay.push(now);

  // Unbounded Maps are how a long-lived instance leaks. Cheap opportunistic sweep.
  if (ipBuckets.size > 5000) {
    for (const [key, value] of ipBuckets) {
      if (since(value.day, DAY, now).length === 0) ipBuckets.delete(key);
    }
  }

  return { ok: true, stamp: now };
}

/**
 * Per-IP throttle for `/api/session`. Spends nothing, so it is separate from
 * `checkAndRecord` and never touches the answer quota.
 *
 * Returns false when the caller should be refused.
 */
export function allowSession(ip: string): boolean {
  const now = Date.now();
  const stamps = since(sessionBuckets.get(ip) ?? [], HOUR, now);

  if (stamps.length >= SESSION_PER_HOUR) {
    sessionBuckets.set(ip, stamps);
    return false;
  }

  stamps.push(now);
  sessionBuckets.set(ip, stamps);

  // Same opportunistic sweep as ipBuckets — an unbounded Map is how a
  // long-lived instance leaks.
  if (sessionBuckets.size > 5000) {
    for (const [key, value] of sessionBuckets) {
      if (since(value, HOUR, now).length === 0) sessionBuckets.delete(key);
    }
  }

  return true;
}

/**
 * Undo one checkAndRecord hit for this IP. Call when the upstream call the
 * guard was gating never actually delivered anything — a failed Anthropic/
 * ElevenLabs request, or a stream that errored before producing an answer.
 * Without this, a transient upstream failure permanently burns a slice of
 * the visitor's real per-IP/global quota for zero answers (Arnav 2026-08-28
 * code review finding).
 *
 * ⚠️ Takes the STAMP to remove, and removes that exact value (2026-08-31
 * review). The previous version popped the most recent entry, on the reasoning
 * that checkAndRecord had just pushed it "with nothing awaited in between" —
 * which is not true of either caller. /api/ask awaits the Anthropic fetch and
 * /api/speak awaits compress() plus the ElevenLabs call between the two, so
 * under concurrency a pop discarded a DIFFERENT request's stamp: the failing
 * request stayed charged and an unrelated in-flight one silently got its slot
 * back. Removing by value cannot mix the two up.
 *
 * Safe to call with a stamp that is already gone (a window rolled over, or a
 * double credit) — the splice simply finds nothing.
 */
export function creditBack(ip: string, stamp: number): void {
  const drop = (stamps: number[]) => {
    const i = stamps.lastIndexOf(stamp);
    if (i !== -1) stamps.splice(i, 1);
  };

  drop(globalDay);

  const bucket = ipBuckets.get(ip);
  if (!bucket) return;
  drop(bucket.hour);
  drop(bucket.day);
}

// ── Request body size ────────────────────────────────────────────────────────

/**
 * Largest request body either spending route will read (2026-08-31 review).
 *
 * MAX_INPUT_CHARS and MAX_HISTORY are applied AFTER `await req.json()` has
 * already pulled the whole body into memory, so without this a 50MB JSON body
 * is fully parsed before any limit runs — free for the sender, memory and
 * function-time for us.
 *
 * 16KB is many times the real worst case: MAX_HISTORY (12) turns at
 * MAX_INPUT_CHARS (1000) each, plus a token and a lang field.
 */
export const MAX_BODY_BYTES = 16 * 1024;

/**
 * True when `content-length` declares a body larger than the cap.
 *
 * ⚠️ A missing or non-numeric header is NOT treated as oversized. A chunked
 * request legitimately omits it, and refusing those would break real clients;
 * the routes' own MAX_INPUT_CHARS/MAX_HISTORY caps still bound what is actually
 * used. This closes the cheap declared-huge-body case, which is the one an
 * attacker uses.
 */
export function bodyTooLarge(req: Request): boolean {
  const raw = req.headers.get("content-length");
  if (!raw) return false;
  const n = Number(raw);
  return Number.isFinite(n) && n > MAX_BODY_BYTES;
}


// ── Answer tokens ────────────────────────────────────────────────────────────
// /api/speak takes a signed payload, never free-form text from the browser.
// The id IS the answer (HMAC-signed + timestamped), so ask and speak can land
// on different Vercel instances without a shared Map / Redis. Same security
// property as the old registry: the client cannot invent words to synthesise
// without knowing AGENT_SESSION_SECRET.

const ANSWER_TTL_MS = HOUR;
/** Hard cap so a forged/bloated id cannot blow the request body. */
const ANSWER_MAX_CHARS = 2000;

export function registerAnswer(text: string): string {
  const key = secret();
  if (!key) throw new Error("AGENT_SESSION_SECRET is not set");
  const clipped = text.slice(0, ANSWER_MAX_CHARS);
  const payload = Buffer.from(
    JSON.stringify({ t: clipped, at: Date.now() }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function lookupAnswer(id: string | undefined | null): string | null {
  const key = secret();
  if (!key || !id) return null;
  const dot = id.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = id.slice(0, dot);
  const sig = id.slice(dot + 1);
  const expected = createHmac("sha256", key)
    .update(payload)
    .digest("base64url");

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const raw = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(raw) as { t?: unknown; at?: unknown };
    if (typeof data.t !== "string" || typeof data.at !== "number") return null;
    if (!Number.isFinite(data.at) || Date.now() - data.at > ANSWER_TTL_MS) {
      return null;
    }
    if (!data.t.trim() || data.t.length > ANSWER_MAX_CHARS) return null;
    return data.t;
  } catch {
    return null;
  }
}
