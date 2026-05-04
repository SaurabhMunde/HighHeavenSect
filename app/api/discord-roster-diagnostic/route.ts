import { NextResponse } from "next/server";

import { computeRosterMappingDiagnostics } from "@/lib/discord/bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Compare effective roster rows vs live guild (WWM Head/Member roles only).
 * Set `DISCORD_ROSTER_DIAGNOSTIC=1` in `.env.local`, restart dev server, GET this URL.
 */
export async function GET() {
  if (process.env.DISCORD_ROSTER_DIAGNOSTIC !== "1") {
    return NextResponse.json({ error: "Set DISCORD_ROSTER_DIAGNOSTIC=1 in .env.local" }, {
      status: 404,
    });
  }

  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
    return NextResponse.json(
      { error: "DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required." },
      { status: 503 },
    );
  }

  try {
    const diag = await computeRosterMappingDiagnostics();
    return NextResponse.json(diag, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/discord-roster-diagnostic]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Diagnostic failed." },
      { status: 500 },
    );
  }
}
