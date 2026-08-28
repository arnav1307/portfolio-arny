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
  | { ok: true }
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

  return { ok: true };
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
