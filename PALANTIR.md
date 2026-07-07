# PALANTIR — the plan that earns the name

GENESIS v0.6 is a clean reader with drawers. This document is the standing
plan that turns it into what it was named for: an intelligence platform
over the whole canon. It answers the 100-point critique of 2026-07-02
(numbers cited throughout as #n). It is written to be executed phase by
phase by an agent, each phase landing with smoke specs, under the laws
already in force: GENESIS.md's eight (shell owns space, compiler covenant,
one store, one tree two postures, features are manifests, invariants
computed, one harness, scripture sacred) and EXOGRAMMAR's seven
(instruments not documents; one gesture deep; honesty load-bearing).

## 0 · Thesis

Palantir's essence is not dashboards. It is: **one ontology fusing every
source, where every entity is a door, every claim carries provenance, and
the analyst's question drives traversal across all of it at once.**

For the Bible that means concretely:

- **The verse stops being the only atom.** Persons, places, events,
  lemmas, topics, numbers, pericopes become first-class objects (#11–24,
  #93). Clicking "Melchizedek" anywhere opens Melchizedek — his verses,
  his relations, his thread through both testaments.
- **One fused graph, not five drawers.** TSK edges, ontology relations,
  quotations, genealogy — one traversable structure with path, proximity
  and community analysis (#1, #3, #6, #32–33).
- **The analyst works a case.** Investigations accumulate evidence;
  trails are recorded and revisitable; output is a product you can hand
  to someone (#8–10, #68–70).
- **Frontier-native.** The app assumes the user plugs in Mythos-class
  intelligence. The Oracle is an analyst with tools over the app's own
  engines and the whole canon in context (done, v0.7), not a chatbox
  (#44–55, #98). Frontier models are also the *build tool*: they extract
  the ontology itself.
- **Honesty is load-bearing.** Every dataset carries source, date, lens
  and CONTESTED stamps. SCHOLARLY SURVEY, NOT PREDICTION. The app never
  presents a 19th-century lens as neutral fact (#86–90).
- Scripture itself stays serif and serene. The intelligence speaks mono
  at the edges. Nothing here touches the sacred column's calm.

Every dataset this plan adds is public-domain or openly licensed, baked
into `/data` as human-auditable JSON with a `_meta` provenance block
(`source`, `license`, `extracted_by` (model+date) or `imported_from`,
`contested_policy`). Data outlives code.

---

## 1 · Phase One — THE ONTOLOGY (the keystone)

**Goal:** every named person, place, event, lemma, topic and significant
number in the 101 books exists as an object with id, mentions
(verse-anchored spans), relations, and provenance. This is the phase every
other phase leans on.

**Retires:** #11 #12 #13 #14 #15 #16 #17 #18 #21 #22 #23 #24 (user edges:
schema slot lands here, UI in Phase 3); #42 (speaker attribution makes red
letters queryable); the keystone for #91–93, #100.

### 1.1 Schema (`src/engine/ontology.ts` + `/data/ontology/*.json`)

```
Entity   { id, kind: person|place|event|lemma|topic|number|pericope,
           names: [primary, aliases…], summary, contested?: {why, views[]},
           meta: kind-specific (person: role, tribe; place: latlon?; …) }
Mention  { entityId, ref: "bookId.ch.v", span?: [start,end], form: "the Tishbite" }
Relation { from, to, kind: father_of|mother_of|spouse_of|killed|ruled|
           located_in|participant_in|quotes|fulfills|parallels|speaker_of|
           about|custom, ref?: evidence verse, provenance, contested? }
```

Files sharded per kind (`persons.json`, `places.json`, `events.json`,
`relations.json`, `mentions/<bookId>.json`) so the app lazy-loads by book.
`custom` relation kind + a `codex.userEdges.v1` store slice reserves #24.

### 1.2 Build method — frontier extraction over the baked WEB

- `scripts/extract-ontology.mjs`: batches the baked `data/bibles/web.json`
  book-by-book (chapter windows with overlap) through a frontier model with
  a strict JSON schema (structured outputs), two passes:
  1. **mention pass** — every named entity occurrence incl. coreference
     ("the prophet" → Elijah) with the sentence span (#18);
  2. **relation pass** — genealogy, deeds, rule, participation, speaker
     attribution (who utters each quoted span → #42).
- Runs offline with the Anthropic API (build machine), OR in-browser via
  the user's own frontier key through the existing browser-direct engines
  — the same code path the Oracle uses. Output is baked to the repo, so
  users never pay for extraction; the frontier is the *factory*, not a
  runtime dependency.
- **Reconciliation pass**: merge with public structured sources where they
  exist — Viz.Bible people/places/genealogy (CC-BY, Robert Rouse),
  OpenBible.info geocoded places (~1,200 with lat/lon, CC-BY) — imported
  fields carry their own provenance; disagreements between extraction and
  import become `contested` records, not silent picks.
- **Audit harness**: `scripts/audit-ontology.mjs` — every mention resolves
  to a real verse key; genealogy is acyclic (exceptions flagged);
  spot-check sample rendered for human review; counts pinned in a
  manifest so regressions are loud.

### 1.3 Surface (minimum for the phase)

- **Entity chips in the reader**: mentions render as quiet underlines in
  the sacred column (off by default on palm; a settings toggle; serif
  stays serene). Tap → the **Dossier** panel: names, summary, mentions
  (walkable), relations (walkable), provenance footer.
- Omnibar learns entities: "melchizedek" ranks the entity above fuzzy
  book guesses.
- Numbers as entities (#22): the extraction tags symbolic numbers (7, 12,
  40, 666…) with occurrence lists; gematria proper arrives in Phase 6.

**Smoke specs:** ontology loads for Genesis with >0 persons/places; every
sampled mention's ref exists in the corpus; tapping a chip opens the
Dossier with ≥1 relation; "elijah" in the omnibar returns the entity row;
red-letter speaker attribution: John 3:16's speaker record exists and is
CONTESTED (Jesus vs. narrator — a real scholarly dispute, our first
honest stamp in data).

---

## 2 · Phase Two — THE FUSED GRAPH & THE GALAXY

**Goal:** one graph over verses AND entities: TSK edges + ontology
relations + quotation edges, traversable and visible canon-wide.

**Retires:** #1 #3 #6 (graph half) #23 #32 #33 #43 (first pattern
surfacing) #94 (galaxy parity); begins #91.

**Build:**
- `src/engine/graph.ts`: adjacency over `{verse|entity}` nodes; edge
  sources tagged (tsk / ontology / quotation / user). Dijkstra PATH,
  ego NEAR, label-propagation FAMILIES — v1 parity, now entity-aware
  ("path from David to Jesus" walks genealogy + quotation, not just TSK).
- **THE GALAXY** instrument: canvas canon view (books as arcs, verses as
  stars, entities as named bodies), fly-to on `cursor` change, PATH burns
  a gold trail, NEAR ignites the neighborhood, FAMILIES colors
  communities. Boots from a precomputed layout baked at build time
  (`scripts/bake-galaxy-layout.mjs`) so first paint is instant.
- **Quotation dataset** (#41, needed for edges): frontier-extract OT→NT
  quotations/allusions, cross-checked against TSK overlap; disagreements
  CONTESTED. `data/quotations.json`.
- Threads panel molts from chip-list into a mini ego-graph (#2) sharing
  the graph engine; "open in Galaxy" is one gesture.

**Smoke specs:** PATH gen.1.1→rev.21.1 returns a route; NEAR isa.53.5
includes a Gospel verse; galaxy renders >30k stars under 2s from bake;
clicking a star navigates the reader; quotation edge count pinned.

---

## 3 · Phase Three — THE ANALYST WORKBENCH

**Goal:** the desk becomes a place where a study happens over hours, not
a viewer with one drawer.

**Retires:** #4 #5 #7 #8 #9 #10 #66 #73 #74 #76 #77 #78 #79 #80 #24 (user
edges UI) #75 (first Witness surfacing).

**Build:**
- **Windows**: the instruments region grows a real WM (drag, resize,
  snap, persisted geometry in the one store; palm keeps sheets — one
  tree, two postures). Panels become windows; several at once (#4–5).
- **Pivot everywhere** (#7): every ref, hit, lane, chip, dossier row
  carries the same context actions — read · threads · compare · mark ·
  ask Oracle · add-to-investigation. One shared `<Ref>` component.
- **Investigations** (#8–10): named case files in the store: evidence
  items (verses, ranges, entities, search hits, Oracle answers) + notes +
  user edges (#24). The **Trail**: the Witness's jump ledger rendered as
  a walkable breadcrumb ribbon; "save trail to investigation".
- **Ranges & pericopes** (#78–79, #93): verse-range selection
  (shift-click / long-press), pericope dataset from WEB's own PD section
  headings (`scripts/extract-pericopes.mjs`), chapter minimap.
- **Navigation** (#77): book/chapter grid picker on the reader title;
  per-verse action menu (#76); cursor history with back/forward (#74).
- Marks upgrade into evidence: note + tags on every mark (#9).

**Smoke specs:** two windows open side-by-side with persisted geometry;
range-mark Gen 1:1–5 lands in an investigation with a note; trail shows
last 5 jumps and back-button returns; pericope headings render for Mark 1.

**RETIRED in v1.0.0** (investigations + the Trail; ranges/pericopes/nav
picker landed earlier in v0.9.0's workbench pass): `investigations` store
slice with evidence items + user edges; "add to investigation" on every
`<Ref>`, the verse menu, the Dossier, and Oracle answers; the
Investigations window (case list → case view, inline note editing,
export to markdown brief); the Trail as a walkable breadcrumb ribbon
(desk bottom-left) with "save trail to investigation" and an active-case
chip in the Trace.

---

## 4 · Phase Four — THE ORACLE AS ANALYST

**Goal:** the Oracle stops answering from priors and starts *working the
app* — with the whole canon in context (shipped v0.7, #51/#98 ✓) plus
tools, missions and receipts.

**Retires:** #44 #45 #46 #47 #48 #49 #50 #52 #53 #54 #55 #92 (first
original engine: kernel) #90 (claim grading, shared with Phase 7).

**Build:**
- **Kernel** (`src/engine/kernel.ts`): typed tool registry the Oracle
  drives via native tool-use (Anthropic) / function-calling (OpenAI-compat):
  `search_scripture, threads_for, compare_verse, entity_dossier,
  graph_path, open_passage, add_to_investigation`. All execution local;
  the model only chooses. Tool calls render as visible chips in the
  answer — the analyst sees the work.
- **Conversation memory** (#44): the panel sends the running transcript;
  prompt-cached canon prefix (already wired) keeps repeat turns cheap.
- **Streaming** (#50) via SSE on both engine families.
- **Citations navigate** (#47): refs in answers parse to `<Ref>` chips.
- **System awareness** (#52–53): context block carries open windows,
  current investigation, recent trail, marks — assembled from the one
  store, size-capped.
- **Missions** (#49): multi-step runs with a visible step feed and a
  final **artifact** (#48): a structured brief (markdown + verse grid)
  saved to the investigation.
- **Council** (#55): two configured keys answer in parallel; a third
  pass reconciles and marks where the minds disagree — disagreement is
  data, rendered honestly.
- **Model & effort picker** (#54): the discovered model list becomes a
  visible choice; Anthropic keys get an effort control.
- **Claim grading** (#90): every quoted ref in an answer is checked
  against the corpus verbatim; mismatches get a visible ⚠ stamp.

**Smoke specs:** mocked-engine mission executes ≥2 tool calls and yields
an artifact; a cited ref chip navigates; a fabricated ref in a canned
answer is flagged ⚠; transcript survives panel close/reopen.

**RETIRED in v1.0.0** (kernel tools, streaming, transcript memory, cited
refs and claim grading landed in v0.9.0): Missions — the same
askOracleStream tool loop framed as a visible step feed with a final
ARTIFACT (title, findings, verse grid) saved to the active investigation;
Council — when a local and a cloud engine are BOTH actually reachable
(probed, not just configured), ask both in parallel and reconcile
honestly (agreements + likely divergences as two columns, never a
blended false consensus); Galaxy FAMILIES surfaced via the omnibar,
coloring the existing label-propagation engine's communities on the star
field.

---

## 5 · Phase Five — THE DATA MOAT

**Goal:** the knowledge layer stops being one 1880s dataset.

**Retires:** #19 #20 #35 #40 #56 #57 #58 #59 #60 #61 #62 #64 #65 #89.

**Build (each a baked dataset + a surface, in this order):**
1. **Strong's/lemma layer** (#19–20, #35): re-bake bolls KJV *keeping*
   `<S>` tags → `data/lemmas.json` (verse→Strong's index) + Strong's
   Hebrew/Greek dictionaries (PD, openscriptures JSON). Word-study
   instrument: tap a word → lemma, gloss, every occurrence across
   translations. Interlinear view from OSHB (CC-BY) + MorphGNT (CC-BY-SA)
   over the already-baked WLC/SBLGNT.
2. **Dictionaries** (#58): Easton's + Smith's (PD) → entity dossiers gain
   a REFERENCE tab with source tags.
3. **Commentaries** (#59): Matthew Henry (PD), Calvin (PD), Church
   Fathers via CCEL (PD) — per-verse overlay, lens-tagged (Reformed /
   Patristic…), never inside the sacred column uninvited.
4. **The parallel corpus** (#60): Josephus (Whiston, PD), Philo (Yonge,
   PD), Talmud via Sefaria API (open), DSS parallels where PD text
   exists — linked to verses through the ontology.
5. **Text criticism** (#61–62): Tischendorf 8th apparatus (PD) for NT
   variants; LXX (Brenton, PD) ↔ MT comparison lanes in Compare.
6. **Synoptic alignment** (#40): pericope-level parallel table
   (frontier-extracted, audited against PD harmonies) → side-by-side
   instrument.
7. **Beyond connected** (#64): extraction pass over the deuterocanon +
   recovered books so ontology and graph reach all 101.
8. **Canon Loop** (#65): dataset manifests with versions + a
   `scripts/verify-data.mjs` integrity check in the harness; the full
   self-updating loop stays gated on explicit user approval (standing
   rule).

**Smoke specs:** tapping "love" in Jhn 3:16 opens G25/G26 with
occurrences; Gen 14 dossier for Melchizedek shows Easton's entry tagged
EASTON 1897; Mat 4 shows a variant note from Tischendorf; synoptic view
aligns the feeding of the five thousand across four refs.

---

## 6 · Phase Six — ANALYTICAL INSTRUMENTS

**Goal:** questions become queries; patterns become visible.

**Retires:** #25 #26 #27 #28 #29 #30 #31 #34 #36 #37 #38 #39 #41(surface)
#22(gematria) #99 (first surprises).

**Build:**
- **The query grammar** (omnibar-native, plain-words): `in:exodus
  with:moses with:aaron before:sinai`, `said-by:jesus about:money`,
  `lemma:H430 in:psalms` — compiled against the local indexes (mentions,
  lemmas, red-letter/speaker, pericopes). Results are a live, filterable
  set that pivots into every instrument (#25–26, #42).
- **Local full-text index** over the baked WEB (all-offline search, all
  translations that are bundled; phrase/AND/OR/NEAR) replacing the
  bolls-only path (#27–29).
- **Aggregations**: frequency and distribution strips (term × book
  heat-ribbon), co-occurrence matrices for entity pairs (#30–31).
- **Compare diffs** (#34): word-level highlight between lanes; a note
  slot for *why* they differ feeds from Phase 5 variant data (#89).
- **THE TIMELINE** (#36, #38): era ribbon (creation→patriarchs→exodus→
  kingdoms→exile→return→intertestamental→NT) with events from the
  ontology; dates carry tradition tags (Ussher PD dates vs. scholarly
  ranges) and CONTESTED stamps — chronology honestly plural.
- **THE MAP** (#37): OpenBible geocoding (CC-BY) renders places; entity
  dossiers and events fly the map; journeys (Exodus route, Paul's
  travels) as paths — each route tagged by source.
- **Gematria engine** (#22): local computation (Mispar Hechrechi et al.)
  over WLC/SBLGNT words — labeled as the historical practice it is.
- **Pattern surfacing** (#43, #99): a quiet "resonances" lane — rare-term
  co-occurrences, unusually dense cross-reference knots near the open
  passage — always explainable, never oracular.
- Authorship/source layers (#39): presented as *lenses* (documentary
  hypothesis colorization, PD-derived) — off by default, lens-tagged.

**Smoke specs:** `said-by:jesus about:money` returns Mt 6:24 among hits
offline; frequency ribbon for "covenant" shows Genesis and Hebrews hot;
compare diff highlights "only begotten/one and only" at Jhn 3:16; map
flies to Bethel; timeline renders eras with a CONTESTED stamp on dates.

---

## 7 · Phase Seven — THE HONESTY LAYER (continuous, hard gate here)

**Goal:** the aesthetic of honesty becomes machinery. This phase is small
because Phases 1–6 were built carrying provenance; here it becomes UI law.

**Retires:** #86 #87 #88 #89(surface) #90(surface) #96.

**Build:**
- **Provenance panel**: every dataset's `_meta` rendered in-app — source,
  license, date, lens, extraction model — one tap from any datum (#87).
- **Bias tags** (#88): TSK rows carry `TSK · TORREY 1880 · REFORMED LENS`;
  commentaries likewise; the tag is a chip, the chip opens the panel.
- **SCHOLARLY SURVEY, NOT PREDICTION** banners on every analytical
  instrument (timeline, patterns, gematria); CONTESTED stamps render
  wherever the data carries them (#86).
- Oracle claim-grading (Phase 4) gets its visible ledger: per-answer
  "n claims checked · n verbatim · n unverified" (#90).
- A smoke *law*: no instrument may render dataset content without a
  reachable provenance chip — enforced by a DOM audit in the harness.

---

## 8 · Phase Eight — REACH & THE ANALYST'S DAY

**Goal:** discoverable to a newcomer, fast for a power user, and the work
leaves the app as product.

**Retires:** #67 #68 #69 #70 #71(first step) #72 #81 #82 #83 #84 #85 #97.

**Build:**
- **The dock** (#85): a quiet edge strip of registered features — the
  registry already knows them; palm gets the same from the orb.
- **Onboarding** (#84): first-boot whisper sequence (three gestures:
  ⌘K, tap a verse, open threads) — no tutorial, three invitations.
- **Help from the registry** (#83): generated from feature manifests +
  per-feature `help` strings; the law finally executes itself.
- **Keyboard depth** (#66): registry-declared keybindings per feature;
  a `?` overlay generated from the same table.
- **Command composition** (#67): omnibar pipes — `threads jhn 1:1 |
  compare | mark` — over the kernel's same tool registry.
- **Export & reports** (#68–69): investigations render to a clean
  markdown/HTML brief (serif, honest footers with provenance) —
  download, print, share.
- **Share** (#70): a study permalink — investigation encoded to a
  compressed URL fragment (no server, no accounts); receiver's app
  rehydrates it read-only.
- **Sync** (#72): export/import of the whole store as a file first
  (works today, no infra); optional folder-sync via the File System
  Access API later. True multi-device collaboration (#71) stays out of
  scope until a server exists — stated honestly.
- **Settings & palm** (#81–82): instrument settings generated from
  manifests; palm gets range selection + dossier sheets tuned, not
  ported blind.
- Reading sessions (#73): "continue the investigation" resume card via
  the whisper lane.

**Smoke specs:** dock lists every registered feature; `?` shows generated
bindings; a piped omnibar command executes; an exported brief contains
provenance footers; a share URL rehydrates an investigation read-only.

**RETIRED in v1.0.0** (dock, onboarding, generated help, keyboard depth,
export landed in v0.9.0): share permalinks — an investigation compresses
into a `#share=...` URL fragment via a hand-rolled LZ-style byte
compressor + base64url (no new dependency), decodes read-only on the
receiver's side with a "save a copy" whisper action; whole-store
export/import to a JSON file (#72's honest first step — append-only
slices merge on import rather than clobber); omnibar pipes
(`threads jhn 1:1 | compare | mark`) over the same command surface the
kernel already exposes. True multi-device sync (#71) remains out of
scope, stated honestly, pending a server that does not exist.

---

## 9 · The mirror, answered

- **#91 thesis feature** → entity-aware fused-graph traversal (Phases
  1+2): click Melchizedek in Genesis, PATH to Hebrews through the
  quotation edge, with provenance at every hop. Nothing else does this.
- **#92 original engines** → the ontology factory, the kernel, the query
  grammar, claim-grading: all ours.
- **#93 altitude** → pericopes, motifs (topics), figures as first-class.
- **#94 v1 parity** → crossed in Phases 2–4 (galaxy, windows, kernel,
  missions) — rebuilt on the lawful foundation, not ported.
- **#95–97** → retired by the sum: powerful *and* provable; the smoke
  harness grows with every phase, never instead of it.
- **#99 surprise** → the resonances lane + council disagreements.
- **#100** → when a question like "trace covenant-breaking meals through
  both testaments" is answerable by query + graph + Oracle with receipts,
  scripture is being interrogated, not displayed. That is the bar.

---

## 10 · The next ten sessions

| # | Ships | Retires (first blood) |
|---|-------|------------------------|
| 1 | ✓ **v0.8.0** — `engine/ontology.ts` schema + engine; `scripts/{seed,extract,audit}-ontology.mjs`; verified Torah seed (45 persons · 22 places · 50 relations · 2,994 mentions, all resolve in the harness); entity underlines in the sacred column + Dossier v1 (CONTESTED views, walkable relations & mentions, provenance footer); omnibar learns entities | #11–14, #18 |
| 2 | Frontier extraction sweep of all 66 books (the harness exists — `extract-ontology.mjs`) + genealogy/speaker relations + reconciliation (Viz.Bible / OpenBible) + omnibar Elijah + John 3:16 speaker CONTESTED; beyond books queued | #15–17, #21–23, #42 |
| 3 | Strong's/lemma layer: re-bake KJV keeping `<S>`, Strong's dictionaries, word-study instrument, interlinear v1 | #19–20, #35, #57 |
| 4 | Graph engine (PATH/NEAR/FAMILIES over TSK+ontology) + quotation dataset; Threads molts to ego-graph | #6, #32–33, #41, #2 |
| 5 | THE GALAXY instrument (baked layout, fly-to, gold trails) | #1, #3, #94(part) |
| 6 | Workbench I: real windows on the desk, pivot-everywhere `<Ref>`, verse ranges + pericopes + minimap, book/chapter picker, cursor history | #4–5, #7, #74, #76–79 |
| 7 | ✓ **v1.0.0** — Workbench II: investigations + evidence marks + the Trail (Witness surfaced) + user edges | #8–10, #24, #66(part), #75 |
| 8 | ✓ v0.9.0 — Oracle-as-analyst I: kernel tools + streaming + navigating citations + system awareness | #45–47, #50, #52 |
| 9 | ✓ **v1.0.0** — Oracle-as-analyst II: missions + artifacts + council + claim grading; model/effort picker | #44, #48–49, #53–55, #90 |
| 10 | ✓ v0.9.0/1.0.0 — Honesty layer hard gate (provenance panels, bias tags, banners, harness law) + dock + generated help + onboarding | #83–88, #96 |

**Progress note (2026-07-07, v0.9.0 "The Glass Cathedral"):** sessions
4–10 landed in one pass — fused graph + Galaxy (§2), workbench windows +
<Ref> + history + grid picker (§3, investigations/trail deferred), the
Oracle as analyst with kernel tools, streaming, transcript memory,
visible tool chips, claim grading and a model/effort picker (§4; missions,
artifacts and council deferred), dock/help/onboarding/export (§8
essentials), plus the first §5 datasets: Strong's lexicon, timeline,
synoptic parallels, canon-tradition tags — all provenance-stamped.

**Progress note (2026-07-07, v1.0.0 "The Name Is Earned"):** the same
day's second pass closed out every deferral from the paragraph above and
fixed the independent coordinator audit (scratch_audit/AUDIT-0.9.0.md) in
full — see that file's RESOLVED section for the defect-by-defect record.
§3's investigations + the Trail, §4's missions + council + Galaxy
FAMILIES, and §8's share permalinks + store sync + omnibar pipes all
landed with smoke specs (110 → 130 checks, ALL GREEN). Honest deferrals
remain, stated plainly rather than hidden: §5's remaining data-moat
datasets (dictionaries, commentaries, the parallel corpus, text
criticism, the rest of Beyond, Canon Loop) and §6's analytical
instruments (query grammar, full-text index, aggregations, THE TIMELINE's
map companion, gematria, pattern surfacing, authorship lenses) were not
in this session's scope; sword/mirror/crossref-web/map instruments and
the Tauri/MLX skin remain queued in GENESIS.md's port order; Council's
reconciliation pass is a local heuristic, not a third model call, by
deliberate design (cost/latency); and the Oracle's live-API path is
still exercised only against mocked specs — no key was available on the
build machine, so the code is structured for a key to "just work" but
that path is unverified end-to-end.

Phases 5, 6 and 8 continue from the next session onward, one dataset or
one instrument per session, each landing with its smoke specs — the moat
deepens weekly, under the same laws, until every phase of this plan is
retired.
