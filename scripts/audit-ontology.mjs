// audit-ontology.mjs — the ontology's own conscience. Runs in the harness.
//
// Laws enforced (PALANTIR §1.2 "audit harness"):
//   1. every mention's ref resolves to a REAL verse in the baked WEB;
//   2. every mention's `form` actually occurs in that verse's text;
//   3. every relation endpoint is a known entity id;
//   4. every relation's evidence ref resolves to a real verse;
//   5. the genealogy (father_of / mother_of / ancestor_of) is acyclic;
//   6. manifest counts match what is on disk (regressions are loud).
//
// Exit non-zero on any breach. No frontier, no network — pure verification.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const WEB = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bibles/web.json"), "utf8")).chapters;
const ONT = path.join(ROOT, "data/ontology");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ONT, p), "utf8"));

const fails = [];
const fail = (msg) => fails.push(msg);

function verseText(ref) {
  const parts = String(ref).split(".");
  if (parts.length !== 3) return null;
  const [b, c, v] = parts;
  const ch = WEB[`${b}.${c}`];
  if (!ch) return null;
  const row = ch.find((x) => x.n === Number(v));
  return row ? row.text : null;
}

const manifest = read("manifest.json");
const persons = read("persons.json").entities;
const places = read("places.json").entities;
const relations = read("relations.json").relations;
const entities = new Map([...persons, ...places].map((e) => [e.id, e]));

// 1 + 2 · mentions resolve and their form occurs
let mentionCount = 0;
const perBook = {};
for (const book of manifest.books) {
  const { mentions } = read(`mentions/${book}.json`);
  perBook[book] = mentions.length;
  for (const m of mentions) {
    mentionCount++;
    if (!entities.has(m.entityId)) fail(`mention → unknown entity ${m.entityId} @ ${m.ref}`);
    const t = verseText(m.ref);
    if (t == null) { fail(`mention → dead ref ${m.ref} (${m.entityId})`); continue; }
    if (!t.includes(m.form)) fail(`mention form "${m.form}" absent from ${m.ref} (${m.entityId})`);
  }
}

// 3 + 4 · relations well-formed and evidenced
for (const r of relations) {
  if (!entities.has(r.from)) fail(`relation from unknown ${r.from}`);
  if (!entities.has(r.to)) fail(`relation to unknown ${r.to}`);
  if (r.ref && verseText(r.ref) == null) fail(`relation evidence dead ref ${r.ref} (${r.from} ${r.kind} ${r.to})`);
  if (!r.provenance) fail(`relation without provenance (${r.from} ${r.kind} ${r.to})`);
}

// 5 · genealogy acyclic (parent → child edges only)
const PARENT = new Set(["father_of", "mother_of", "ancestor_of"]);
const kids = new Map();
for (const r of relations) if (PARENT.has(r.kind)) {
  if (!kids.has(r.from)) kids.set(r.from, []);
  kids.get(r.from).push(r.to);
}
const WHITE = 0, GREY = 1, BLACK = 2;
const color = new Map();
const stack = [];
function dfs(node) {
  color.set(node, GREY); stack.push(node);
  for (const c of kids.get(node) ?? []) {
    if (color.get(c) === GREY) { fail(`genealogy CYCLE: ${[...stack, c].join(" → ")}`); }
    else if ((color.get(c) ?? WHITE) === WHITE) dfs(c);
  }
  color.set(node, BLACK); stack.pop();
}
for (const id of entities.keys()) if ((color.get(id) ?? WHITE) === WHITE) dfs(id);

// 6 · manifest matches disk
const c = manifest.counts;
if (c.persons !== persons.length) fail(`manifest persons ${c.persons} ≠ ${persons.length}`);
if (c.places !== places.length) fail(`manifest places ${c.places} ≠ ${places.length}`);
if (c.relations !== relations.length) fail(`manifest relations ${c.relations} ≠ ${relations.length}`);
if (c.mentions !== mentionCount) fail(`manifest mentions ${c.mentions} ≠ ${mentionCount}`);
for (const [b, n] of Object.entries(c.mentionsByBook)) {
  if (perBook[b] !== n) fail(`manifest mentionsByBook.${b} ${n} ≠ ${perBook[b]}`);
}

if (fails.length) {
  console.error(`[audit-ontology] FAIL — ${fails.length} breach(es):`);
  for (const f of fails.slice(0, 40)) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(
  `[audit-ontology] ALL GREEN — ${persons.length} persons · ${places.length} places · ` +
  `${relations.length} relations · ${mentionCount} mentions, all resolve.`
);
