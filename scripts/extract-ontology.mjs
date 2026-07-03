// extract-ontology.mjs — THE FACTORY (PALANTIR §1.2).
//
// The seed (scripts/seed-ontology.mjs) is exact-name-match only. This is the
// real thing: a frontier model reads the baked WEB book-by-book and returns a
// strict-JSON ontology — including coreference ("the prophet" → Elijah) and
// relations (genealogy, deeds, rule, participation, speaker attribution). The
// frontier is the *factory*, not a runtime dependency: output is baked to the
// repo so users never pay for extraction.
//
//   Runs offline on the build machine with ANTHROPIC_API_KEY, OR (later) in the
//   browser via the user's own key through the same engines the Oracle uses.
//
// STATUS: harness complete; the full 66-book sweep is Session 2. Session 1 ships
// the verified seed. This script is here so the sweep is one command, not a
// rewrite. Run a single book to preview:
//
//   ANTHROPIC_API_KEY=sk-... node scripts/extract-ontology.mjs --book gen --dry
//   ANTHROPIC_API_KEY=sk-... node scripts/extract-ontology.mjs --book gen
//
// It writes candidate files under data/ontology/extracted/ (never clobbering the
// audited seed); a reconciliation pass (Session 2) merges seed + extraction +
// public structured sources (Viz.Bible, OpenBible.info), turning disagreements
// into `contested` records — not silent picks. audit-ontology.mjs then gates.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const WEB = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bibles/web.json"), "utf8"));
const OUT = path.join(ROOT, "data/ontology/extracted");

const MODEL = process.env.CODEX_EXTRACT_MODEL || "claude-opus-4-8";
const KEY = process.env.ANTHROPIC_API_KEY;
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const BOOK = opt("book", null);
const DRY = flag("dry");
const WINDOW = Number(opt("window", 3));   // chapters per request
const OVERLAP = 1;                          // chapters of overlap for coreference

// The strict schema the model must return per window.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["entities", "mentions", "relations"],
  properties: {
    entities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "names", "summary"],
        properties: {
          id: { type: "string", description: "stable slug, e.g. p.elijah, pl.jezreel" },
          kind: { enum: ["person", "place", "event", "lemma", "topic", "number", "pericope"] },
          names: { type: "array", items: { type: "string" }, minItems: 1 },
          summary: { type: "string" },
          contested: {
            type: "object", additionalProperties: false,
            required: ["why", "views"],
            properties: {
              why: { type: "string" },
              views: { type: "array", items: {
                type: "object", additionalProperties: false, required: ["view", "source"],
                properties: { view: { type: "string" }, source: { type: "string" } } } },
            },
          },
        },
      },
    },
    mentions: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["entityId", "ref", "form"],
        properties: {
          entityId: { type: "string" },
          ref: { type: "string", description: "bookId.chapter.verse, e.g. 1ki.17.1" },
          form: { type: "string", description: "the surface phrase, incl. coreference like 'the Tishbite'" },
        },
      },
    },
    relations: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["from", "to", "kind"],
        properties: {
          from: { type: "string" }, to: { type: "string" },
          kind: { enum: [
            "father_of", "mother_of", "spouse_of", "sibling_of", "ancestor_of",
            "killed", "ruled", "king_of", "located_in", "participant_in",
            "quotes", "fulfills", "parallels", "speaker_of", "about", "blessed", "custom"] },
          ref: { type: "string", description: "evidence verse" },
          contested: { type: "boolean" },
        },
      },
    },
  },
};

const SYS = [
  "You are an ontology extractor for a Bible-study intelligence platform.",
  "Read the given passage of the World English Bible and return every named",
  "person, place, event and significant number as a first-class entity, every",
  "MENTION (including coreference — 'the prophet', 'his brother', 'the king' —",
  "resolved to the entity), and every RELATION the text asserts (genealogy,",
  "rule, participation, and SPEAKER ATTRIBUTION: who utters each quoted span).",
  "Rules: every mention.ref MUST be a verse that exists in the passage given.",
  "Use stable slug ids (p.<name>, pl.<name>, ev.<name>, num.<n>). Where a",
  "reading or identity is genuinely disputed across scholarly/traditional",
  "lenses, set `contested` with the competing views and their sources — never",
  "flatten a dispute into a fact. Return ONLY the structured object.",
].join(" ");

function windows(bookId) {
  const chapters = Object.keys(WEB.chapters)
    .filter((k) => k.startsWith(bookId + "."))
    .map((k) => Number(k.split(".")[1]))
    .sort((a, b) => a - b);
  const last = chapters[chapters.length - 1];
  const out = [];
  for (let start = 1; start <= last; start += WINDOW - OVERLAP) {
    const end = Math.min(start + WINDOW - 1, last);
    out.push([start, end]);
    if (end === last) break;
  }
  return out;
}

function passageText(bookId, [a, b]) {
  const lines = [];
  for (let c = a; c <= b; c++) {
    const ch = WEB.chapters[`${bookId}.${c}`];
    if (!ch) continue;
    for (const v of ch) lines.push(`${bookId}.${c}.${v.n}  ${v.text}`);
  }
  return lines.join("\n");
}

async function extractWindow(bookId, win) {
  const passage = passageText(bookId, win);
  const body = {
    model: MODEL,
    max_tokens: 8192,
    system: SYS,
    tools: [{ name: "ontology", description: "Return the extracted ontology.", input_schema: SCHEMA }],
    tool_choice: { type: "tool", name: "ontology" },
    messages: [{ role: "user", content: `Passage (${bookId} ${win[0]}–${win[1]}):\n\n${passage}` }],
  };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const tool = j.content?.find((c) => c.type === "tool_use");
  if (!tool) throw new Error("no tool_use in response");
  return tool.input;
}

async function main() {
  if (!BOOK) { console.error("usage: --book <id> [--dry] [--window N]"); process.exit(2); }
  const wins = windows(BOOK);
  console.log(`[extract] ${BOOK}: ${wins.length} windows of ${WINDOW}ch (overlap ${OVERLAP})`);
  if (DRY) {
    console.log("[extract] DRY — first window preview:\n");
    console.log(passageText(BOOK, wins[0]).split("\n").slice(0, 6).join("\n"), "\n…");
    console.log(`\n[extract] would call ${MODEL} ${wins.length}× with the strict ontology schema.`);
    return;
  }
  if (!KEY) { console.error("ANTHROPIC_API_KEY required for a live run"); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true });
  const merged = { entities: new Map(), mentions: [], relations: [] };
  for (const win of wins) {
    process.stdout.write(`  ${BOOK} ${win[0]}–${win[1]} … `);
    const out = await extractWindow(BOOK, win);
    for (const e of out.entities ?? []) if (!merged.entities.has(e.id)) merged.entities.set(e.id, e);
    // dedupe mentions by entity+ref; overlap windows re-see the seam chapter
    const seen = new Set(merged.mentions.map((m) => m.entityId + m.ref));
    for (const m of out.mentions ?? []) if (!seen.has(m.entityId + m.ref)) merged.mentions.push(m);
    for (const rel of out.relations ?? []) merged.relations.push(rel);
    console.log(`+${out.entities?.length ?? 0}e ${out.mentions?.length ?? 0}m ${out.relations?.length ?? 0}r`);
  }
  const meta = {
    source: "World English Bible (public domain)", license: "Public Domain",
    extracted_by: `${MODEL} · ${new Date().toISOString().slice(0, 10)}`, method: "frontier-extraction",
    scope: `${BOOK} (candidate — pending reconciliation + audit)`,
  };
  fs.writeFileSync(path.join(OUT, `${BOOK}.json`), JSON.stringify({
    _meta: meta,
    entities: [...merged.entities.values()],
    mentions: merged.mentions,
    relations: merged.relations,
  }, null, 0) + "\n");
  console.log(`[extract] wrote data/ontology/extracted/${BOOK}.json — run reconcile + audit before it lands.`);
}

main().catch((e) => { console.error("[extract] CRASH", e); process.exit(1); });
