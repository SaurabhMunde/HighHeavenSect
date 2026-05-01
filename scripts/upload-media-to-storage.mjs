import fs from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readEnvValue(key) {
  const envPath = path.resolve(path.join(__dirname, ".."), ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    if (k === key) return v;
  }
  return "";
}

const webRoot = path.join(__dirname, "..");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || readEnvValue("NEXT_PUBLIC_SUPABASE_URL");
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || readEnvValue("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRole) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureBucket(id, isPublic, limit, mimeTypes) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;
  if (buckets.some((b) => b.id === id)) return;
  const { error } = await supabase.storage.createBucket(id, {
    public: isPublic,
    fileSizeLimit: limit,
    allowedMimeTypes: mimeTypes,
  });
  if (error) throw error;
}

/** Allow images + MP3 on public site bucket (required for BGM). */
async function ensureSiteAssetsBucketMimes() {
  const mimes = ["image/png", "image/jpeg", "image/webp", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave"];
  await ensureBucket("site-assets-public", true, 50 * 1024 * 1024, mimes);
  const { error } = await supabase.storage.updateBucket("site-assets-public", {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: mimes,
  });
  if (error) {
    console.warn(`Could not update site-assets-public bucket (MP3 upload may fail): ${error.message}`);
  }
}

async function uploadFile(bucket, sourcePath, destinationPath, contentType = "application/octet-stream") {
  const data = fs.readFileSync(sourcePath);
  const { error } = await supabase.storage.from(bucket).upload(destinationPath, data, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });
  if (error) throw error;
}

function publicUrl(bucket, objectPath) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

await ensureBucket("gallery-public", true, 8 * 1024 * 1024, ["image/png", "image/jpeg", "image/webp"]);
await ensureBucket("leadership-public", true, 8 * 1024 * 1024, ["image/png", "image/jpeg", "image/webp"]);
await ensureSiteAssetsBucketMimes();

const soundsDir = path.join(webRoot, "public/sounds");
const bgmUserFile = path.join(soundsDir, "AI BGM.mp3");
const bgmSourceForUpload = fs.existsSync(bgmUserFile)
  ? bgmUserFile
  : path.join(__dirname, "seeds", "ai-bgm.mp3");

const uploads = [
  // gallery seeds (sources under public/gallery — optional when only syncing BGM)
  {
    bucket: "gallery-public",
    src: path.join(webRoot, "public/gallery/group-pic-1.png"),
    dest: "gallery_image/seed/group-pic-1.png",
    contentType: "image/png",
  },
  {
    bucket: "gallery-public",
    src: path.join(webRoot, "public/gallery/group-pic-2.png"),
    dest: "gallery_image/seed/group-pic-2.png",
    contentType: "image/png",
  },
  // site images
  {
    bucket: "site-assets-public",
    src: path.join(webRoot, "public/CelestialHighHeavenSect.png"),
    dest: "site/backgrounds/CelestialHighHeavenSect.png",
    contentType: "image/png",
  },
  {
    bucket: "site-assets-public",
    src: path.join(webRoot, "public/gallery/guild-home-page.png"),
    dest: "site/hero/guild-hero.png",
    contentType: "image/png",
  },
  // tournament quiz WAVs (optional locals under public/sounds/)
  {
    bucket: "site-assets-public",
    src: path.join(soundsDir, "tick.wav"),
    dest: "site/audio/quiz/tick.wav",
    contentType: "audio/wav",
  },
  {
    bucket: "site-assets-public",
    src: path.join(soundsDir, "correct.wav"),
    dest: "site/audio/quiz/correct.wav",
    contentType: "audio/wav",
  },
  {
    bucket: "site-assets-public",
    src: path.join(soundsDir, "wrong.wav"),
    dest: "site/audio/quiz/wrong.wav",
    contentType: "audio/wav",
  },
  {
    bucket: "site-assets-public",
    src: path.join(soundsDir, "leaderboard.wav"),
    dest: "site/audio/quiz/leaderboard.wav",
    contentType: "audio/wav",
  },
  {
    bucket: "site-assets-public",
    src: path.join(soundsDir, "winner.wav"),
    dest: "site/audio/quiz/winner.wav",
    contentType: "audio/wav",
  },
  {
    bucket: "site-assets-public",
    src: path.join(soundsDir, "celebration.wav"),
    dest: "site/audio/quiz/celebration.wav",
    contentType: "audio/wav",
  },
  // BGM: prefer public/sounds/AI BGM.mp3, else scripts/seeds/ai-bgm.mp3
  {
    bucket: "site-assets-public",
    src: bgmSourceForUpload,
    dest: "site/audio/ai-bgm.mp3",
    contentType: "audio/mpeg",
  },
  // leadership
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/demonsau.png"),
    dest: "leadership/demonsau.png",
    contentType: "image/png",
  },
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/linqi.png"),
    dest: "leadership/linqi.png",
    contentType: "image/png",
  },
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/ray-asher.png"),
    dest: "leadership/ray-asher.png",
    contentType: "image/png",
  },
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/beleriand.png"),
    dest: "leadership/beleriand.png",
    contentType: "image/png",
  },
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/flourish.png"),
    dest: "leadership/flourish.png",
    contentType: "image/png",
  },
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/skeng.png"),
    dest: "leadership/skeng.png",
    contentType: "image/png",
  },
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/sylvely.png"),
    dest: "leadership/sylvely.png",
    contentType: "image/png",
  },
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/yami.png"),
    dest: "leadership/yami.png",
    contentType: "image/png",
  },
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/james-venom.png"),
    dest: "leadership/james-venom.png",
    contentType: "image/png",
  },
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/sayaka.png"),
    dest: "leadership/sayaka.png",
    contentType: "image/png",
  },
  {
    bucket: "leadership-public",
    src: path.join(webRoot, "public/leadership/shanto.png"),
    dest: "leadership/shanto.png",
    contentType: "image/png",
  },
];

let uploaded = 0;
let skipped = 0;

for (const item of uploads) {
  if (!fs.existsSync(item.src)) {
    console.warn(`Skip (missing file): ${item.src}`);
    skipped += 1;
    continue;
  }
  await uploadFile(item.bucket, item.src, item.dest, item.contentType);
  console.log(`Uploaded ${item.src} -> ${publicUrl(item.bucket, item.dest)}`);
  uploaded += 1;
}

console.log(`Done. Uploaded ${uploaded}, skipped ${skipped}.`);
