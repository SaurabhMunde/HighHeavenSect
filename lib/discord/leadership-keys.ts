import type { LeaderProfile } from "@/lib/leadership";
import { LEADERSHIP } from "@/lib/leadership";

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Add display strings that might match Discord nickname / global name / username. */
function gatherKeysFromLeader(entry: LeaderProfile): Set<string> {
  const keys = new Set<string>();

  const add = (s: string) => {
    const n = normalizeKey(s);
    if (n.length) keys.add(n);
  };

  add(entry.name);

  if (entry.ign) add(entry.ign);

  const parensFromName = [...entry.name.matchAll(/\(([^)]+)\)/g)].map((m) =>
    m[1].trim(),
  );
  for (const inner of parensFromName) add(inner);

  const outer = normalizeKey(entry.name.replace(/\([^)]*\)/g, "").trim());
  if (outer.length) keys.add(outer);

  const parensFromRole = [...entry.role.matchAll(/\(([^)]+)\)/g)].map((m) =>
    m[1].trim(),
  );
  for (const inner of parensFromRole) add(inner);

  return keys;
}

/** Case-insensitive keys derived from `/leadership` entries (Discord-facing names & aliases). */
function buildLeadershipMatchSet(): Set<string> {
  const all = new Set<string>();
  for (const leader of LEADERSHIP) {
    for (const k of gatherKeysFromLeader(leader)) all.add(k);
  }
  return all;
}

const LEADERSHIP_MATCH_KEYS = buildLeadershipMatchSet();

/** Discord-visible identity strings we try against the leadership list. */
export function memberIdentityCandidates(member: {
  nickname: string | null;
  displayName: string | null | undefined;
  user: {
    username: string;
    globalName: string | null;
  };
}): string[] {
  const raw = [
    member.displayName ?? null,
    member.nickname,
    member.user.globalName,
    member.user.username,
  ].filter((x): x is string => Boolean(x?.trim()));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const n = normalizeKey(r);
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

export function matchesSiteLeadershipRoster(member: {
  nickname: string | null;
  displayName: string | null | undefined;
  user: {
    username: string;
    globalName: string | null;
  };
}): boolean {
  return memberIdentityCandidates(member).some((c) =>
    LEADERSHIP_MATCH_KEYS.has(c),
  );
}
