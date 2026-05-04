/** One Discord-visible identity → in-game tag (from guild roster thread). */
export type Member = {
  inGame: string;
  discord: string;
  /** Extra Discord nick / @handle strings that should map to the same IGN. */
  discordAliases?: string[];
  role?: string;
};

/** Used when Discord roster is unavailable (no static roster). */
export const EMPTY_ROSTER: readonly Member[] = [];
