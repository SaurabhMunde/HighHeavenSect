"use client";

import { useEffect } from "react";

import { scheduleDiscordMembersRosterPrefetch } from "@/lib/discord-members-client";

/** Background roster fetch so navigating to `/members` often reuses a warm cache. */
export function DiscordMembersPrefetcher() {
  useEffect(() => {
    scheduleDiscordMembersRosterPrefetch();
  }, []);
  return null;
}
