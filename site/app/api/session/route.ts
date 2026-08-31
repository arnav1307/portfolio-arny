import { NextResponse } from "next/server";
import { allowSession, clientIp, issueToken } from "@/lib/agent-guard";

/**
 * Issues a short-lived signed session token when the widget opens.
 *
 * Its only job is to make /api/ask and /api/speak reachable exclusively from a
 * browser that actually loaded the site.
 *
 * ⚠️ It DOES carry a rate limit, despite spending nothing itself (2026-08-31
 * review; the previous comment here argued the opposite). Each token is a valid
 * 30-minute key to the two routes that do spend, and nothing forces minting and
 * spending to happen together — so an unlimited endpoint here let a script
 * stockpile tokens and pipeline them later. The cap is generous (40/hour/IP):
 * a real visitor mints one per panel open, plus one per hard reload.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!allowSession(clientIp(req))) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    return NextResponse.json(
      { token: issueToken() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // AGENT_SESSION_SECRET missing → safe JSON, not an unhandled 500 HTML page.
    return NextResponse.json(
      { error: "unconfigured" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
