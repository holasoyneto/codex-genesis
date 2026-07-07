# DESIGN — the legible cathedral (v1.1, the usability constitution)

EXOGRAMMAR governs the soul; this document governs comprehension. It exists
because v1.0.0, though beautiful, spoke in hieroglyphs. Every rule here is
enforced by a smoke spec — a rule without a spec does not exist.

## I · Words first, glyphs second

1. **A glyph never stands alone.** Every interactive element shows a word, or
   sits in a context that just taught the word. The ONLY bare glyphs allowed
   are the universal set: `×` close, `‹ ›` prev/next, `?` help, `+` add,
   drag handles. Everything else pairs glyph + label.
2. **The dock is labeled.** Desk: each dock item shows its glyph with its name
   in small caps beneath it, always visible — no hover required to know what
   a button is. Palm: the orb opens a full menu sheet — each row is glyph +
   name + one-line purpose ("THREADS — what other verses say about this one").
3. **Every window title bar carries a purpose subtitle**, dim mono, after the
   name: `WITNESS · your reading history`. The poetry stays; the meaning is
   free. Same line reused in the dock menu, the help overlay, and the omnibar
   index — written ONCE in the feature manifest (`purpose: string`, required).
4. **Menus explain themselves.** Every menu item = glyph + verb + dim hint.
   No menu item ships without a hint.
5. **Empty states teach.** An instrument with nothing to show states in one
   sentence what it is and offers one concrete action ("No marks yet — tap a
   verse and choose Mark"). Never a blank pane.

## II · One vocabulary

6. **The verb lexicon.** Exactly these words for these acts, everywhere:
   Read · Threads · Compare · Mark · Ask (Oracle) · Case (add to
   investigation) · Copy · Share · Export · Settings. One glyph per verb,
   fixed in `src/kernel/lexicon.ts`, imported by every surface. The same act
   never has two names; two acts never share a glyph.
7. **No two features share a glyph** (v1.0 shipped ❖ twice). Uniqueness is a
   build-time assertion in the registry.
8. **Ref actions are labeled pills.** The row of verse/ref actions renders
   verb words (small caps) with their glyphs — not a strip of runes.

## III · No redundancy

9. **One act, one control per surface.** If two controls on the same surface
   do the same thing, one dies. Known offenders to sweep: duplicate
   chapter-navigation affordances, picker-vs-title duplicates, actions that
   appear both in a header and a row. The omnibar is the intentional
   exception: it may duplicate anything, because it is the index of
   everything.
10. **One door per destination in chrome.** The dock opens features; the
    reader header navigates scripture; the trace reports system truth. No
    chrome surface borrows another's job.

## IV · Two postures, two philosophies

11. **The palm is MONOTASKING.** One surface at a time, full attention:
    scripture, or ONE full-height sheet above it. Opening a second feature
    replaces the sheet (the previous one goes into a back stack); a universal
    back affordance (top-left of every sheet) walks the stack. No windows, no
    stacked sheets, no desktop metaphors. The pill and orb are the only
    persistent chrome.
12. **The desk is MULTITASKING.** Windows are the medium of study: several
    instruments at once, geometry persisted. But multitasking needs
    orientation: the dock marks OPEN features with a visible state (dot +
    brighter label); ⌘` cycles; ⇧Esc clears; "reset layout" heals.
13. **Features declare, postures decide.** No feature may special-case "am I
    on mobile" beyond its manifest surfaces; the shell owns posture. (Already
    law — restated because usability work will tempt violations.)

## V · Forgiveness and feedback

14. **Every action confirms itself** with a whisper or visible state change
    within 150ms — marking, adding to a case, copying: something visibly
    happened, in words ("Marked John 3:16").
15. **Destructive acts are two-step** (delete case, clear store: confirm in
    place — no browser confirm()).
16. **Everything is escapable.** Esc (desk) and swipe-down/back (palm) always
    retreat one level and never lose user text without warning.

## VI · Enforcement (the harness laws)

- Every registered feature has a nonempty `purpose` ≤ 60 chars (build error
  otherwise).
- No two manifests share a glyph (build error).
- Dock items render visible text labels (DOM audit).
- Every `<button>` either has visible text, or its glyph ∈ the universal set,
  or it carries BOTH aria-label and a paired visible label elsewhere in its
  control (DOM audit).
- Every menu item has a hint node (DOM audit).
- Every instrument's empty state contains a verb (heuristic: renders ≥ 8
  words when its data is empty) (smoke).
- Palm: opening feature B while A's sheet is open closes A (spec), back
  returns to A (spec).
