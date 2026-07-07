// The Reader — the sacred center. Serif, serene, honey-flowing. Zero
// console chrome inside the column: navigation is quiet marginal arrows,
// instruments live at the edges, the omnibar is the door.

import { useContext, useEffect, useRef, useState } from "react";
import {
  useApp, goTo, setState, getState, openDossier, openPanel, openReader, openVeil, whisper, addToInvestigation, type Cursor,
} from "@/kernel/store";
import { setSeed } from "@/kernel/seeds";
import { verb } from "@/kernel/lexicon";
import { WinContext } from "@/shell/Windows";
import { getChapter, bookById, BOOKS, type Chapter } from "@/engine/corpus";
import { record } from "@/kernel/witness";
import { loadOntology, getLoadedOntology, chapterMentions, type Mention } from "@/engine/ontology";
import { redLetterVerses } from "./redletter";
import "./reader.css";

// The golden Name — יהוה rendered reverently wherever the English carries
// LORD/GOD in small caps convention (KJV/WEB style all-caps).
function DivineText({ text }: { text: string }) {
  const parts = text.split(/\b(LORD|GOD|JEHOVAH|YAHWEH)\b/);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        /^(LORD|GOD|JEHOVAH|YAHWEH)$/.test(p)
          ? <span key={i} className="gx-divine" title={p}>יהוה</span>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The verse body — scripture stays serif and serene. When entities are on and
// the verse names one, the name becomes a quiet underline that opens its
// Dossier; everything else still flows as text (divine Name honored within).
function VerseBody({ text, mentions, divineName }: {
  text: string; mentions?: Mention[]; divineName: boolean;
}) {
  const plain = (seg: string, k: number) =>
    divineName ? <DivineText key={k} text={seg} /> : <span key={k}>{seg}</span>;
  if (!mentions || !mentions.length) return plain(text, 0);

  const forms = new Map<string, string>(); // surface form → entityId (first wins)
  for (const m of mentions) if (!forms.has(m.form)) forms.set(m.form, m.entityId);
  const re = new RegExp(`(?<![\\p{L}])(${[...forms.keys()].map(escRe).join("|")})(?![\\p{L}])`, "gu");

  const nodes: React.ReactNode[] = [];
  let last = 0, k = 0, mm: RegExpExecArray | null;
  while ((mm = re.exec(text))) {
    if (mm.index > last) nodes.push(plain(text.slice(last, mm.index), k++));
    const form = mm[1];
    const eid = forms.get(form)!;
    nodes.push(
      <button
        key={k++}
        className="gx-entity"
        title="Open the dossier"
        onClick={(e) => { e.stopPropagation(); openDossier(eid); }}
      >{form}</button>
    );
    last = mm.index + form.length;
  }
  if (last < text.length) nodes.push(plain(text.slice(last), k++));
  return <>{nodes}</>;
}

// The grid picker — one gesture from the title to any chapter of any book.
// A glass popover inside the reader's own header (the shell still owns space).
function Picker({ bookId, onDone, onGo = goTo }: { bookId: string; onDone: () => void; onGo?: (p: Partial<Cursor>) => void }) {
  const [pick, setPick] = useState(bookId);
  const book = bookById.get(pick);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDone(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);
  return (
    <div className="gx-picker glass gx-enter" role="dialog" aria-label="Book and chapter">
      <div className="gx-picker-books">
        {BOOKS.map((b) => (
          <button
            key={b.id}
            className={"gx-picker-book" + (b.id === pick ? " is-active" : "")}
            onClick={() => setPick(b.id)}
          >{b.name}</button>
        ))}
      </div>
      <div className="gx-picker-grid">
        {book ? Array.from({ length: book.chapters }, (_, i) => (
          <button
            key={i}
            className="gx-picker-ch"
            onClick={() => { onGo({ bookId: pick, chapter: i + 1, verse: null }); onDone(); }}
          >{i + 1}</button>
        )) : null}
      </div>
    </div>
  );
}

// A quiet pre-render of an adjacent chapter for the page-turn track —
// text only, no menus, no focus: the page under the incoming page.
function TurnPane({ ch }: { ch: Chapter | null }) {
  return (
    <div className="gx-pt-pane" aria-hidden>
      {ch ? ch.verses.map((v) => (
        <p key={v.n} className="gx-verse">
          <span className="gx-vn">{v.n}</span>{v.text}
        </p>
      )) : null}
    </div>
  );
}

// The verse's glass menu — every gesture the verse affords, one click deep.
function VerseMenu({ refc, text, entityIds, flip, onClose, onNav }: {
  refc: { bookId: string; chapter: number; verse: number };
  text: string;
  entityIds: string[];
  flip: boolean;
  onClose: () => void;
  onNav: (patch: Partial<Cursor>) => void;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [onClose]);
  const label = `${bookById.get(refc.bookId)?.name ?? refc.bookId} ${refc.chapter}:${refc.verse}`;
  const go = () => goTo({ ...refc });
  const act = (fn: () => void) => () => { fn(); onClose(); };
  const compareV = verb("compare"), threadsV = verb("threads"), markV = verb("mark"),
    copyV = verb("copy"), askV = verb("ask"), caseV = verb("case"), dossierV = verb("dossier"),
    readerV = verb("openReader");
  // DESIGN §I.4 — every menu item = glyph + verb + dim hint. No bare rows.
  return (
    <span ref={rootRef} className={"gx-vmenu glass gx-enter" + (flip ? " is-flip" : "")} role="menu" aria-label={`Verse ${refc.verse}`}>
      <button role="menuitem" onClick={act(() => { go(); openPanel("compare"); })}>
        <span aria-hidden>⇄</span> {compareV.word}<i className="gx-vmenu-hint">{compareV.hint}</i>
      </button>
      <button role="menuitem" onClick={act(() => { go(); openPanel("threads"); })}>
        <span aria-hidden>{threadsV.glyph}</span> {threadsV.word}<i className="gx-vmenu-hint">{threadsV.hint}</i>
      </button>
      <button role="menuitem" onClick={act(() => {
        setState((s) => {
          const dup = s.marks.find((m) => m.bookId === refc.bookId && m.chapter === refc.chapter && m.verse === refc.verse);
          if (dup) return { marks: s.marks.filter((m) => m.id !== dup.id) };
          return { marks: [...s.marks, { id: "m" + Math.random().toString(36).slice(2, 9), ...refc, text: text.slice(0, 90), at: Date.now() }] };
        });
        record("mark", `${refc.bookId}.${refc.chapter}.${refc.verse}`);
        whisper({ kind: "toast", title: `Marked ${label}` });
      })}>
        <span aria-hidden>{markV.glyph}</span> {markV.word}<i className="gx-vmenu-hint">{markV.hint}</i>
      </button>
      <button role="menuitem" onClick={act(() => { void navigator.clipboard?.writeText(`"${text}" — ${label}`); whisper({ kind: "toast", title: `Copied ${label}` }); })}>
        <span aria-hidden>{copyV.glyph}</span> {copyV.word}<i className="gx-vmenu-hint">{copyV.hint}</i>
      </button>
      <button role="menuitem" onClick={act(() => { go(); setSeed("oracle", `About ${label} — `); openPanel("oracle"); })}>
        <span aria-hidden>{askV.glyph}</span> {askV.word} the Oracle<i className="gx-vmenu-hint">{askV.hint}</i>
      </button>
      <button role="menuitem" onClick={act(() => { addToInvestigation("verse", { ref: `${refc.bookId}.${refc.chapter}.${refc.verse}` }, ""); whisper({ kind: "toast", title: `Added ${label} to case` }); })}>
        <span aria-hidden>{caseV.glyph}</span> {caseV.word}<i className="gx-vmenu-hint">{caseV.hint}</i>
      </button>
      {entityIds.length ? (
        <button role="menuitem" onClick={act(() => openDossier(entityIds[0]))}>
          <span aria-hidden>{dossierV.glyph}</span> {dossierV.word}<i className="gx-vmenu-hint">{dossierV.hint}</i>
        </button>
      ) : null}
      {/* v1.2.0 — the sub-list of voices died (DESIGN §III: the VOICES
          surface is THE one translation system). A new reader spawns
          pinned to the CURRENT voice; its own chip opens the voices
          surface scoped to its pin. */}
      <button
        role="menuitem"
        onClick={act(() => { onNav({ ...refc }); openReader(getStateTranslation()); })}
      >
        <span aria-hidden>{readerV.glyph}</span> {readerV.word}<i className="gx-vmenu-hint">{readerV.hint}</i>
      </button>
    </span>
  );
}

function getStateTranslation(): string {
  return getState().cursor.translation;
}

export function Reader() {
  // A windowed reader ("reader@wlc") is pinned to a translation; linked
  // ones follow the global cursor, unlinked ones keep their own place.
  const winId = useContext(WinContext);
  const pin = useApp((s) => (winId && winId.startsWith("reader@") ? s.readers[winId] : undefined));
  const gcursor = useApp((s) => s.cursor);
  const cursor: Cursor = pin
    ? pin.linked
      ? { ...gcursor, translation: pin.translation }
      : { bookId: pin.bookId, chapter: pin.chapter, verse: null, translation: pin.translation }
    : gcursor;
  // Navigation respects the pin: an unlinked window walks alone.
  const nav = (patch: Partial<Cursor>) => {
    if (pin && winId && !pin.linked) {
      setState((s) => ({
        readers: {
          ...s.readers,
          [winId]: {
            ...s.readers[winId],
            bookId: patch.bookId ?? s.readers[winId].bookId,
            chapter: patch.chapter ?? s.readers[winId].chapter,
            translation: patch.translation ?? s.readers[winId].translation,
          },
        },
      }));
    } else if (pin && winId && patch.translation) {
      setState((s) => ({
        readers: { ...s.readers, [winId]: { ...s.readers[winId], translation: patch.translation! } },
      }));
    } else {
      goTo(patch);
    }
  };
  const { redLetter, divineName, entities, scriptureScale } = useApp((s) => s.settings);
  const [ch, setCh] = useState<Chapter | null>(null);
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState<{ verse: number; flip: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [ontReady, setOntReady] = useState(false);
  const book = bookById.get(cursor.bookId);

  // ── Apple-Books page turn (palm, main reader) ────────────────────────
  // The page FOLLOWS the finger: adjacent chapters are pre-rendered in
  // offscreen columns; a horizontal drag translates the track live.
  // Commit past ~35% width or on a velocity flick (260ms eased settle);
  // otherwise snap back. A 10px direction lock lets vertical scroll win.
  // Rubber-band at the book's boundaries. prefers-reduced-motion → the
  // turn is an instant swap. The header's ‹ › stay (desk) — this replaces
  // only the old jump-cut swipe.
  const [palm, setPalm] = useState(() => window.matchMedia("(max-width: 880px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 880px)");
    const on = () => setPalm(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const palmMain = palm && !winId;

  const [adjacent, setAdjacent] = useState<{ prev: Chapter | null; next: Chapter | null }>({ prev: null, next: null });
  useEffect(() => {
    if (!palmMain || !book) return;
    let live = true;
    const p = cursor.chapter > 1
      ? getChapter(cursor.translation, cursor.bookId, cursor.chapter - 1).catch(() => null)
      : Promise.resolve(null);
    const n = cursor.chapter < book.chapters
      ? getChapter(cursor.translation, cursor.bookId, cursor.chapter + 1).catch(() => null)
      : Promise.resolve(null);
    Promise.all([p, n]).then(([prev, next]) => { if (live) setAdjacent({ prev, next }); });
    return () => { live = false; };
  }, [palmMain, cursor.translation, cursor.bookId, cursor.chapter, book]);

  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<null | {
    x: number; y: number; id: number;
    mode: "undecided" | "h" | "v";
    dx: number; lastX: number; lastT: number; vx: number;
    settling: boolean;
  }>(null);

  const setTrack = (dx: number, animate = false) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 260ms cubic-bezier(0.22, 0.61, 0.36, 1)" : "none";
    el.style.transform = `translateX(${dx}px)`;
  };

  const onTurnDown = (e: React.PointerEvent) => {
    if (!palmMain || e.pointerType !== "touch" || drag.current?.settling) return;
    drag.current = {
      x: e.clientX, y: e.clientY, id: e.pointerId,
      mode: "undecided", dx: 0, lastX: e.clientX, lastT: performance.now(), vx: 0,
      settling: false,
    };
  };
  const onTurnMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.settling || d.id !== e.pointerId || !book) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (d.mode === "undecided") {
      // 10px direction lock — vertical intent wins and we never touch the page.
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { d.mode = "v"; return; }
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) d.mode = "h";
      else return;
    }
    if (d.mode !== "h") return;
    const now = performance.now();
    d.vx = (e.clientX - d.lastX) / Math.max(1, now - d.lastT);
    d.lastX = e.clientX; d.lastT = now;
    d.dx = dx;
    // Rubber-band at canon boundaries: no page that way — resistance.
    const blocked = (dx > 0 && !adjacent.prev) || (dx < 0 && !adjacent.next);
    setTrack(blocked ? dx * 0.3 : dx);
  };
  const onTurnEnd = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.settling || d.id !== e.pointerId || !book) { if (d && !d.settling) drag.current = null; return; }
    if (d.mode !== "h") { drag.current = null; return; }
    const w = window.innerWidth;
    const dir = d.dx < 0 ? 1 : -1; // drag left → next chapter
    const available = dir === 1 ? !!adjacent.next : !!adjacent.prev;
    const past = Math.abs(d.dx) > 0.35 * w;
    const flick = Math.abs(d.vx) > 0.5 && Math.abs(d.dx) > 24 && Math.sign(-d.vx) === dir;
    const commit = available && (past || flick);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (commit) {
      if (reduced) {
        setTrack(0);
        nav({ chapter: cursor.chapter + dir, verse: null });
        drag.current = null;
      } else {
        d.settling = true;
        setTrack(dir === 1 ? -w : w, true);
        window.setTimeout(() => {
          nav({ chapter: cursor.chapter + dir, verse: null });
          setTrack(0);
          drag.current = null;
        }, 265);
      }
    } else {
      setTrack(0, !reduced && d.dx !== 0);
      drag.current = null;
    }
  };

  // Warm the ontology once; a re-render swaps text for chips when it lands.
  useEffect(() => {
    if (!entities) return;
    let live = true;
    loadOntology().then(() => { if (live) setOntReady(true); }).catch(() => { /* dark-safe */ });
    return () => { live = false; };
  }, [entities]);

  useEffect(() => {
    let live = true;
    setError(null);
    getChapter(cursor.translation, cursor.bookId, cursor.chapter)
      .then((c) => { if (live) { setCh(c); } })
      .catch((e) => {
        if (live) {
          setError(String(e));
          record("darkpage", `${cursor.translation}/${cursor.bookId}.${cursor.chapter}`);
        }
      });
    return () => { live = false; };
  }, [cursor.translation, cursor.bookId, cursor.chapter, retry]);

  // The eye goes up on a chapter turn; the machine follows. (The main
  // column only — windowed readers scroll their own glass.)
  useEffect(() => {
    if (!winId) document.querySelector(".gx-scripture")?.scrollTo({ top: 0 });
  }, [winId, cursor.bookId, cursor.chapter]);

  // The menu dies on any move.
  useEffect(() => setMenu(null), [cursor.bookId, cursor.chapter, cursor.verse]);

  // A jump that names a verse carries the eye TO that verse once the
  // chapter arrives — a focus that lands below the fold is a dead end.
  useEffect(() => {
    if (!winId && ch && cursor.verse != null) {
      document.querySelector(".gx-scripture .gx-verse.is-focus")?.scrollIntoView({ block: "center" });
    }
  }, [winId, ch, cursor.verse]);

  // B keeps the focused verse (a mark). Quiet when typing or veiled.
  // Registered by the MAIN reader alone — pinned windows stay quiet.
  useEffect(() => {
    if (winId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "b" || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]")) return;
      const loaded = ch && ch.bookId === cursor.bookId && ch.chapter === cursor.chapter ? ch : null;
      const v = cursor.verse != null && loaded ? loaded.verses.find((x) => x.n === cursor.verse) : null;
      if (!v) return;
      e.preventDefault();
      setState((s) => {
        const dup = s.marks.find((m) => m.bookId === cursor.bookId && m.chapter === cursor.chapter && m.verse === v.n);
        if (dup) return { marks: s.marks.filter((m) => m.id !== dup.id) }; // B again lets go
        return {
          marks: [...s.marks, {
            id: "m" + Math.random().toString(36).slice(2, 9),
            bookId: cursor.bookId, chapter: cursor.chapter, verse: v.n,
            text: v.text.slice(0, 90), at: Date.now(),
          }],
        };
      });
      record("mark", `${cursor.bookId}.${cursor.chapter}.${v.n}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ch, cursor.bookId, cursor.chapter, cursor.verse]);

  const red = redLetter ? redLetterVerses(cursor.bookId, cursor.chapter) : null;
  // Entity mentions for this chapter (empty until the ontology is warm).
  const ont = entities && ontReady ? getLoadedOntology() : null;
  const chMentions = ont ? chapterMentions(ont, cursor.bookId, cursor.chapter) : null;

  // While a jump is in flight the OLD chapter is still on screen — verse
  // focus and marks must never act on it.
  const current = ch && ch.bookId === cursor.bookId && ch.chapter === cursor.chapter ? ch : null;

  if (!book) return null;
  return (
    <article
      className="gx-reader"
      style={{ ["--scripture-size" as string]: `${scriptureScale}px` }}
      aria-label={`${book.name} ${cursor.chapter}`}
    >
      <header className="gx-reader-head">
        {/* DESIGN §III — one act, one control per surface. On the palm the
            PILL is the reader's only navigation: the header keeps just the
            static title (no arrows, no chip, no click); tapping anything
            nav-shaped can only ever mean the pill's own fullscreen picker.
            The desk keeps arrows + chip (it has the room), but the title
            now opens the SAME polished veil picker (NavSheet) the pill
            uses — one picker component, two postures. Windowed readers
            keep the inline grid (their nav drives a private pin, not the
            global cursor the veil moves). */}
        {palmMain ? (
          <h1 className="gx-reader-title is-static">
            {book.name} <b>{cursor.chapter}</b>
            <span className="gx-reader-of">/ {book.chapters}</span>
          </h1>
        ) : (
          <>
            <button
              className="gx-reader-nav"
              aria-label="Previous chapter"
              disabled={cursor.chapter <= 1}
              onClick={() => nav({ chapter: cursor.chapter - 1, verse: null })}
            >‹</button>
            <button
              className="gx-reader-title-btn"
              aria-label="Choose book and chapter"
              aria-expanded={picker}
              onClick={() => (winId ? setPicker((p) => !p) : openVeil("reader", "book"))}
            >
              <h1 className="gx-reader-title">
                {book.name} <b>{cursor.chapter}</b>
                <span className="gx-reader-of">/ {book.chapters}</span>
              </h1>
            </button>
            <button
              className="gx-reader-nav"
              aria-label="Next chapter"
              disabled={cursor.chapter >= book.chapters}
              onClick={() => nav({ chapter: cursor.chapter + 1, verse: null })}
            >›</button>
            {/* v1.2.0 — the chip opens THE one voices surface (NavSheet),
                scoped to this window's pin when inside a windowed reader. */}
            <button
              className="gx-trans-chip"
              aria-label="Voices"
              title="Choose a voice"
              onClick={() => openVeil("reader", winId ? `trans:${winId}` : "trans")}
            >{cursor.translation.replace(/^bolls:/, "").toUpperCase()}</button>
            {picker && winId ? <Picker bookId={cursor.bookId} onDone={() => setPicker(false)} onGo={nav} /> : null}
          </>
        )}
      </header>

      {error ? (
        <div className="gx-reader-dark">
          <p className="gx-reader-dark-line">THE PAGE IS DARK — no source could serve this passage.</p>
          <div className="gx-reader-dark-acts">
            <button className="gx-dark-act" onClick={() => setRetry((n) => n + 1)}>⟳ TRY AGAIN</button>
            <button className="gx-dark-act" onClick={() => openPanel("library")}>❖ THE SHELVES</button>
          </div>
          <span className="gx-reader-err">{error}</span>
        </div>
      ) : !ch ? (
        <p className="gx-reader-wait" aria-live="polite">…</p>
      ) : (() => {
        const verses = (
          <div className="gx-verses">
            {ch.translation === "codex" && ch.verses.some((v) => v.gate === "UNGATED") ? (
              <p className="gx-ungated-banner" role="note">
                UNGATED — provisional rendering, gates pending
              </p>
            ) : null}
            {ch.verses.map((v) => (
              <p
                key={v.n}
                className={
                  "gx-verse" +
                  (red?.has(v.n) ? " is-red" : "") +
                  (v.gate === "GATED_COMPLETE" ? " is-gated" : "") +
                  (current && cursor.verse === v.n ? " is-focus" : "") +
                  (menu?.verse === v.n ? " has-menu" : "")
                }
                onClick={(e) => {
                  if (!winId) goTo({ verse: v.n });
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTimeout(() => setMenu({ verse: v.n, flip: r.bottom > innerHeight * 0.62 }), 0);
                }}
              >
                <span className="gx-vn" aria-hidden>{v.n}</span>
                <VerseBody text={v.text} mentions={chMentions?.get(v.n)} divineName={divineName} />
                {menu?.verse === v.n ? (
                  <VerseMenu
                    refc={{ bookId: cursor.bookId, chapter: cursor.chapter, verse: v.n }}
                    text={v.text}
                    entityIds={[...new Set((chMentions?.get(v.n) ?? []).map((m) => m.entityId))]}
                    flip={menu.flip}
                    onClose={() => setMenu(null)}
                    onNav={nav}
                  />
                ) : null}
              </p>
            ))}
          </div>
        );
        if (!palmMain) return verses;
        // The page-turn track: prev · current · next, one viewport-width
        // column each, centered on the current page. The finger drags the
        // whole track; the side panes are quiet pre-renders (no menus).
        return (
          <div
            className="gx-pageturn"
            onPointerDown={onTurnDown}
            onPointerMove={onTurnMove}
            onPointerUp={onTurnEnd}
            onPointerCancel={onTurnEnd}
          >
            <div className="gx-pageturn-track" ref={trackRef}>
              <TurnPane ch={adjacent.prev} />
              <div className="gx-pt-pane is-current">{verses}</div>
              <TurnPane ch={adjacent.next} />
            </div>
          </div>
        );
      })()}

      {ch ? (
        <footer className="gx-reader-foot">
          <span className="gx-served" title="Where this text was served from">
            ⇄ {ch.servedFrom} · {ch.translation.toUpperCase()}
          </span>
        </footer>
      ) : null}
    </article>
  );
}
