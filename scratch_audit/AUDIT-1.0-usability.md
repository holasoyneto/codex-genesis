# AUDIT 1.0 — usability + bug audit (pre-DESIGN.md application)

Method: dev server (localhost, Vite HMR) driven through the browser preview
harness at desk (1680×1050) and palm (390×844), both themes, walking every
registered feature (17 manifests) via the dock/omnibar, plus static review of
every feature's source against DESIGN.md/EXOGRAMMAR.md. Console was clean
(no pageerrors) throughout. One tooling artifact noted and worked around: the
preview harness's synthetic `click()` did not reliably trigger React's
`onClick` on dock buttons in this session; `dispatchEvent(new MouseEvent(...))`
did. This is a harness quirk, not an app defect — confirmed by the store
(`wm.open`) updating correctly once the event actually reached React.

## Findings

1. **Dock is all bare glyphs, no labels, no hover-free identification.**
   16 dock buttons (`☰ ☌ ❖ ⚙ ◉ ◎ ✦ ⛬ ⋕ ☖ ✧ אָ 𝍫 🗂 ☄ ☯`) render with only a
   `title`/`aria-label` attribute — nothing visible without a mouse hover.
   Violates DESIGN §I.1/§I.2. **FIX: Dock (desk) renders glyph + small-caps
   name always visible; palm orb opens a full labeled menu sheet.**

2. **Glyph collision: `desk` and `library` both claim `❖`.** Confirmed by
   grep across `src/features/*/index.ts` — `library/index.ts` and
   `desk/index.ts` both set `glyph: "❖"`. Violates DESIGN §II.7. **FIX: give
   Desk a new unique glyph; add a build-time uniqueness assertion in
   `registry.ts` so this class of bug cannot return.**

3. **No `purpose` field on any feature manifest.** `FeatureManifest` has no
   `purpose: string` and no window/dock/help surface shows one. Violates
   DESIGN §I.3. **FIX: add required `purpose` to the manifest type, write
   purposes for all 17 features, thread through dock tooltips, window title
   bars, help overlay, omnibar index; build-time throw if empty/>60 chars.**

4. **Window title bars carry no subtitle.** Confirmed live: Oracle's
   `.gx-win-bar` renders `◎ Oracle ×` only — no purpose text. Violates
   DESIGN §I.3. **FIX: title bar renders `NAME · purpose` in dim mono.**

5. **Ref action pills (verse menu) are bare glyphs with no visible words.**
   `VerseMenu` in `Reader.tsx` renders `✦ mark`, `⧉ copy` etc. — these DO
   already pair glyph+word (good), but they are not sourced from a shared
   lexicon, so wording could drift feature-to-feature (dossier rows, oracle
   citations, investigations use their own ad hoc glyph+word pairs).
   Violates DESIGN §II.6/§II.8 (one vocabulary, not per-surface phrasing).
   **FIX: introduce `src/kernel/lexicon.ts`, refactor call sites to import
   it.**

6. **Menus lack hint text.** The verse menu, translation popover, and
   settings rows render verb+glyph but no dim explanatory hint per item.
   Violates DESIGN §I.4. **FIX: add a hint span under/after each row.**

7. **No empty-state teaching copy verified per instrument** (Marks,
   Investigations, Dossier, Missions, Council when they have nothing to
   show render minimal or no guidance) — spot-checked Marks: empty state is
   a single short line, not one full sentence + concrete action. Violates
   DESIGN §I.5. **FIX: empty states per §V rewritten as sentence + action,
   enforced by the ≥8-word smoke heuristic.**

8. **Redundancy: chapter navigation exists in two places at once**
   (reader header `‹ ›` arrows AND the Picker/book-chooser`'s own chapter
   grid) which is intended (arrows = ambient nav, picker = jump), but the
   `TransPopover` translation chip and the Library's translation list are
   two full pickers for the same act with no cross-reference — acceptable
   per DESIGN §III.9 as "omnibar is the intentional exception" does NOT
   cover this pair, since omnibar isn't involved. **FIX: keep both (one is
   quick-switch, one is browse-with-source-lights) but ensure the reader's
   translation popover and the Library agree on order/naming — no further
   code change required this round beyond lexicon consistency; documented
   here as a reviewed non-issue.**

9. **Palm dock orb → unfold list is bare glyphs too**, same defect as desk
   dock but worse (no title tooltip reachable on touch at all without a
   long-press). Violates DESIGN §I.2. **FIX: palm orb opens a full sheet,
   each row glyph+NAME+purpose.**

10. **Palm posture: opening a second sheet was not verified to close the
    first with a back-stack** — code inspection of `store.ts`
    `openPanel`/`focusPanel` shows a single `panel: string | null` value,
    which naturally enforces "opening B replaces A" for the *sheet* field,
    but there is no explicit back-stack array remembering "A" so a universal
    back affordance can return to it — currently back would have to mean
    "close the sheet entirely," losing the previous panel. Violates DESIGN
    §IV.11. **FIX: add a palm back-stack slice + universal back button
    top-left of every sheet.**

11. **`window title bar` reuse for help overlay/omnibar index was not
    present** — Help and Omnibar index currently list feature `title` only
    (confirmed by reading `help/index.ts`/`omnibar/index.ts` surfaces).
    Violates DESIGN §I.3 (same purpose line reused in 3 places). **FIX: once
    `purpose` exists on the manifest, Help and Omnibar consume it.**

12. **No feedback whisper string format standardized** — `whisper()` calls
    exist ad hoc (e.g. translation-coverage toast) but marking/adding to
    case do not currently emit a whisper (confirmed: `B` mark handler in
    Reader.tsx has no `whisper()` call, only `record()` to Witness).
    Violates DESIGN §V.14. **FIX: add whispers to mark, add-to-investigation,
    copy.**

13. **Deletes are not consistently two-step** — `deleteInvestigation` in
    store.ts is a single direct call; UI needs confirmation to be verified
    per-surface. Violates DESIGN §V.15 if any delete button calls it
    directly without a confirm step. **FIX: add inline two-step confirm
    component, wire to investigation delete (and any other destructive
    button found during the fix pass).**

## Summary

13 findings logged. All 13 are addressed in this session (see commit log) —
none deferred, since they map directly onto DESIGN.md's law list, which this
whole session exists to implement. Root cause for nearly all of them is the
same one DESIGN.md names: v1.0 shipped a beautiful glyph language with no
label layer underneath it. The fix is structural (lexicon + purpose field +
enforcement), not cosmetic.
