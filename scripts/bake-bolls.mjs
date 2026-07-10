// Bake bolls.life-served translations into offline bundles — the native
// apps must carry every built-in voice with zero network. Output matches
// data/bibles/web.json exactly: { translation, version, license, chapters }.
// Sanitization mirrors src/engine/corpus.ts sanitizeBolls — <S> (Strong's)
// and <sup> (margin notes) removed whole, all other tags unwrapped.
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// bookId → bolls numeric id (mirror of BOLLS_ID in src/engine/corpus.ts)
const BOLLS_ID = {
  gen: 1, exo: 2, lev: 3, num: 4, deu: 5, jos: 6, jdg: 7, rut: 8,
  "1sa": 9, "2sa": 10, "1ki": 11, "2ki": 12, "1ch": 13, "2ch": 14,
  ezr: 15, neh: 16, est: 17, job: 18, psa: 19, pro: 20, ecc: 21, sng: 22,
  isa: 23, jer: 24, lam: 25, ezk: 26, dan: 27, hos: 28, jol: 29, amo: 30,
  oba: 31, jon: 32, mic: 33, nam: 34, hab: 35, zep: 36, hag: 37, zec: 38, mal: 39,
  mat: 40, mrk: 41, luk: 42, jhn: 43, act: 44, rom: 45,
  "1co": 46, "2co": 47, gal: 48, eph: 49, php: 50, col: 51,
  "1th": 52, "2th": 53, "1ti": 54, "2ti": 55, tit: 56, phm: 57, heb: 58, jas: 59,
  "1pe": 60, "2pe": 61, "1jn": 62, "2jn": 63, "3jn": 64, jud: 65, rev: 66,
};

// chapter counts per book (canon66, standard)
const CHAPTERS = {
  gen: 50, exo: 40, lev: 27, num: 36, deu: 34, jos: 24, jdg: 21, rut: 4,
  "1sa": 31, "2sa": 24, "1ki": 22, "2ki": 25, "1ch": 29, "2ch": 36,
  ezr: 10, neh: 13, est: 10, job: 42, psa: 150, pro: 31, ecc: 12, sng: 8,
  isa: 66, jer: 52, lam: 5, ezk: 48, dan: 12, hos: 14, jol: 3, amo: 9,
  oba: 1, jon: 4, mic: 7, nam: 3, hab: 3, zep: 3, hag: 2, zec: 14, mal: 4,
  mat: 28, mrk: 16, luk: 24, jhn: 21, act: 28, rom: 16,
  "1co": 16, "2co": 13, gal: 6, eph: 6, php: 4, col: 4,
  "1th": 5, "2th": 3, "1ti": 6, "2ti": 4, tit: 3, phm: 1, heb: 13, jas: 5,
  "1pe": 5, "2pe": 3, "1jn": 5, "2jn": 1, "3jn": 1, jud: 1, rev: 22,
};

const TARGETS = [
  { id: "kjv", code: "KJV", license: "King James Version (1611/1769) — public domain" },
  { id: "asv", code: "ASV", license: "American Standard Version (1901) — public domain" },
  { id: "ylt", code: "YLT", license: "Young's Literal Translation (1862) — public domain" },
];

const sanitize = (html) => html
  .replace(/<(S|sup)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/\s+/g, " ").trim();

async function fetchChapter(code, bollsBook, ch, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`https://bolls.life/get-text/${code}/${bollsBook}/${ch}/`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return j.map((v) => ({ n: v.verse, text: sanitize(v.text) })).filter((v) => v.text);
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
}

for (const t of TARGETS) {
  console.log(`\n=== baking ${t.id} (${t.code}) ===`);
  const chapters = {};
  let verses = 0;
  for (const [bookId, bolls] of Object.entries(BOLLS_ID)) {
    const n = CHAPTERS[bookId];
    // modest parallelism — be polite to bolls.life
    for (let c = 1; c <= n; c += 5) {
      const batch = [];
      for (let ch = c; ch < Math.min(c + 5, n + 1); ch++) {
        batch.push(fetchChapter(t.code, bolls, ch).then((vs) => { chapters[`${bookId}.${ch}`] = vs; verses += vs.length; }));
      }
      await Promise.all(batch);
    }
    process.stdout.write(`${bookId} `);
  }
  const out = { translation: t.id, version: "1.0.0", license: `${t.license} (bolls.life)`, chapters };
  writeFileSync(resolve(ROOT, `data/bibles/${t.id}.json`), JSON.stringify(out));
  console.log(`\n→ data/bibles/${t.id}.json · ${Object.keys(chapters).length} chapters · ${verses} verses`);
}
console.log("\nAll baked. Now mark bundled:true in src/engine/corpus.ts and rebuild.");
