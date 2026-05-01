import { NextResponse } from "next/server";

import { fetchDiscordRosterPayload } from "@/lib/discord/bot";
import { getDiscordEnv } from "@/lib/discord/env";
import { formatDiscordFailure } from "@/lib/discord/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { token, guildId } = getDiscordEnv();

  if (!token || !guildId) {
    return NextResponse.json(
      { error: "Discord integration is not configured on this deployment." },
      { status: 503 },
    );
  }

  try {
    const payload = await fetchDiscordRosterPayload();

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/discord-members]", err);

    const { message, code, hint } = formatDiscordFailure(err);

    const body: {
      error: string;
      details?: string;
      code?: number | string;
      hint?: string;
    } = { error: "Failed to load Discord roster." };

    const exposeInternals =
      process.env.NODE_ENV === "development" ||
      process.env.DISCORD_API_DEBUG === "1";

    if (exposeInternals) {
      body.details = message;
      if (code !== undefined) body.code = code;
      if (hint) body.hint = hint;
    } else if (hint) {
      body.hint = hint;
    }

    return NextResponse.json(body, { status: 500 });
  }
}
