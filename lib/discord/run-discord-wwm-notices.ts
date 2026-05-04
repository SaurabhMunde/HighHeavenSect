import type { SupabaseClient } from "@supabase/supabase-js";

import { getDiscordBotClient, sendDiscordChannelMessage } from "@/lib/discord/bot";
import { getDiscordEnv, getDiscordGalleryReviewEnv, getDiscordWwmNoticeEnv } from "@/lib/discord/env";
import { getSiteUrl } from "@/lib/site";

const ROLE_MEMBER_NAME = "WWM Member";

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return e.code === "23505" || /duplicate key|unique constraint/i.test(e.message ?? "");
}

async function claimNoticeSlot(admin: SupabaseClient, noticeKey: string): Promise<boolean> {
  const { error } = await admin.from("discord_wwm_notice_log").insert({
    notice_key: noticeKey,
  });
  if (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
  return true;
}

async function resolveMemberRoleMention(): Promise<string> {
  const { memberRoleId } = getDiscordWwmNoticeEnv();
  if (memberRoleId) return `<@&${memberRoleId}>`;

  const { guildId } = getDiscordEnv();
  if (!guildId) return "";

  const client = await getDiscordBotClient();
  const guild = await client.guilds.fetch(guildId);
  await guild.roles.fetch().catch(() => {});
  const role = guild.roles.cache.find((r) => r.name === ROLE_MEMBER_NAME);
  return role ? `<@&${role.id}>` : "";
}

async function sendWwmNotice(channelId: string, body: string): Promise<void> {
  const mention = await resolveMemberRoleMention();
  const prefix = mention ? `${mention}\n` : "";
  await sendDiscordChannelMessage(channelId, `${prefix}${body}`.trim());
}

function quizOpensAtIso(row: {
  start_time: string | null;
  opens_at: string | null;
  scheduled_at: string | null;
}): string | null {
  return row.start_time ?? row.opens_at ?? row.scheduled_at ?? null;
}

export type DiscordWwmNoticeRunSummary = {
  sent: string[];
  skipped: string[];
  errors: string[];
};

export async function runDiscordWwmScheduledNotices(
  admin: SupabaseClient,
): Promise<DiscordWwmNoticeRunSummary> {
  const sent: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  const { noticeChannelId } = getDiscordWwmNoticeEnv();
  if (!noticeChannelId) {
    skipped.push("no_DISCORD_WWM_NOTICE_CHANNEL_ID");
    return { sent, skipped, errors };
  }

  const site = getSiteUrl();

  await admin.rpc("auto_finalize_giveaways").then(() => {}, () => {
    /* non-fatal */
  });

  const nowIso = new Date().toISOString();
  /** Avoid spamming Discord on first cron run with years of historical data. */
  const recentWinnerIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // --- Giveaways: 5m before signup closes (still open) ---
  const { data: gOpen } = await admin
    .from("giveaways")
    .select("id, title, reward, signup_ends_at")
    .eq("status", "open")
    .not("signup_ends_at", "is", null)
    .gt("signup_ends_at", nowIso);

  for (const g of gOpen ?? []) {
    const ends = g.signup_ends_at as string;
    const endMs = Date.parse(ends);
    if (Number.isNaN(endMs)) continue;
    const now = Date.now();
    if (now < endMs - 5 * 60_000 || now >= endMs) continue;

    const key = `giveaway:${g.id}:t-5m`;
    if (!(await claimNoticeSlot(admin, key))) continue;
    try {
      await sendWwmNotice(
        noticeChannelId,
        [
          `🎁 **Giveaway — Only 5 Minutes Left!**`,
          `> **${g.title || "Giveaway"}** — Prize: **${g.reward}**`,
          `> ⏰ Signups close <t:${Math.floor(new Date(ends).getTime() / 1000)}:R> — don't miss your shot!`,
          `Haven't entered yet? **Now's your chance →** ${site}/giveaways`,
        ].join("\n"),
      );
      sent.push(key);
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Giveaways: closed + has winner(s) ---
  const { data: gWin } = await admin
    .from("giveaways")
    .select("id, title, reward, status")
    .eq("status", "closed");

  for (const g of gWin ?? []) {
    const { data: recentWin } = await admin
      .from("giveaway_winners")
      .select("id")
      .eq("giveaway_id", g.id)
      .gte("created_at", recentWinnerIso)
      .limit(1);
    if (!recentWin?.length) continue;

    const { data: wins } = await admin
      .from("giveaway_winners")
      .select("winner_name")
      .eq("giveaway_id", g.id);
    const names = [...new Set((wins ?? []).map((w) => (w as { winner_name: string }).winner_name))];
    if (names.length === 0) continue;
    const key = `giveaway:${g.id}:winners`;
    if (!(await claimNoticeSlot(admin, key))) continue;
    try {
      await sendWwmNotice(
        noticeChannelId,
        [
          `🎉 **Giveaway Results Are In!**`,
          `> **${g.title || "Giveaway"}**`,
          `> 🏆 Winner${names.length > 1 ? "s" : ""}: **${names.join("**, **")}**`,
          `Congratulations! You've earned it. 🌟 Check it out: ${site}/giveaways`,
        ].join("\n"),
      );
      sent.push(key);
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Quizzes: 5m before start (scheduled) ---
  const { data: quizzes } = await admin
    .from("quizzes")
    .select("id, title, join_code, quiz_type, status, start_time, opens_at, scheduled_at")
    .eq("status", "scheduled");

  for (const q of quizzes ?? []) {
    const row = q as {
      id: string;
      title: string;
      join_code: string;
      quiz_type: string;
      status: string;
      start_time: string | null;
      opens_at: string | null;
      scheduled_at: string | null;
    };
    if (row.status === "simulation") continue;
    const openIso = quizOpensAtIso(row);
    if (!openIso) continue;
    const openMs = Date.parse(openIso);
    if (Number.isNaN(openMs)) continue;
    const now = Date.now();
    if (now < openMs - 5 * 60_000 || now >= openMs) continue;
    const key = `quiz:${row.id}:t-5m`;
    if (!(await claimNoticeSlot(admin, key))) continue;
    try {
      await sendWwmNotice(
        noticeChannelId,
        [
          `📝 **Quiz Starting in ~5 Minutes!**`,
          `> ${row.quiz_type === "tournament" ? "🏆 **Heavenly Tournament**" : "⚔️ **Sect Trial**"}: **${row.title}**`,
          `> Get your mind ready — the questions won't wait for you! 🧠`,
          `Join now with code \`${row.join_code}\` → ${site}/quiz/${row.join_code}`,
        ].join("\n"),
      );
      sent.push(key);
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Quizzes: ended — congratulate top players ---
  const { data: endedQz } = await admin
    .from("quizzes")
    .select("id, title, join_code, quiz_type, status")
    .eq("status", "ended");

  for (const q of endedQz ?? []) {
    const row = q as { id: string; title: string; join_code: string; quiz_type: string };
    const key = `quiz:${row.id}:winners`;

    if (row.quiz_type === "tournament") {
      const { data: game } = await admin
        .from("quiz_tournament_games")
        .select("ended_at")
        .eq("quiz_id", row.id)
        .eq("scope", "live")
        .maybeSingle();
      const endedAt = (game as { ended_at?: string } | null)?.ended_at;
      const endedMs = endedAt ? Date.parse(endedAt) : NaN;
      if (Number.isNaN(endedMs) || endedMs < Date.parse(recentWinnerIso)) {
        skipped.push(`${key}:stale_or_no_live_game`);
        continue;
      }
    } else {
      const { count } = await admin
        .from("quiz_attempts")
        .select("id", { count: "exact", head: true })
        .eq("quiz_id", row.id)
        .gte("created_at", recentWinnerIso);
      if (!count) {
        skipped.push(`${key}:no_recent_attempts`);
        continue;
      }
    }

    let lines: string[] = [];
    if (row.quiz_type === "tournament") {
      const { data: top } = await admin
        .from("quiz_tournament_sessions")
        .select("in_game_name, score")
        .eq("quiz_id", row.id)
        .eq("scope", "live")
        .order("score", { ascending: false })
        .order("updated_at", { ascending: true })
        .limit(3);
      const list = (top ?? []) as { in_game_name: string; score: number }[];
      if (!list.length) {
        skipped.push(`${key}:no_scores`);
        continue;
      }
      lines = list.map((p, i) => `${i + 1}. **${p.in_game_name}** — ${p.score} pts`);
    } else {
      const { data: top } = await admin
        .from("quiz_attempts")
        .select("in_game_name, score, max_score")
        .eq("quiz_id", row.id)
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(3);
      const list = (top ?? []) as { in_game_name: string; score: number; max_score: number }[];
      if (!list.length) {
        skipped.push(`${key}:no_scores`);
        continue;
      }
      lines = list.map(
        (p, i) => `${i + 1}. **${p.in_game_name}** — ${p.score}/${p.max_score}`,
      );
    }

    if (!(await claimNoticeSlot(admin, key))) continue;

    try {
      await sendWwmNotice(
        noticeChannelId,
        [
          `🏅 **Quiz Over — Final Standings!**`,
          `> **${row.title}**`,
          `> Well played everyone — here are your top cultivators! 🌸`,
          ...lines,
          `Full results: ${site}/quizzes`,
        ].join("\n"),
      );
      sent.push(key);
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Guild war: ~5m before scheduled start ---
  const { data: wars } = await admin
    .from("guild_war_events")
    .select("id, title, scheduled_start_at, purge_at")
    .gt("purge_at", nowIso);

  for (const w of wars ?? []) {
    const row = w as { id: string; title: string; scheduled_start_at: string; purge_at: string };
    const startMs = Date.parse(row.scheduled_start_at);
    if (Number.isNaN(startMs)) continue;
    const now = Date.now();
    if (now < startMs - 5 * 60_000 || now >= startMs) continue;
    const key = `war:${row.id}:t-5m`;
    if (!(await claimNoticeSlot(admin, key))) continue;
    try {
      await sendWwmNotice(
        noticeChannelId,
        [
          `⚔️ **Guild War — Battle Stations!**`,
          `> **${row.title}** kicks off in ~5 minutes!`,
          `> 🍖 Stock up on foods & buffs, get online in-game, and hop into the guild **voice channel** to follow the leads.`,
          `May the Heavens favor our sect! 🔥 Signup board: ${site}/guild-war?war=${row.id}`,
        ].join("\n"),
      );
      sent.push(key);
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { sent, skipped, errors };
}

/** Call after creating a war event (requires service-role client for dedupe log). */
export async function notifyGuildWarCreated(
  admin: SupabaseClient,
  input: { warId: string; title: string; signupUrl: string },
): Promise<void> {
  const { noticeChannelId } = getDiscordWwmNoticeEnv();
  if (!noticeChannelId) return;

  const key = `war:${input.warId}:created`;
  if (!(await claimNoticeSlot(admin, key))) return;

  try {
    await sendWwmNotice(
      noticeChannelId,
      [
        `⚔️ **Guild War Signup is Now Open!**`,
        `> **${input.title}**`,
        `> A new battle awaits — answer the call and sign up for your duty role! 🛡️`,
        `Lock in your slot before it's full → ${input.signupUrl}`,
      ].join("\n"),
    );
  } catch (e) {
    await admin.from("discord_wwm_notice_log").delete().eq("notice_key", key);
    throw e;
  }
}

/**
 * Call after a gallery image is successfully inserted as `status = pending`.
 * Pings WWM Heads in the private gallery-review thread — non-blocking, errors are swallowed.
 */
export async function notifyGalleryPendingApproval(input: {
  displayName: string;
  title: string | null;
  adminGalleryUrl: string;
}): Promise<void> {
  const { threadId, headRoleId } = getDiscordGalleryReviewEnv();
  if (!threadId) return;

  const mention = headRoleId ? `<@&${headRoleId}>\n` : "";
  const titleLine = input.title ? ` — *"${input.title}"*` : "";

  const body = [
    `${mention}🖼️ **New Gallery Submission — Needs Your Review!**`,
    `> 📸 Submitted by: **${input.displayName}**${titleLine}`,
    `> This image is sitting in the queue waiting for approval. Take a quick look! 👀`,
    `Review & approve here → ${input.adminGalleryUrl}`,
  ].join("\n");

  await sendDiscordChannelMessage(threadId, body);
}
