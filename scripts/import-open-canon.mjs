// Bakes CODEX · The Open Canon (source: ~/codex-open-canon, read-only) into
// data/bibles/codex.json in the same shape as the other baked bibles, plus
// per-verse honesty extras: gate ("GATED_COMPLETE" | "UNGATED"), src (witness
// siglum), cr (contested-rendering id), and tier (charter quality tier).
//
// LEGAL FILTER (load-bearing, not decorative): any reading whose
// consult_source_class marks it copyrighted-consult-influenced is EXCLUDED
// from this public export. The open-canon repo's rights ledger uses
// consult_source_class as the machine-readable rights signal; the only
// class considered safe for public export is "open-witness-derived". Every
// other value (including unknown/missing) is excluded and counted.
//
// SOURCES (two files, merged) —
//   readable-fresh.jsonl   the builders' latest full sweep: thousands of
//                           verses across dozens of books (Genesis complete,
//                           Exodus 1-6, plus many Fable-drafted NT/OT books).
//                           Every row here is consult_source_class
//                           "open-witness-derived" and gate_status "UNGATED"
//                           — none of it has passed the gate yet.
//   readable-bounded.jsonl a small, hand-checked set: Genesis 1:1-10 (fully
//                           GATED_COMPLETE) plus all of John 1 (UNGATED).
//                           John 1 exists ONLY here — fresh has no Gospels.
// The two are merged by verse_id with GATE PRECEDENCE: a GATED_COMPLETE
// reading always wins over an UNGATED one for the same verse, regardless of
// which file it came from. This lets bounded's hand-gated Genesis opening
// overwrite fresh's ungated draft of the same ten verses, while fresh fills
// in everything else and bounded's unique John 1 is simply added.
//
// TIER — a quality signal derived from each row's `note` field (the
// builders' own quality tell): "lead-authored" → fable-lead (best, hand
// authored by the lead model), "fleet" → fable-fleet (a Fable fleet draft),
// "machine draft" → machine (lowest, unreviewed mechanical draft), anything
// else (including bounded's un-noted hand-checked rows) → other. This is
// surfaced per-verse so the reader can see draft quality, not just gate
// status — e.g. Genesis 31-32 are machine-tier even though the rest of
// Genesis is fable-lead.

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

function tierFromNote(note) {
  const n = String(note || "");
  if (n.includes("lead-authored")) return "fable-lead";
  if (n.includes("fleet")) return "fable-fleet";
  if (n.includes("machine draft")) return "machine";
  return "other";
}

function parseVerseId(verseId) {
  const parts = String(verseId || "").split(".");
  if (parts.length < 3) return null;
  const [book, chS, vS] = parts;
  const ch = Number(chS), v = Number(vS);
  if (!book || !Number.isFinite(ch) || !Number.isFinite(v)) return null;
  return { book, ch, v };
}

let totalRows = 0;
let excludedByFilter = 0;
let excludedNoText = 0;

// Read + apply the rights/shape filter to one file, returning kept rows
// enriched with the parsed book/chapter/verse and derived tier.
function loadAndFilter(file) {
  const rows = readJSONL(file);
  const kept = [];
  for (const r of rows) {
    totalRows++;
    if (r.layer !== "readable") { excludedNoText++; continue; }
    if (!r.text || !r.text.trim()) { excludedNoText++; continue; }
    const parsed = parseVerseId(r.verse_id);
    if (!parsed || parsed.v === 0) { excludedNoText++; continue; } // skip pseudo-verses (.0)
    if (r.consult_source_class !== SAFE_CLASS) { excludedByFilter++; continue; }
    kept.push({
      verse_id: r.verse_id,
      book: parsed.book,
      ch: parsed.ch,
      v: parsed.v,
      text: r.text,
      gate_status: r.gate_status,
      witness_siglum: r.witness_siglum,
      contested_registry_id: r.contested_registry_id,
      tier: tierFromNote(r.note),
    });
  }
  return { rows, kept };
}

const freshFile = path.join(SRC, "data/readings/readable-fresh.jsonl");
const boundedFile = path.join(SRC, "data/readings/readable-bounded.jsonl");

const fresh = loadAndFilter(freshFile);
const bounded = loadAndFilter(boundedFile);

// Merge by verse_id with GATE PRECEDENCE — fresh first, then bounded; a row
// only replaces what's already in the map if it strictly outranks it.
const rank = (r) => (r.gate_status === "GATED_COMPLETE" ? 2 : 1);
const merged = new Map();
function ingest(kept) {
  for (const r of kept) {
    const existing = merged.get(r.verse_id);
    if (!existing || rank(r) > rank(existing)) merged.set(r.verse_id, r);
  }
}
ingest(fresh.kept);
ingest(bounded.kept);

// Group into chapters keyed "book.chapter", verses sorted by number.
const chapters = {};
const byGate = { GATED_COMPLETE: 0, UNGATED: 0 };
const byTier = { "fable-lead": 0, "fable-fleet": 0, machine: 0, other: 0 };
for (const r of merged.values()) {
  const gate = r.gate_status === "GATED_COMPLETE" ? "GATED_COMPLETE" : "UNGATED";
  byGate[gate]++;
  byTier[r.tier]++;
  const key = `${r.book}.${r.ch}`;
  (chapters[key] ??= []).push({
    n: r.v,
    text: r.text.trim(),
    gate,
    src: r.witness_siglum ?? null,
    cr: r.contested_registry_id ?? null,
    tier: r.tier,
  });
}
for (const key of Object.keys(chapters)) {
  chapters[key].sort((a, b) => a.n - b.n);
}

const books = [...new Set(Object.keys(chapters).map((k) => k.split(".")[0]))].sort();

const out = {
  translation: "codex",
  version: "0.2.0",
  license: "Open Canon readings — open-witness-derived sources only (see _meta.sources per witness); public-domain / CC-BY witnesses (WLC/OpenScriptures, SBLGNT/morphgnt) underlie every kept reading. Merged from the builders' latest full sweep (readable-fresh.jsonl) and the small hand-gated/John-1 set (readable-bounded.jsonl), with gated readings taking precedence over ungated ones verse-for-verse.",
  chapters,
  _meta: {
    source_repo: SRC,
    extraction_date: new Date().toISOString(),
    license_model: "public-safe subset: consult_source_class === 'open-witness-derived' only",
    filter_applied: `excluded readings with consult_source_class !== '${SAFE_CLASS}'`,
    merge_model: "verse_id merge, fresh then bounded, GATED_COMPLETE outranks UNGATED",
    honesty_note:
      "Every verse marked gate:\"UNGATED\" is a provisional, unreviewed draft — the app renders a banner on any chapter containing one. Draft quality varies further by `tier`: most of Genesis is fable-lead (the lead model's own authored rendering), but Genesis 31-32 specifically are `tier:\"machine\"` — a lower-tier unreviewed machine draft, not lead-authored Fable prose — same as any other UNGATED chapter drafted by the fleet or by machine pass alone.",
    counts: {
      files_read: [
        { path: freshFile, rows: fresh.rows.length },
        { path: boundedFile, rows: bounded.rows.length },
      ],
      total_rows: totalRows,
      kept_verses: merged.size,
      excluded_by_rights_filter: excludedByFilter,
      excluded_no_text_or_malformed: excludedNoText,
      by_gate: byGate,
      by_tier: byTier,
      books: books.length,
    },
    books,
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 0));

console.log(`[import-open-canon] wrote ${OUT}`);
console.log(`[import-open-canon] read ${fresh.rows.length} rows from readable-fresh.jsonl, ${bounded.rows.length} rows from readable-bounded.jsonl (${totalRows} total)`);
console.log(`[import-open-canon] kept ${merged.size} verses across ${books.length} book(s): ${books.join(", ")}`);
console.log(`[import-open-canon] by_gate: ${JSON.stringify(byGate)}`);
console.log(`[import-open-canon] by_tier: ${JSON.stringify(byTier)}`);
console.log(`[import-open-canon] EXCLUDED by rights filter: ${excludedByFilter}`);
console.log(`[import-open-canon] excluded (no text / malformed / non-readable / pseudo-verse): ${excludedNoText}`);
