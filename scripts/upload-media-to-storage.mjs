import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function readEnvValue(key) {
  const envPath = path.resolve(".env.local");
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

async function uploadFile(bucket, sourcePath, destinationPath, contentType = "image/png") {
  const data = fs.readFileSync(sourcePath);
  const { error } = await supabase.storage.from(bucket).upload(destinationPath, data, {
    upsert: true,
    contentType,
  });
  if (error) throw error;
}

function publicUrl(bucket, objectPath) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

await ensureBucket("gallery-public", true, 8 * 1024 * 1024, ["image/png", "image/jpeg", "image/webp"]);
await ensureBucket("leadership-public", true, 8 * 1024 * 1024, ["image/png", "image/jpeg", "image/webp"]);
await ensureBucket("site-assets-public", true, 10 * 1024 * 1024, ["image/png", "image/jpeg", "image/webp"]);

const uploads = [
  // gallery
  {
    bucket: "gallery-public",
    src: path.resolve("public/gallery/group-pic-1.png"),
    dest: "gallery_image/seed/group-pic-1.png",
  },
  {
    bucket: "gallery-public",
    src: path.resolve("public/gallery/group-pic-2.png"),
    dest: "gallery_image/seed/group-pic-2.png",
  },
  // site assets
  {
    bucket: "site-assets-public",
    src: path.resolve("public/CelestialHighHeavenSect.png"),
    dest: "site/backgrounds/CelestialHighHeavenSect.png",
  },
  {
    bucket: "site-assets-public",
    src: path.resolve("public/gallery/guild-home-page.png"),
    dest: "site/hero/guild-hero.png",
  },
  // leadership
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/demonsau.png"),
    dest: "leadership/demonsau.png",
  },
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/linqi.png"),
    dest: "leadership/linqi.png",
  },
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/ray-asher.png"),
    dest: "leadership/ray-asher.png",
  },
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/beleriand.png"),
    dest: "leadership/beleriand.png",
  },
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/flourish.png"),
    dest: "leadership/flourish.png",
  },
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/skeng.png"),
    dest: "leadership/skeng.png",
  },
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/sylvely.png"),
    dest: "leadership/sylvely.png",
  },
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/yami.png"),
    dest: "leadership/yami.png",
  },
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/james-venom.png"),
    dest: "leadership/james-venom.png",
  },
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/sayaka.png"),
    dest: "leadership/sayaka.png",
  },
  {
    bucket: "leadership-public",
    src: path.resolve("public/leadership/shanto.png"),
    dest: "leadership/shanto.png",
  },
];

for (const item of uploads) {
  if (!fs.existsSync(item.src)) {
    throw new Error(`Missing source file: ${item.src}`);
  }
  await uploadFile(item.bucket, item.src, item.dest);
  console.log(`Uploaded ${item.src} -> ${publicUrl(item.bucket, item.dest)}`);
}

