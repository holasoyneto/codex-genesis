// The shelves — books first (the reason anyone opens the library), the
// translations lane below. Every book is a row; click opens its chapter
// grid in place; click a chapter and the reader jumps — one gesture deep,
// same panel, no dead end. Source lights are honest: ● the active
// translation carries this book · ◐ another corpus in the registry does
// (the reader auto-serves from there) · ○ no known source yet.

import { useMemo, useState } from "react";
import { useApp, goTo, closePanel } from "@/kernel/store";
import { TRANSLATIONS, BOOKS, covers, type Book } from "@/engine/corpus";
import "./library.css";

const SHELVES: { key: Book["testament"]; label: string }[] = [
  { key: "OT", label: "THE OLD TESTAMENT" },
  { key: "NT", label: "THE NEW TESTAMENT" },
  { key: "DC", label: "APOCRYPHA & BEYOND" },
];

function sourceLight(bookId: string, activeId: string): "own" | "other" | "none" {
  const active = TRANSLATIONS.find((t) => t.id === activeId);
  if (active && covers(active, bookId)) return "own";
  if (TRANSLATIONS.some((t) => covers(t, bookId))) return "other";
  return "none";
}

export function Library() {
  const cursor = useApp((s) => s.cursor);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(cursor.bookId);

  const needle = q.trim().toLowerCase();
  const shelves = useMemo(
    () =>
      SHELVES.map((shelf) => ({
        ...shelf,
        books: BOOKS.filter(
          (b) =>
            b.testament === shelf.key &&
            (!needle || b.name.toLowerCase().includes(needle) || b.id.includes(needle))
        ),
      })).filter((s) => s.books.length),
    [needle]
  );

  const jump = (bookId: string, chapter: number) => goTo({ bookId, chapter, verse: null });

  return (
    <div className="gx-library" role="region" aria-label="Library">
      <h2 className="gx-library-title">THE SHELVES</h2>

      <input
        className="gx-library-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter books…"
        aria-label="Filter books"
        spellCheck={false}
      />

      <div className="gx-books">
        {shelves.map((shelf) => (
          <section key={shelf.key} className="gx-bookshelf">
            <h3 className="gx-bookshelf-h">{shelf.label}</h3>
            {shelf.books.map((b) => {
              const active = b.id === cursor.bookId;
              const open = b.id === openId;
              const light = sourceLight(b.id, cursor.translation);
              return (
                <div key={b.id} className={"gx-book" + (open ? " is-open" : "")}>
                  <button
                    className={"gx-book-row" + (active ? " is-active" : "")}
                    onClick={() => setOpenId(open ? null : b.id)}
                    aria-expanded={open}
                  >
                    <span
                      className={`gx-book-light is-${light}`}
                      aria-hidden
                      title={
                        light === "own"
                          ? `In ${cursor.translation.toUpperCase()}`
                          : light === "other"
                            ? "Served from another corpus"
                            : "No known source yet"
                      }
                    />
                    <span className="gx-book-name">{b.name}</span>
                    <span className="gx-book-meta">{active ? `${cursor.chapter} / ${b.chapters}` : b.chapters}</span>
                  </button>
                  {open ? (
                    <div className="gx-chs" role="group" aria-label={`${b.name} chapters`}>
                      {Array.from({ length: b.chapters }, (_, i) => i + 1).map((ch) => (
                        <button
                          key={ch}
                          className={"gx-ch" + (active && ch === cursor.chapter ? " is-active" : "")}
                          onClick={() => jump(b.id, ch)}
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        ))}
        {!shelves.length ? <p className="gx-library-note">No book matches “{q}”.</p> : null}
      </div>

      <h3 className="gx-library-sub">TRANSLATION</h3>
      <ul className="gx-shelves">
        {TRANSLATIONS.map((t) => (
          <li key={t.id}>
            <button
              className={"gx-shelf" + (t.id === cursor.translation ? " is-active" : "")}
              onClick={() => goTo({ translation: t.id })}
              aria-pressed={t.id === cursor.translation}
            >
              <span className="gx-shelf-light" data-src={t.bundled ? "bundle" : "network"} aria-hidden>
                {t.bundled ? "●" : "○"}
              </span>
              <span className="gx-shelf-name">{t.name}</span>
              <span className="gx-shelf-lang">{t.lang}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="gx-library-note">
        ● baked in — read without a connection · ○ fetched, then kept
      </p>
      <button
        className="gx-library-close"
        aria-label="Close library"
        onClick={() => closePanel()}
      >×</button>
    </div>
  );
}
