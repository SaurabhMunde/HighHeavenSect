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

const seeds = [
  {
    title: "Guild snapshot",
    caption: "",
    display_name: "HighHeavenSect",
    original_filename: "group-pic-1.png",
    mime_type: "image/png",
    size_bytes: 1,
    private_bucket: "gallery-submissions",
    private_path: "gallery_image/seed/legacy-group-pic-1.png",
    public_bucket: "gallery-public",
    public_path: "gallery_image/seed/group-pic-1.png",
    status: "approved",
  },
  {
    title: "Sect in the jianghu",
    caption: "",
    display_name: "HighHeavenSect",
    original_filename: "group-pic-2.png",
    mime_type: "image/png",
    size_bytes: 1,
    private_bucket: "gallery-submissions",
    private_path: "gallery_image/seed/legacy-group-pic-2.png",
    public_bucket: "gallery-public",
    public_path: "gallery_image/seed/group-pic-2.png",
    status: "approved",
  },
];

for (const seed of seeds) {
  const { data: existing } = await supabase
    .from("media_uploads")
    .select("id")
    .eq("kind", "gallery_image")
    .eq("public_bucket", seed.public_bucket)
    .eq("public_path", seed.public_path)
    .maybeSingle();

  if (existing?.id) {
    console.log(`Seed already exists for ${seed.public_path}`);
    continue;
  }

  const { error } = await supabase.from("media_uploads").insert({
    kind: "gallery_image",
    ...seed,
    approved_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
  console.log(`Inserted seed row for ${seed.public_path}`);
}

