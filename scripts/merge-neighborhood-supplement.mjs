import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = join(ROOT, "packages/shared/data/israel-neighborhoods-seed.json");
const SUPP = join(ROOT, "packages/shared/data/israel-neighborhoods-supplement.json");

function norm(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\"'״׳]/g, "");
}

const seed = JSON.parse(readFileSync(SEED, "utf8"));
const supplement = JSON.parse(readFileSync(SUPP, "utf8"));
const seen = new Set(seed.map((r) => `${norm(r.שם_ישוב)}|${norm(r.שם_שכונה)}`));

let added = 0;
for (const row of supplement) {
  const key = `${norm(row.שם_ישוב)}|${norm(row.שם_שכונה)}`;
  if (seen.has(key)) {
    continue;
  }
  seen.add(key);
  seed.push(row);
  added += 1;
}

writeFileSync(SEED, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
console.log(`Merged supplement: +${added} new rows (${seed.length} total)`);
