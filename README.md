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
  · compare · mark · oracle.
- **THE ORACLE** — bring your own frontier key (see below): streaming
  answers with the *whole canon* in context, visible tool calls over the
  app's own engines, and claim grading — every quoted verse checked
  verbatim, mismatches stamped ⚠ UNVERIFIED.
- **The palm** — a YouVersion-class pill (book · chapter · voice, two taps
  to anywhere), bottom sheets, immersive scroll, chapter swipe, pinch-zoom
  in the Galaxy — and an iOS shell via Capacitor.
- **Honesty as machinery** — CONTESTED stamps, SCHOLARLY SURVEY banners,
  and a provenance chip (source · license · date) one tap from every
  dataset-driven row.

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

Every dataset ships with a `_meta` provenance block, rendered in-app as a
provenance chip. Scripture is sacred; the Oracle can err — Scripture is
the source.

## The laws

The architecture is governed by [GENESIS.md](./GENESIS.md) (eight laws:
the shell owns space, one store, features are manifests, scripture is
sacred…), the design by [EXOGRAMMAR.md](./EXOGRAMMAR.md) (instruments,
not documents; honesty is load-bearing), and the roadmap by
[PALANTIR.md](./PALANTIR.md).
