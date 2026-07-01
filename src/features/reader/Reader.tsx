// The Reader — the sacred center. Serif, serene, honey-flowing. Zero
// console chrome inside the column: navigation is quiet marginal arrows,
// instruments live at the edges, the omnibar is the door.

import { useEffect, useState } from "react";
import { useApp, goTo } from "@/kernel/store";
import { getChapter, bookById, type Chapter } from "@/engine/corpus";
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
  const book = bookById.get(cursor.bookId);

  useEffect(() => {
    let live = true;
    setError(null);
    getChapter(cursor.translation, cursor.bookId, cursor.chapter)
      .then((c) => { if (live) { setCh(c); } })
      .catch((e) => { if (live) setError(String(e)); });
    return () => { live = false; };
  }, [cursor.translation, cursor.bookId, cursor.chapter]);

  // The eye goes up on a chapter turn; the machine follows.
  useEffect(() => {
    document.querySelector(".gx-scripture")?.scrollTo({ top: 0 });
  }, [cursor.bookId, cursor.chapter]);

  const red = redLetter ? redLetterVerses(cursor.bookId, cursor.chapter) : null;

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
        <p className="gx-reader-dark">
          THE PAGE IS DARK — no source could serve this passage.
          <span className="gx-reader-err">{error}</span>
        </p>
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
                (cursor.verse === v.n ? " is-focus" : "")
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
