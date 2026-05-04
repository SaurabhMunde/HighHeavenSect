import type { DiscordRosterApiPayload } from "@/lib/discord/types";

const STALE_MS = 12_000;

let cache: { payload: DiscordRosterApiPayload; at: number } | null = null;
let pending: Promise<DiscordMembersFetchResult> | null = null;

export type DiscordMembersFetchResult =
  | { ok: true; payload: DiscordRosterApiPayload }
  | { ok: false; status: number; body: unknown };

export function readDiscordMembersRosterCache(): DiscordRosterApiPayload | null {
  if (!cache || Date.now() - cache.at > STALE_MS) return null;
  return cache.payload;
}

export function seedDiscordMembersRosterCache(payload: DiscordRosterApiPayload): void {
  cache = { payload, at: Date.now() };
}

/** One in-flight request shared by prefetch + members page. */
export function fetchDiscordMembersRosterDeduplicated(): Promise<DiscordMembersFetchResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({ ok: false, status: 0, body: {} });
  }
  const warm = readDiscordMembersRosterCache();
  if (warm) return Promise.resolve({ ok: true, payload: warm });
  if (pending) return pending;
  pending = (async (): Promise<DiscordMembersFetchResult> => {
    try {
      const res = await fetch("/api/discord-members", { cache: "no-store" });
      const body: unknown = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, status: res.status, body };
      const data = body as DiscordRosterApiPayload;
      if (!data?.members || !Array.isArray(data.members)) {
        return { ok: false, status: 500, body };
      }
      seedDiscordMembersRosterCache(data);
      return { ok: true, payload: data };
    } catch {
      return { ok: false, status: 0, body: {} };
    } finally {
      pending = null;
    }
  })();
  return pending;
}

/** Warm cache after first paint so `/members` often hits cache. */
export function scheduleDiscordMembersRosterPrefetch(): void {
  if (typeof window === "undefined") return;
  const run = () => void fetchDiscordMembersRosterDeduplicated();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 3500 });
  } else {
    globalThis.setTimeout(run, 1800);
  }
}
