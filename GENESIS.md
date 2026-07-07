# CODEX GENESIS — the rebuild, done right the first time

The v1 app (`~/Downloads/bible_study_app`, live on :7777) grew through ~30 releases
into something feature-rich and often beautiful — and structurally unsound. This
document is the honest audit (micro → macro), the lessons, and the architecture
of the rebuild. GENESIS is not a port of code; it is a port of *ideas* onto a
foundation that cannot produce v1's defect classes.

## The audit — what v1 actually is

### Micro (found with eyes + harness, 2026-07-01)
- The "Good evening" briefing card buries the reader's translation chip at
  1680×1050 (fits only on Studio-wide screens). Root cause: the card is a
  `position:fixed` island that knows nothing about window geometry.
- On the palm (390px), the mobile trace (clock + theme) paints OVER the reader's
  header chips; RED-LETTER wraps to two lines; the WEB chip clips offscreen.
  Root cause: three independent surfaces (mobile shell, reader plugin header,
  trace) all claim the same top strip with no layout contract.
- The version was visible nowhere on the desk until today's patch — the shell
  had no owned place for system truth.

These are not three bugs. They are ONE bug expressed three ways: **v1 has no
layout contract — every feature self-injects fixed chrome and prays.**

### Meso (the code)
- **`window.*` as the module system.** Separate IIFEs, cross-file components via
  `window.CODEX_*` exports. A typo'd bare identifier throws inside render and the
  error boundary swallows it: the documented "band won't open, zero pageerrors"
  class. The compiler should have made this bug impossible.
- **Monoliths.** app.jsx 3,400+ lines; styles.css ~20,000 lines; every feature's
  CSS in one file, so nothing can be deleted with confidence (v9.2 "SHED" had to
  strip 32 dead CSS blocks by hand).
- **State as folklore.** `codex.tweaks.v1`, `codex.desk.v1`, `codex.dock.v2`,
  `codex.layouts.v1`, `codex.windows.v1`, `cx-wm-geo:*`, `codex.lastver`, ring
  buffers, BroadcastChannel, `codex:now` DOM events, `window.CODEX_NOW`… dozens
  of ad-hoc keys and buses, each with its own migration story (or none).
- **Two shells.** The desk (app.jsx) and the palm (mobile.jsx) are separate
  codebases that render the same features differently; every feature pays the
  tax twice, and they drift (today's palm header clash is that drift).
- **Manual invariants.** sw.js VERSION mirrored by hand from version.js ("one
  grep" rule); `npm run build` after every jsx edit or changes are invisible;
  smoke boilerplate copy-pasted 24 times with divergent error filters.
- **Docs as marketing.** README ships "BabelForge" — zero code exists. NATIVE.md
  says "PLAN ONLY" while src-tauri/ is half-built. Nothing checks docs against
  reality.

### Macro (the product)
What v1 got RIGHT — these are the crown jewels, and they port:
- The vision: intelligence-console power, Apple-grade restraint, "open source
  for the people — the word is the sword." Honesty as aesthetic (SCHOLARLY
  SURVEY / CONTESTED stamps). Scripture serif and serene; data mono at the edges.
- EXOGRAMMAR's seven laws (./EXOGRAMMAR.md) — the design constitution survives.
- The engines: corpus registry + mirror chain, TSK cross-reference graph
  (415K threads), Strong's, gematria systems, red-letter from WEB <wj>, the
  baked corpora (WLC Tanakh, SBLGNT, 14 recovered deuterocanon books).
- The instruments as concepts: omnibar (the one door), oracle, galaxy, sword,
  mirror, map, timeline, the kernel (agentic tools over the app's own engines).
- 23MB of clean data. Data outlives code; it moves verbatim (`./data`).

## The lessons, as laws for GENESIS

1. **The shell owns space.** No feature may `position:fixed`. The Shell exposes
   named regions — `scripture` (sacred center), `instruments` (windows),
   `edge` (trace/dock slots, each owned exactly once), `whisper` (ONE
   notification lane, queued, collision-free by construction), `veil`
   (omnibar/modals, one at a time). A feature renders into a region or it
   doesn't render.
2. **The compiler is a covenant.** TypeScript + real ES modules. Cross-feature
   access is an import; a missing symbol is a build error, not a silent dead
   panel.
3. **One store, one schema.** A single typed store (cursor, layout, settings,
   engines' status) persisted under ONE versioned key with explicit migrations.
   Events are subscriptions to the store, not a parallel folklore bus.
4. **One shell, two postures.** Desk and palm are the same feature tree in
   different composition — a feature declares `{window, sheet, commands}` once;
   the shell decides posture. Mobile can never drift from desktop again.
5. **Features are manifests.** `registerFeature({id, glyph, title, surfaces,
   commands, settings})` — the dock, omnibar index, settings panel, and HELP
   are all *generated* from the registry. Docs cannot promise what isn't
   registered.
6. **Invariants are computed.** SW versioning from build hash (vite-plugin-pwa).
   No hand-mirrored constants. No "run build or your edit is invisible" — dev
   server HMR.
7. **Verification is one harness.** `scripts/smoke.mjs` — shared boot, shared
   external-noise filter, per-feature specs, screenshot audit (desk 1680,
   studio 2560, palm 390, both themes) in CI from day one. A feature lands with
   its spec or it doesn't land.
8. **Scripture is sacred.** The reader column carries zero console chrome. Serif,
   "honey flowing." Everything instrumental speaks mono at the edges. No agency
   references, ever. Honesty banners are load-bearing.

## Stack
- Vite + React 18 + TypeScript, strict. Zero CSS frameworks — design tokens in
  `src/styles/tokens.css`, feature styles co-located.
- State: hand-rolled 120-line typed store (subscribe/select/update + persist) —
  no dependency worth its weight here.
- PWA: vite-plugin-pwa (generated SW, build-hash versioned) — added once the
  shell is stable, not before.
- Dev: `npm run dev` → http://localhost:7778 (7777 is v1, which stays running
  as the reference until GENESIS surpasses it feature-by-feature).

## Port order (each step lands with smoke + screenshot proof)
1. ✅ **Foundation** — tokens, Shell + regions, store + persistence, feature registry.
2. ✅ **The Word** — corpus engine (registry, mirror chain, IndexedDB cache, baked
   corpora) + the Reader (desk window + palm sheet, red-letter, divine name).
3. ✅ **The door** — omnibar: ref parse → jump, verbs, feature index (generated).
4. ✅ **The shelves** — library/translations (source lights, canons incl. beyond,
   canon-tradition tags · v0.9.0).
5. ◐ **The instruments** — settings-from-registry ✅, oracle + kernel tools ✅
   (v0.9.0: streaming tool-use analyst with claim grading; v1.0.0: kernel
   grows add_to_investigation), galaxy ✅ (v0.9.0: fused graph + canvas
   sky; v1.0.0: auto-fit/centered ring, zoom-dependent label culling,
   FAMILIES coloring), timeline ✅, lexicon ✅ (v0.9.0), investigations ✅
   / missions ✅ / council ✅ (v1.0.0); sword / mirror / crossref web / map
   still to come, one per session, each molted per EXOGRAMMAR (instruments,
   not documents).
6. ◐ **The skin** — PWA ✅, iOS shell via Capacitor ✅ (v0.9.0 — `npx cap open
   ios`); Tauri desk skin and MLX/New Siri engines still to come.

### PALANTIR progress (v0.9.0 "The Glass Cathedral" → v1.0.0 "The Name Is Earned")
Sessions 4–10 of ./PALANTIR.md landed in v0.9.0 in one pass: the fused
graph (engine/graph.ts) + THE GALAXY; the analyst workbench (window
manager, pivot-everywhere <Ref>, cursor history, grid picker); the Oracle
as analyst (kernel tools, SSE streaming both engine families, transcript
memory, visible tool chips, claim grading, model/effort picker); reach
(registry-generated dock + help, onboarding whispers, marks export); and
the fusion datasets (Strong's lexicon, timeline, synoptic parallels,
canon traditions) — every dataset with a _meta provenance block and a
provenance chip in the UI.

v1.0.0 retires the rest of §3/§4/§8: Investigations (case files, evidence,
inline notes, export brief) + the Trail (walkable jump-ledger ribbon,
desk bottom-left) + "add to investigation" wired into every <Ref>, verse
menu, Dossier and Oracle answer; Missions (the Oracle's own tool loop
framed as a step feed + saved artifact) and Council (two reachable
engines, honest reconciliation — agreement/disagreement as two columns,
never blended); Galaxy FAMILIES; share permalinks (a hand-rolled
compressor, no dependency) with read-only rehydration + "save a copy";
whole-store export/import; omnibar pipes (`threads jhn 1:1 | compare |
mark`). Also: every AUDIT-0.9.0 defect fixed (see
scratch_audit/AUDIT-0.9.0.md § RESOLVED), plus a focus trap, aria-labels
on every icon-only control, and a hover-lift micro-delight pass.

## What we deliberately do NOT rebuild
- BabelForge (v1 README vaporware) — stays unbuilt until it can be real.
- Canon Loop — blueprint still awaits explicit user approval.
- v1's classic-mode ghosts, deck/stack, chord-wheel — already dead; stay dead.
