// Bake the full World English Bible (public domain) into the bundle shape
// from bolls' translation dump. This gives the reader a complete English
// canon offline AND gives the Oracle a whole Bible to hand to 1M-context
// frontier models. Usage: node scripts/build-web.mjs <dump.json>
import fs from "node:fs";

const CANON = [
  "gen","exo","lev","num","deu","jos","jdg","rut","1sa","2sa","1ki","2ki","1ch","2ch",
  "ezr","neh","est","job","psa","pro","ecc","sng","isa","jer","lam","ezk","dan","hos",
  "jol","amo","oba","jon","mic","nam","hab","zep","hag","zec","mal",
  "mat","mrk","luk","jhn","act","rom","1co","2co","gal","eph","php","col","1th","2th",
  "1ti","2ti","tit","phm","heb","jas","1pe","2pe","1jn","2jn","3jn","jud","rev",
];

const sanitize = (html) => String(html)
  .replace(/<(S|sup)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
  .replace(/<[^>]+>/g, "")
  .replace(/\s+/g, " ")
  .trim();

const rows = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const chapters = {};
let kept = 0;
for (const r of rows) {
  const id = CANON[r.book - 1];
  if (!id) continue; // dump rows beyond the 66 are covered by our other bundles
  const key = `${id}.${r.chapter}`;
  (chapters[key] ??= []).push({ n: r.verse, text: sanitize(r.text) });
  kept++;
}
for (const k of Object.keys(chapters)) chapters[k].sort((a, b) => a.n - b.n);

const out = {
  translation: "web",
  version: "1.0.0",
  license: "World English Bible — public domain (eBible.org)",
  chapters,
};
fs.writeFileSync("data/bibles/web.json", JSON.stringify(out));
console.log(`baked ${kept} verses · ${Object.keys(chapters).length} chapters → data/bibles/web.json`);
