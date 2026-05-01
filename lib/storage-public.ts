const DEFAULT_SUPABASE_URL = "https://jroucrqryaxyftpgojan.supabase.co";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const PUBLIC_STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public`;

export function publicStorageUrl(bucket: string, objectPath: string) {
  return `${PUBLIC_STORAGE_BASE}/${bucket}/${objectPath}`;
}

export const STORAGE_ASSETS = {
  siteBackground: publicStorageUrl(
    "site-assets-public",
    "site/backgrounds/CelestialHighHeavenSect.png",
  ),
  siteHero: publicStorageUrl("site-assets-public", "site/hero/guild-hero.png"),
  /** Site-wide BGM — upload MP3 as `site/audio/ai-bgm.mp3` in bucket `site-assets-public`. */
  siteBgmAudio: publicStorageUrl("site-assets-public", "site/audio/ai-bgm.mp3"),
  /** Tournament quiz UI — WAVs under `site/audio/quiz/` (see `upload-media-to-storage.mjs`). */
  quizSfx: {
    tick: publicStorageUrl("site-assets-public", "site/audio/quiz/tick.wav"),
    correct: publicStorageUrl("site-assets-public", "site/audio/quiz/correct.wav"),
    wrong: publicStorageUrl("site-assets-public", "site/audio/quiz/wrong.wav"),
    leaderboard: publicStorageUrl("site-assets-public", "site/audio/quiz/leaderboard.wav"),
    winner: publicStorageUrl("site-assets-public", "site/audio/quiz/winner.wav"),
    celebration: publicStorageUrl("site-assets-public", "site/audio/quiz/celebration.wav"),
  },
  gallerySeedOne: publicStorageUrl(
    "gallery-public",
    "gallery_image/seed/group-pic-1.png",
  ),
  gallerySeedTwo: publicStorageUrl(
    "gallery-public",
    "gallery_image/seed/group-pic-2.png",
  ),
  leadership: {
    demonsau: publicStorageUrl("leadership-public", "leadership/demonsau.png"),
    linqi: publicStorageUrl("leadership-public", "leadership/linqi.png"),
    rayAsher: publicStorageUrl("leadership-public", "leadership/ray-asher.png"),
    beleriand: publicStorageUrl("leadership-public", "leadership/beleriand.png"),
    flourish: publicStorageUrl("leadership-public", "leadership/flourish.png"),
    skeng: publicStorageUrl("leadership-public", "leadership/skeng.png"),
    sylvely: publicStorageUrl("leadership-public", "leadership/sylvely.png"),
    yami: publicStorageUrl("leadership-public", "leadership/yami.png"),
    jamesVenom: publicStorageUrl("leadership-public", "leadership/james-venom.png"),
    sayaka: publicStorageUrl("leadership-public", "leadership/sayaka.png"),
    shanto: publicStorageUrl("leadership-public", "leadership/shanto.png"),
  },
} as const;
