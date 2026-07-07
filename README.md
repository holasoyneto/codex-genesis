# CODEX GENESIS

An open Bible intelligence platform. Scripture stays serif and serene at
the center; the instruments — a cross-reference galaxy, entity dossiers,
a streaming frontier-model analyst, a lexicon, a timeline — speak mono at
the edges. Free, offline-first, no accounts, no server.

**Live:** *(GitHub Pages link goes here after deploy)*

![desk](smoke-shots/desk-dark.png)

## What it does

- **The Reader** — the whole canon (66 books + deuterocanon + recovered
  books), red letters, the divine Name, entity underlines that open
  dossiers. Works offline after first read.
- **The Omnibar (⌘K)** — one door: `John 3:16`, `melchizedek`, `threads`,
  `path gen.1.1 rev.21.1`, `lemma H430`. Never a dead end.
- **THE GALAXY** — 415K cross-references as a sky: books as arcs, verses
  as stars, entities as gold bodies. PATH burns a trail; NEAR ignites a
  neighborhood; a click turns the reader.
- **The Workbench** — instruments open as movable glass windows that
  remember their places; every reference chip pivots into read · threads
  · compare · mark · oracle · **add to investigation**.
- **THE ORACLE** — bring your own frontier key (see below): streaming
  answers with the *whole canon* in context, visible tool calls over the
  app's own engines, and claim grading — every quoted verse checked
  verbatim, mismatches stamped ⚠ UNVERIFIED.
- **Investigations** — case files that accumulate evidence (a verse, an
  entity, a search hit, an Oracle answer) from anywhere in the app, with
  inline notes and a clean exportable markdown brief. **The Trail** walks
  your jump ledger as a breadcrumb ribbon; save it to a case in one click.
- **Missions** — give the Oracle a research goal; it plans, works the
  kernel's own tools step by step with a visible feed, and returns a
  structured artifact you can save to your case.
- **Council** — when a local AND a cloud engine are both reachable, ask
  both at once; agreements and disagreements are shown honestly as data,
  never blended into a false consensus.
- **The work leaves the app** — share an investigation as a compressed
  URL (no server, no accounts); export/import your whole store as a file;
  omnibar pipes chain verbs (`threads jhn 1:1 | compare | mark`).
- **The palm** — a YouVersion-class pill (book · chapter · voice, two taps
  to anywhere), bottom sheets, immersive scroll, chapter swipe, pinch-zoom
  in the Galaxy — and an iOS shell via Capacitor.
- **Honesty as machinery** — CONTESTED stamps, SCHOLARLY SURVEY banners,
  and a provenance chip (source · license · date) one tap from every
  dataset-driven row.

## Screenshots

`smoke-shots/` is refreshed by `npm run smoke` — desk, studio (2560px) and
palm, both themes, plus one shot per new instrument: `desk-dark` /
`desk-light`, `studio-dark` / `studio-light`, `desk-omnibar`,
`desk-library`, `desk-dossier`, `desk-galaxy`, `desk-investigation`,
`desk-investigation-share`, `desk-mission`, `desk-council`, `palm-pill`,
`palm-dark`, `palm-390-light`, `palm-investigation`, and (v1.1.0, "the
legible cathedral") `desk-dock-labels`, `desk-verse-menu`, `palm-menu`,
`palm-back-stack`.

## The vocabulary (v1.1.0)

v1.0 spoke in glyphs alone; a beautiful mark with no word under it is a
hieroglyph, not an interface. [DESIGN.md](./DESIGN.md) is the usability
constitution that fixes this — every rule in it is enforced by a smoke
spec, not just written down:

- **One verb lexicon** (`src/kernel/lexicon.ts`) — Read · Threads ·
  Compare · Mark · Ask · Case · Copy · Share · Export · Settings ·
  Dossier, each a fixed glyph + small-caps word + hint, imported by every
  surface that offers the act (Ref pills, the verse menu, the dossier,
  the omnibar). The same act never has two names again.
- **Every feature declares a `purpose`** (≤ 60 plain words, e.g. Threads
  — "what other verses say about this one") in its manifest — reused
  verbatim by the dock, the window title bar, Help, and the omnibar
  index. A feature without one is a build error; two features sharing a
  glyph is a build error (`src/kernel/registry.ts`).
- **The dock is labeled** — desk: glyph + name always visible beneath
  it, plus an open-state dot; palm: the orb opens a full glass menu
  sheet, one row per instrument (glyph + NAME + purpose).
- **The palm is monotasking** — one sheet at a time; opening a second
  pushes the first onto a back stack, and a universal `‹ back`/`× close`
  bar sits top-left of every sheet, always.
- **Empty states teach** — one sentence + one concrete action, never a
  blank pane; destructive acts (clear the Witness ledger, delete a case)
  confirm in place, two steps, no browser `confirm()`.

## Bring your own frontier key

The Oracle runs on *your* key, browser-direct, stored on your device
only — no middleman, no telemetry:

- **Anthropic** (`sk-ant-…`), **xAI** (`xai-…`), **Gemini** (`AIza…`),
  **Groq** (`gsk_…`), **OpenRouter** (`sk-or-…`) — CODEX discovers the
  strongest model the key can see (a 1M-token mind receives the whole
  canon) and offers a model picker + effort control.
- Or fully local: point it at **Ollama** / any OpenAI-compatible server —
  nothing leaves your machine.

## Run it

```sh
npm install
npm run dev        # http://localhost:7778
npm run build      # production build (PWA)
npm run smoke      # the one harness — specs + screenshots
```

## Run on iOS

The same build wraps into a native shell with Capacitor:

```sh
npm run build
npx cap sync
npx cap open ios   # opens ios/App in Xcode — pick a team, run
```

The `ios/` Xcode project is committed; generated web assets and Pods are
not. No signing or store setup is attempted by the repo.

## Bundled data & licenses

| Dataset | Source | License |
|---|---|---|
| World English Bible (baked canon) | ebible.org | Public domain |
| WLC Tanakh · SBLGNT | openscriptures / SBL | Public domain / CC-BY |
| Charles 1913 Apocrypha · recovered books | R.H. Charles et al. | Public domain |
| Cross-references (432,898 threads) | Treasury of Scripture Knowledge, R. A. Torrey (1880) | Public domain |
| Red letters | derived from WEB `<wj>` markup | Public domain |
| Ontology (persons · places · relations · mentions) | CODEX extraction over the WEB, harness-audited | CC0 for the data; provenance in `data/ontology/manifest.json` |
| Strong's Hebrew & Greek | OpenScriptures JSON of Strong (1890/1894) | CC-BY-SA (JSON), underlying work public domain |
| Timeline (206 events) | conventional scholarly dating (Thiele; consensus NT) | curated, redistributed; CONTESTED-stamped where traditional |
| Synoptic parallels (79 pericopes) | traditional pericope alignment | curated, redistributed |
| Canon-tradition tags (104 books) | open-canon registry (metadata only) | factual metadata |
| CODEX · The Open Canon (Gen 1, Jhn 1 — 82 verses) | `codex-open-canon` project, public-safe subset only (`scripts/import-open-canon.mjs`) | public-domain/CC-BY witnesses underneath; gated/ungated honesty rendering in-app |

Every dataset ships with a `_meta` provenance block, rendered in-app as a
provenance chip. Scripture is sacred; the Oracle can err — Scripture is
the source.

## The laws

The architecture is governed by [GENESIS.md](./GENESIS.md) (eight laws:
the shell owns space, one store, features are manifests, scripture is
sacred…), the design by [EXOGRAMMAR.md](./EXOGRAMMAR.md) (instruments,
not documents; honesty is load-bearing), and the roadmap by
[PALANTIR.md](./PALANTIR.md).
