import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC =
  process.argv[2] ??
  "c:/Users/iaaoa/OneDrive/שולחן העבודה/New Text Document (3).txt";
const DEST = join(ROOT, "packages/shared/data/israel-neighborhoods-seed.json");

let text = readFileSync(SRC, "utf8");
text = text.replace(/"רובע המע"ר"/, '"רובע המע\\"ר"');
text = text.replace(
  /"שער העלייה"\}\r?\n  \{/,
  '"שער העלייה"},\n  {',
);
text = text.replace(
  /"רמת רזים"\}\r?\n  \{/,
  '"רמת רזים"},\n  {',
);
text = text.replace("כerם התימנים", "כרם התימנים");

const data = JSON.parse(text);
mkdirSync(dirname(DEST), { recursive: true });
writeFileSync(DEST, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Wrote ${data.length} neighborhood rows → ${DEST}`);
