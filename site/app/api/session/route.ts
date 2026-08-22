import { NextResponse } from "next/server";
import { issueToken } from "@/lib/agent-guard";

/**
 * Issues a short-lived signed session token when the widget opens.
 *
 * Deliberately trivial. It costs nothing and spends nothing, so it needs no rate
 * limit of its own. Its only job is to make /api/ask and /api/speak reachable
 * exclusively from a browser that actually loaded the site.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
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
