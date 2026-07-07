// The Reader — the sacred center. Serif, serene, honey-flowing. Zero
// console chrome inside the column: navigation is quiet marginal arrows,
// instruments live at the edges, the omnibar is the door.

import { useContext, useEffect, useRef, useState } from "react";
import {
  useApp, goTo, setState, openDossier, openPanel, openReader, whisper, type Cursor,
} from "@/kernel/store";
import { setSeed } from "@/kernel/seeds";
import { WinContext } from "@/shell/Windows";
import { getChapter, bookById, BOOKS, TRANSLATIONS, covers, type Chapter } from "@/engine/corpus";
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

// The verse's glass menu — every gesture the verse affords, one click deep.
function VerseMenu({ refc, text, entityIds, flip, onClose, onNav }: {
  refc: { bookId: string; chapter: number; verse: number };
  text: string;
  entityIds: string[];
  flip: boolean;
  onClose: () => void;
  onNav: (patch: Partial<Cursor>) => void;
}) {
  const [readers, setReaders] = useState(false);
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
  return (
    <span ref={rootRef} className={"gx-vmenu glass gx-enter" + (flip ? " is-flip" : "")} role="menu" aria-label={`Verse ${refc.verse}`}>
      <button role="menuitem" onClick={act(() => { go(); openPanel("compare"); })}>⇄ compare translations</button>
      <button role="menuitem" onClick={act(() => { go(); openPanel("threads"); })}>⛬ threads</button>
      <button role="menuitem" onClick={act(() => {
        setState((s) => {
          const dup = s.marks.find((m) => m.bookId === refc.bookId && m.chapter === refc.chapter && m.verse === refc.verse);
          if (dup) return { marks: s.marks.filter((m) => m.id !== dup.id) };
          return { marks: [...s.marks, { id: "m" + Math.random().toString(36).slice(2, 9), ...refc, text: text.slice(0, 90), at: Date.now() }] };
        });
        record("mark", `${refc.bookId}.${refc.chapter}.${refc.verse}`);
      })}>✦ mark</button>
      <button role="menuitem" onClick={act(() => { void navigator.clipboard?.writeText(`“${text}” — ${label}`); })}>⧉ copy</button>
      <button role="menuitem" onClick={act(() => { go(); setSeed("oracle", `About ${label} — `); openPanel("oracle"); })}>☲ ask the Oracle</button>
      {entityIds.length ? (
        <button role="menuitem" onClick={act(() => openDossier(entityIds[0]))}>☖ dossier</button>
      ) : null}
      <button
        role="menuitem"
        aria-expanded={readers}
        onClick={() => setReaders((r) => !r)}
      >☰ open in new reader…</button>
      {readers ? (
        <span className="gx-vmenu-sub" role="menu">
          {TRANSLATIONS.filter((t) => t.bundled).map((t) => (
            <button key={t.id} role="menuitem" onClick={act(() => { onNav({ ...refc }); openReader(t.id); })}>
              {t.name} <span className="gx-vmenu-lang">{t.lang}</span>
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

// The translation chip's popover — one click to any voice, position kept.
function TransPopover({ current, bookId, onPick, onClose }: {
  current: string; bookId: string; onPick: (id: string) => void; onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [onClose]);
  return (
    <div ref={rootRef} className="gx-trans-pop glass gx-enter" role="menu" aria-label="Translation">
      {TRANSLATIONS.map((t) => (
        <button
          key={t.id}
          role="menuitemradio"
          aria-checked={t.id === current}
          className={"gx-trans-row" + (t.id === current ? " is-active" : "")}
          onClick={() => {
            if (!covers(t, bookId)) {
              whisper({ kind: "toast", title: `◇ ${t.name}`, body: `${bookById.get(bookId)?.name ?? bookId} lives outside this corpus — the reader will serve it from the nearest voice that carries it.` });
            }
            onPick(t.id);
            onClose();
          }}
        >
          <span className="gx-trans-name">{t.name}</span>
          <span className="gx-trans-lang">{t.lang}</span>
          {t.id === current ? <span className="gx-trans-dot" aria-hidden>●</span> : null}
        </button>
      ))}
    </div>
  );
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
  const [transPop, setTransPop] = useState(false);
  const [menu, setMenu] = useState<{ verse: number; flip: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [ontReady, setOntReady] = useState(false);
  const book = bookById.get(cursor.bookId);

  // Swipe turns the chapter (touch, main reader) — a page under the thumb.
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const onSwipeStart = (e: React.PointerEvent) => {
    if (winId || e.pointerType !== "touch") return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onSwipeEnd = (e: React.PointerEvent) => {
    const sw = swipe.current;
    swipe.current = null;
    if (!sw || sw.id !== e.pointerId || !book) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    const next = cursor.chapter + (dx < 0 ? 1 : -1);
    if (next >= 1 && next <= book.chapters) nav({ chapter: next, verse: null });
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
      onPointerDown={onSwipeStart}
      onPointerUp={onSwipeEnd}
    >
      <header className="gx-reader-head">
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
          onClick={() => setPicker((p) => !p)}
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
        <button
          className="gx-trans-chip"
          aria-label="Translation"
          aria-expanded={transPop}
          title="Switch translation"
          onClick={() => setTransPop((t) => !t)}
        >{cursor.translation.toUpperCase()}</button>
        {picker ? <Picker bookId={cursor.bookId} onDone={() => setPicker(false)} onGo={nav} /> : null}
        {transPop ? (
          <TransPopover
            current={cursor.translation}
            bookId={cursor.bookId}
            onPick={(id) => nav({ translation: id })}
            onClose={() => setTransPop(false)}
          />
        ) : null}
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
      ) : (
        <div className="gx-verses">
          {ch.verses.map((v) => (
            <p
              key={v.n}
              className={
                "gx-verse" +
                (red?.has(v.n) ? " is-red" : "") +
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
      )}

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
