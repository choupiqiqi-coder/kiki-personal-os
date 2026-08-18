import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import tableManifest from "../supabase/table-manifest.json" with { type: "json" };

const envFile = ".env.local";

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Supabase connection is not configured. Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
  );
  process.exit(2);
}

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const failures = [];

for (const table of tableManifest) {
  const { error } = await client.from(table).select("*", { head: true, count: "exact" });
  if (error) failures.push({ table, message: error.message });
}

if (failures.length) {
  console.error(`Connected to Supabase, but ${failures.length} tables failed verification:`);
  failures.forEach(({ table, message }) => console.error(`- ${table}: ${message}`));
  process.exit(1);
}

console.log(`Supabase connection healthy. Verified ${tableManifest.length} tables.`);
