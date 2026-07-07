// The palm's nav sheet — the pill's two doors. "book": canon-sectioned
// book list, then a chapter grid, one tap each. "trans": every voice, one
// tap. A quick A- / A+ row tunes the type. Two taps to anywhere.

import { useState } from "react";
import { useApp, goTo, closeVeil, setState, whisper } from "@/kernel/store";
import { BOOKS, TRANSLATIONS, bookById, covers, type Book } from "@/engine/corpus";
import "./navsheet.css";

const SHELVES: { key: Book["testament"] | "BYD"; label: string }[] = [
  { key: "OT", label: "OLD TESTAMENT" },
  { key: "NT", label: "NEW TESTAMENT" },
  { key: "DC", label: "APOCRYPHA" },
  { key: "BYD", label: "BEYOND" },
];

function scale(delta: number) {
  setState((s) => ({
    settings: {
      ...s.settings,
      scriptureScale: Math.min(26, Math.max(15, s.settings.scriptureScale + delta)),
    },
  }));
}

export function NavSheet({ seed }: { seed?: string }) {
  const cursor = useApp((s) => s.cursor);
  const size = useApp((s) => s.settings.scriptureScale);
  const [mode] = useState<"book" | "trans">(seed === "trans" ? "trans" : "book");
  const [pick, setPick] = useState<string | null>(null);
  const book = pick ? bookById.get(pick) : null;

  return (
    <div className="gx-navsheet glass glass-lg gx-enter" role="dialog" aria-label={mode === "book" ? "Book and chapter" : "Translation"}>
      <div className="gx-navsheet-top">
        <span className="gx-instrument-title">{mode === "book" ? (book ? book.name.toUpperCase() : "THE BOOKS") : "THE VOICES"}</span>
        <div className="gx-navsheet-size" role="group" aria-label="Text size">
          <button aria-label="Smaller text" onClick={() => scale(-1)}>A−</button>
          <span className="gx-navsheet-px">{size}</span>
          <button aria-label="Larger text" onClick={() => scale(1)}>A+</button>
        </div>
        <button className="gx-navsheet-x" aria-label="Close" onClick={closeVeil}>×</button>
      </div>

      {mode === "trans" ? (
        <div className="gx-navsheet-list">
          {TRANSLATIONS.map((t) => (
            <button
              key={t.id}
              className={"gx-navsheet-row" + (t.id === cursor.translation ? " is-active" : "")}
              onClick={() => {
                if (!covers(t, cursor.bookId)) {
                  whisper({ kind: "toast", title: `◇ ${t.name}`, body: "This book lives outside that corpus — the nearest voice that carries it will serve." });
                }
                goTo({ translation: t.id });
                closeVeil();
              }}
            >
              <span className="gx-navsheet-name">{t.name}</span>
              <span className="gx-navsheet-lang">{t.lang}</span>
              {t.id === cursor.translation ? <span className="gx-navsheet-dot" aria-hidden>●</span> : null}
            </button>
          ))}
        </div>
      ) : book ? (
        <>
          <button className="gx-navsheet-back" onClick={() => setPick(null)}>‹ all books</button>
          <div className="gx-navsheet-grid">
            {Array.from({ length: book.chapters }, (_, i) => (
              <button
                key={i}
                className={"gx-navsheet-ch" + (book.id === cursor.bookId && i + 1 === cursor.chapter ? " is-active" : "")}
                onClick={() => { goTo({ bookId: book.id, chapter: i + 1, verse: null }); closeVeil(); }}
              >{i + 1}</button>
            ))}
          </div>
        </>
      ) : (
        <div className="gx-navsheet-list">
          {SHELVES.map((shelf) => {
            const books = BOOKS.filter((b) => b.testament === shelf.key);
            if (!books.length) return null;
            return (
              <section key={shelf.key}>
                <h3 className="gx-navsheet-shelf">{shelf.label}</h3>
                {books.map((b) => (
                  <button
                    key={b.id}
                    className={"gx-navsheet-row" + (b.id === cursor.bookId ? " is-active" : "")}
                    onClick={() => setPick(b.id)}
                  >
                    <span className="gx-navsheet-name">{b.name}</span>
                    <span className="gx-navsheet-lang">{b.chapters}</span>
                  </button>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
