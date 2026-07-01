// The Reader — the sacred center. Serif, serene, honey-flowing. Zero
// console chrome inside the column: navigation is quiet marginal arrows,
// instruments live at the edges, the omnibar is the door.

import { useEffect, useState } from "react";
import { useApp, goTo, setState } from "@/kernel/store";
import { getChapter, bookById, type Chapter } from "@/engine/corpus";
import { record } from "@/kernel/witness";
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

export function Reader() {
  const cursor = useApp((s) => s.cursor);
  const { redLetter, divineName, scriptureScale } = useApp((s) => s.settings);
  const [ch, setCh] = useState<Chapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const book = bookById.get(cursor.bookId);

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

  // The eye goes up on a chapter turn; the machine follows.
  useEffect(() => {
    document.querySelector(".gx-scripture")?.scrollTo({ top: 0 });
  }, [cursor.bookId, cursor.chapter]);

  // A jump that names a verse carries the eye TO that verse once the
  // chapter arrives — a focus that lands below the fold is a dead end.
  useEffect(() => {
    if (ch && cursor.verse != null) {
      document.querySelector(".gx-verse.is-focus")?.scrollIntoView({ block: "center" });
    }
  }, [ch, cursor.verse]);

  // B keeps the focused verse (a mark). Quiet when typing or veiled.
  useEffect(() => {
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
        <button
          className="gx-reader-nav"
          aria-label="Previous chapter"
          disabled={cursor.chapter <= 1}
          onClick={() => goTo({ chapter: cursor.chapter - 1, verse: null })}
        >‹</button>
        <h1 className="gx-reader-title">
          {book.name} <b>{cursor.chapter}</b>
          <span className="gx-reader-of">/ {book.chapters}</span>
        </h1>
        <button
          className="gx-reader-nav"
          aria-label="Next chapter"
          disabled={cursor.chapter >= book.chapters}
          onClick={() => goTo({ chapter: cursor.chapter + 1, verse: null })}
        >›</button>
      </header>

      {error ? (
        <div className="gx-reader-dark">
          <p className="gx-reader-dark-line">THE PAGE IS DARK — no source could serve this passage.</p>
          <div className="gx-reader-dark-acts">
            <button className="gx-dark-act" onClick={() => setRetry((n) => n + 1)}>⟳ TRY AGAIN</button>
            <button className="gx-dark-act" onClick={() => setState({ panel: "library" })}>❖ THE SHELVES</button>
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
                (current && cursor.verse === v.n ? " is-focus" : "")
              }
              onClick={() => goTo({ verse: cursor.verse === v.n ? null : v.n })}
            >
              <span className="gx-vn" aria-hidden>{v.n}</span>
              {divineName ? <DivineText text={v.text} /> : v.text}
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
