import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const migrationDir = path.join(root, "supabase", "migrations");
const manifestPath = path.join(root, "supabase", "table-manifest.json");
const expectedTables = JSON.parse(await readFile(manifestPath, "utf8"));
const migrationFiles = (await readdir(migrationDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (migrationFiles.length === 0) {
  throw new Error("No migration files found.");
}

const sql = (
  await Promise.all(
    migrationFiles.map((file) => readFile(path.join(migrationDir, file), "utf8")),
  )
).join("\n");

const createdTables = [...sql.matchAll(/create\s+table\s+public\.([a-z0-9_]+)/gi)].map(
  (match) => match[1],
);
const duplicates = createdTables.filter(
  (table, index) => createdTables.indexOf(table) !== index,
);
const missing = expectedTables.filter((table) => !createdTables.includes(table));
const unexpected = createdTables.filter((table) => !expectedTables.includes(table));
const withoutRls = expectedTables.filter(
  (table) =>
    !new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i").test(
      sql,
    ),
);
const withoutPolicy = expectedTables.filter(
  (table) => !new RegExp(`create\\s+policy[\\s\\S]+?on\\s+public\\.${table}\\b`, "i").test(sql),
);
const withoutAuthenticatedGrant = expectedTables.filter(
  (table) =>
    !new RegExp(
      `grant\\s+select,\\s*insert,\\s*update,\\s*delete\\s+on[\\s\\S]+?public\\.${table}[\\s\\S]+?to\\s+authenticated`,
      "i",
    ).test(sql),
);
const containsSeedData = /\binsert\s+into\s+public\./i.test(sql);

const failures = [
  duplicates.length ? `Duplicate tables: ${duplicates.join(", ")}` : null,
  missing.length ? `Missing tables: ${missing.join(", ")}` : null,
  unexpected.length ? `Unexpected tables: ${unexpected.join(", ")}` : null,
  withoutRls.length ? `RLS missing: ${withoutRls.join(", ")}` : null,
  withoutPolicy.length ? `Owner policy missing: ${withoutPolicy.join(", ")}` : null,
  withoutAuthenticatedGrant.length
    ? `Authenticated grant missing: ${withoutAuthenticatedGrant.join(", ")}`
    : null,
  containsSeedData ? "Migration files contain seed inserts." : null,
].filter(Boolean);

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Verified ${migrationFiles.length} migrations and ${createdTables.length} tables.`);
createdTables.forEach((table) => console.log(`- ${table}`));
