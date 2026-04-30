/**
 * Apply a SQL migration file using direct Postgres (Supabase).
 * Requires DATABASE_URL in web/.env.local (Dashboard → Project Settings → Database → Connection string, URI).
 *
 * Usage: npm run db:apply
 *        node scripts/apply-sql.cjs path/to/file.sql
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();

  const defaultSql = path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "20260430193000_heavenly_tournament_realtime.sql",
  );
  const sqlPath = path.resolve(process.argv[2] || defaultSql);
  if (!fs.existsSync(sqlPath)) {
    console.error("File not found:", sqlPath);
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

  if (!connectionString) {
    console.error(
      [
        "No Postgres connection string found.",
        "",
        'Add to web/.env.local (Supabase → Settings → Database → Connection string → URI):',
        '  DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-DB-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"',
        "",
        "Use the password you set when creating the project (not the anon or service_role API keys).",
      ].join("\n"),
    );
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  const useSsl =
    connectionString.includes("supabase") ||
    connectionString.includes("sslmode=require") ||
    connectionString.includes("ssl=true");

  const client = new Client({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied OK:", sqlPath);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
