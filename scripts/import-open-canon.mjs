// Bakes CODEX · The Open Canon (source: ~/codex-open-canon, read-only) into
// data/bibles/codex.json in the same shape as the other baked bibles, plus
// per-verse honesty extras: gate ("GATED_COMPLETE" | "UNGATED"), src (witness
// siglum), cr (contested-rendering id) where present.
//
// LEGAL FILTER (load-bearing, not decorative): any reading whose
// consult_source_class marks it copyrighted-consult-influenced is EXCLUDED
// from this public export. The open-canon repo's rights ledger uses
// consult_source_class as the machine-readable rights signal; the only
// class considered safe for public export is "open-witness-derived". Every
// other value (including unknown/missing) is excluded and counted.
//
// Only the `readable` layer, GATED_COMPLETE-eligible rows in
// readable-bounded.jsonl are true verse-level rendered English in this
// snapshot of the source repo — the per-book <book>.jsonl `readable` rows
// are OCR/scan-derived chapter dumps keyed to `.0` pseudo-verses, not real
// per-verse text, so they are not imported as reader prose.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = process.env.OPEN_CANON_SRC || path.join(process.env.HOME, "codex-open-canon");
const OUT = path.join(ROOT, "data/bibles/codex.json");

const SAFE_CLASS = "open-witness-derived";

function readJSONL(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

const readableFile = path.join(SRC, "data/readings/readable-bounded.jsonl");
const rows = readJSONL(readableFile);

let excludedByFilter = 0;
let excludedNoText = 0;
const kept = [];

for (const r of rows) {
  if (r.layer !== "readable") continue;
  if (!r.text || !r.text.trim()) { excludedNoText++; continue; }
  const cls = r.consult_source_class;
  if (cls !== SAFE_CLASS) { excludedByFilter++; continue; }
  kept.push(r);
}

// Group into chapters keyed "book.chapter", verses sorted by number.
const chapters = {};
for (const r of kept) {
  const [book, chS, vS] = r.verse_id.split(".");
  const ch = Number(chS), v = Number(vS);
  if (!Number.isFinite(ch) || !Number.isFinite(v) || v === 0) { excludedNoText++; continue; }
  const key = `${book}.${ch}`;
  (chapters[key] ??= []).push({
    n: v,
    text: r.text.trim(),
    gate: r.gate_status === "GATED_COMPLETE" ? "GATED_COMPLETE" : "UNGATED",
    src: r.witness_siglum ?? null,
    cr: r.contested_registry_id ?? null,
  });
}
for (const key of Object.keys(chapters)) {
  chapters[key].sort((a, b) => a.n - b.n);
}

const bookSet = new Set(Object.keys(chapters).map((k) => k.split(".")[0]));
const gatedCount = kept.filter((r) => r.gate_status === "GATED_COMPLETE").length;
const ungatedCount = kept.length - gatedCount;

const out = {
  translation: "codex",
  version: "0.1.0",
  license: "Open Canon readings — open-witness-derived sources only (see _meta.sources per witness); public-domain / CC-BY witnesses (WLC/OpenScriptures, SBLGNT/morphgnt) underlie every kept reading.",
  chapters,
  _meta: {
    source_repo: SRC,
    extraction_date: new Date().toISOString(),
    license_model: "public-safe subset: consult_source_class === 'open-witness-derived' only",
    filter_applied: `excluded readings with consult_source_class !== '${SAFE_CLASS}'`,
    counts: {
      total_readable_rows: rows.length,
      kept_verses: kept.length,
      excluded_by_rights_filter: excludedByFilter,
      excluded_no_text_or_malformed: excludedNoText,
      gated_complete: gatedCount,
      ungated: ungatedCount,
      books_with_any_text: bookSet.size,
    },
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 0));

console.log(`[import-open-canon] wrote ${OUT}`);
console.log(`[import-open-canon] kept ${kept.length} verses across ${bookSet.size} book(s): ${[...bookSet].join(", ")}`);
console.log(`[import-open-canon] gated_complete=${gatedCount} ungated=${ungatedCount}`);
console.log(`[import-open-canon] EXCLUDED by rights filter: ${excludedByFilter}`);
console.log(`[import-open-canon] excluded (no text / malformed verse id): ${excludedNoText}`);
