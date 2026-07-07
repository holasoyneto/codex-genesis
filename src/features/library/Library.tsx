// The shelves — books first (the reason anyone opens the library), the
// translations lane below. Every book is a row; click opens its chapter
// grid in place; click a chapter and the reader jumps — one gesture deep,
// same panel, no dead end. Source lights are honest: ● the active
// translation carries this book · ◐ another corpus in the registry does
// (the reader auto-serves from there) · ○ no known source yet.

import { useEffect, useMemo, useState } from "react";
import { useApp, goTo, closePanel, openVeil } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { BOOKS, covers, allTranslations, type Book } from "@/engine/corpus";
import { loadTraditions, tagsFor, TRADITION_LABEL, getLoadedTraditions } from "@/engine/traditions";
import { Provenance } from "@/kernel/Provenance";
import "./library.css";

const SHELVES: { key: Book["testament"]; label: string }[] = [
  { key: "OT", label: "THE OLD TESTAMENT" },
  { key: "NT", label: "THE NEW TESTAMENT" },
  { key: "DC", label: "APOCRYPHA & BEYOND" },
];

function sourceLight(bookId: string, activeId: string): "own" | "other" | "none" {
  const active = allTranslations().find((t) => t.id === activeId);
  if (active && covers(active, bookId)) return "own";
  if (allTranslations().some((t) => covers(t, bookId))) return "other";
  return "none";
}

export function Library() {
  const cursor = useApp((s) => s.cursor);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(cursor.bookId);
  const [tradition, setTradition] = useState<string | null>(null);
  const [tradReady, setTradReady] = useState(false);

  useEffect(() => {
    let live = true;
    loadTraditions().then(() => { if (live) setTradReady(true); }).catch(() => { /* shelves stand alone */ });
    return () => { live = false; };
  }, []);

  const needle = q.trim().toLowerCase();
  const shelves = useMemo(
    () =>
      SHELVES.map((shelf) => ({
        ...shelf,
        books: BOOKS.filter(
          (b) =>
            b.testament === shelf.key &&
            (!needle || b.name.toLowerCase().includes(needle) || b.id.includes(needle)) &&
            (!tradition || tagsFor(b.id).includes(tradition))
        ),
      })).filter((s) => s.books.length),
    [needle, tradition, tradReady]
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

      {tradReady ? (
        <>
          <div className="gx-traditions" role="group" aria-label="Tradition filter">
            {Object.entries(TRADITION_LABEL).map(([tag, label]) => (
              <button
                key={tag}
                className={"gx-tradition" + (tradition === tag ? " is-active" : "")}
                aria-pressed={tradition === tag}
                onClick={() => setTradition(tradition === tag ? null : tag)}
              >{label}</button>
            ))}
          </div>
          <p className="gx-book-tags-legend">
            ⚬ each dot on a book row = one tradition includes it — hover for names
          </p>
        </>
      ) : null}

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
                    {tradReady && tagsFor(b.id).length ? (
                      <span
                        className="gx-book-tags"
                        title={tagsFor(b.id).map((t) => TRADITION_LABEL[t] ?? t).join(" · ")}
                      >
                        {tagsFor(b.id).map((t) => <i key={t} className="gx-book-tag" />)}
                      </span>
                    ) : <span />}
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

      {/* v1.2.0 — the Library lost translation duties (DESIGN §III: one
          act, one control per surface). It keeps books, canons and
          traditions; the ONE voices surface is a single door away. */}
      <h3 className="gx-library-sub">TRANSLATION</h3>
      <button
        className="gx-library-voices"
        onClick={() => openVeil("reader", "trans")}
      >
        <span className="gx-library-voices-name">Voices…</span>
        <span className="gx-library-voices-hint">
          my shelf · the world catalog — reading now: {cursor.translation.replace(/^bolls:/, "").toUpperCase()}
        </span>
      </button>
      {tradReady && getLoadedTraditions() ? (
        <Provenance label="CANON REGISTRY · OPEN-CANON" meta={getLoadedTraditions()!._meta} />
      ) : null}
      {useInWindow() ? null : (
        <button
          className="gx-library-close"
          aria-label="Close library"
          onClick={() => closePanel()}
        >×</button>
      )}
    </div>
  );
}
