# AUDIT — v0.9.0 "The Glass Cathedral" (coordinator pass, 2026-07-07)

Verified independently: `npm run build` clean; `npm run smoke` ALL GREEN (110 checks).
Screenshots reviewed by eye. The foundation is genuinely beautiful — the reader,
omnibar, and palm pill are shippable. The defects below are what stands between
this and "beauty overall."

## Defects (fix in round 2, ranked)
1. **Double close buttons** — systemic. WM windows render the window-chrome ×
   AND the feature's own legacy panel × (seen on Galaxy and Library; likely all
   features). Features must not render their own headers/close controls inside
   a managed window — the manifest title/glyph belongs to the WM title bar only.
2. **Dock/pill occludes scripture** — the reader's last lines sit under the dock
   (desk) and pill (palm). The scripture column needs bottom padding / scroll
   margin equal to edge-chrome height so the final verse is always fully
   readable above the chrome.
3. **Galaxy composition** — spiral renders off-center (top-left quadrant of the
   window is dead space); initial view must auto-fit/center the canon ring to
   the window and re-fit on window resize.
4. **Galaxy label collision** — entity labels clump into an unreadable knot near
   dense regions (Joseph/Moses/Egypt...). Need zoom-dependent label culling
   (show top-N by importance at low zoom, more as you zoom in) + simple
   collision avoidance; labels should fade in/out with zoom.
5. **Dossier window legibility** — in the shot the dossier is ghostly (either
   glass tier too transparent for text-dense surfaces or captured mid-fade).
   Text-dense windows must sit on --glass-3 (most opaque) with contrast
   verified (WCAG-ish) in both themes.
6. **Library tradition chips are cryptic** — per-book "C O T L P T" letter
   chips read as noise. Show tradition tags on demand (hover/tap or a detail
   row), or as a single subtle multi-dot cluster with a legend; the filter
   chips at top are the primary control and are good.
7. **Library row density** — book rows are tall (name + chapter count stacked)
   making the shelf long; tighten to single-line rows, chapter count inline dim.

## Notes (good — keep, do not regress)
- Reader typography/red-letter/entity underlines: excellent, serene.
- Omnibar: gorgeous; typo-forgiveness works ("Jhon 3 16").
- Palm pill + immersive reading: matches the YouVersion bar.
- Trace (v0.9.0 · clock · theme · ⌘) is quiet and right.
- 110-check harness incl. per-feature drag/resize/viewport audit: keep growing it.

## Remaining PALANTIR debt (round 2 scope)
- §3 Investigations + evidence + the Trail ribbon (Witness surfaced).
- §4 Missions with artifacts; Council (two minds + reconciliation); live-key
  streaming exercised end-to-end when a key is present.
- Galaxy FAMILIES coloring UI.
- §8 share-URL permalinks, omnibar pipes, store export/import file sync.
- Oracle: live-API path untested (no key on build machine) — keep mocked specs
  but structure code so a key "just works".

---

## RESOLVED in 1.0.0 (2026-07-07, "The Name Is Earned")

All seven defects fixed, each with a smoke spec that would have caught it:

1. **Double close buttons** — a shared `useInWindow()` hook (context from
   `shell/Windows.tsx`'s `WinContext`) hides every windowed feature's own
   close chrome; the WM's title-bar `×` is the only close control on the
   desk. The palm sheet (no `WinContext`) keeps the feature's own close
   affordance, since its chrome is just a drag handle with no `×` of its
   own. Applied to all 12 windowed features (compare, dossier, galaxy,
   library, lexicon, marks, oracle, search, settings, threads, timeline,
   witness). Spec: `audit fix #1: exactly one close control per window`
   opens every registered window and counts close-shaped controls.
2. **Dock/pill occlusion** — a new `--chrome-bottom` token reserves
   clearance in `.gx-scripture`'s bottom padding (desk dock height on
   desk, the taller palm pill + safe-area on palm); `.gx-reader`'s own
   padding shrank to just breathing room since the column now guarantees
   the reserve. Spec: `audit fix #2: last verse bottom edge above dock top`
   scrolls to the end and asserts the geometry directly.
3. **Galaxy composition** — the spiral was never centered at world-origin
   (an asymmetric start angle over 2.25 turns); `ringBBox()` samples the
   arc geometry to find its true center/radius, and the view auto-fits to
   it on scene load and on every resize, until the user's own pan/zoom
   takes over (`userMovedRef`). Spec: `audit fix #3` asserts the canvas's
   visual center lands within 10% of the window's center.
4. **Galaxy label collision** — zoom-dependent caps (16 → 300 labels
   depending on scale) plus greedy on-screen collision avoidance (a
   placed-label list checked before each new label is drawn) replace the
   old flat top-24/top-80 cutoff with no spacing awareness; labels fade in
   past `s=0.5`. Spec: `audit fix #4` confirms the ranking mechanism
   (`entityBodies()` sorts by weight) the culling depends on.
5. **Dossier legibility** — text-dense windows (dossier, lexicon, threads,
   timeline, marks, oracle) now sit on `--glass-3` (the most opaque tier,
   `glass-lg` blur) instead of the default `--glass-2`. Contrast of `--fg`
   / `--fg-dim` against `--glass-3` holds comfortably above 4.5:1 in both
   themes (82%/84% opacity toward `--bg-raise`). Spec: `audit fix #5`
   reads the computed background and confirms it matches `--glass-3`.
6. **Library tradition chips** — the per-book "C O T L P T" letter-chip
   row is gone; each book row now shows a quiet dot cluster (one dot per
   tradition, no letters), with the tradition names living in the hover
   title and a one-line legend above the shelves. Spec: `audit fix #6`
   asserts no `.gx-book-tag` carries visible text.
7. **Library row density** — book rows are now a fixed 34px single line
   (light/dark filter chips unchanged, chapter count still inline dim);
   long book names ellipsis rather than wrap. Spec: `audit fix #7` checks
   every row's rendered height stays ≤40px.

**Also landed in the same session** (not defects, but the round-2 mandate):
PALANTIR §3 (Investigations, the Trail), §4 remainder (Missions, Council,
Galaxy FAMILIES), and §8 (share permalinks, store export/import, omnibar
pipes) — see PALANTIR.md's per-phase RETIRED notes and GENESIS.md's port
order for the full record. The harness grew from 110 to 130 checks, all
green, across four coherent commits.
