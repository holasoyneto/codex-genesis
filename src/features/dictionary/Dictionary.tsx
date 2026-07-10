// Bible Dictionary — Easton's + Smith's entries (bundled sample), searchable
// by term, with auto-suggested picks for the current chapter's proper
// nouns. Ported from the og dictionary.jsx panel onto this shell's
// conventions (module fetch pattern mirrors strongs/Strongs.tsx).

import { useEffect, useMemo, useState } from "react";
import { useApp, closePanel } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { takeSeed } from "@/kernel/seeds";
import { bookById, getChapter } from "@/engine/corpus";
import "./dictionary.css";

interface DictEntry {
  title: string;
  body: string;
  refs?: string[];
  smith?: string;
  source?: string;
}
interface DictModule {
  meta: { id?: string; name?: string; source?: string; entries?: number; refs?: number };
  entries: Record<string, DictEntry>;
}

// ── module loading — fetched once per session, offline from the bundle ───
let modPromise: Promise<DictModule> | null = null;
function loadDict(): Promise<DictModule> {
  if (!modPromise) {
    modPromise = fetch(`${import.meta.env.BASE_URL}data/modules/easton-sample.json`)
      .then((r) => { if (!r.ok) throw new Error(`easton-sample: ${r.status}`); return r.json(); })
      .catch((e) => { modPromise = null; throw e; });
  }
  return modPromise;
}

function entryMatchesQuery(key: string, entry: DictEntry, q: string): number {
  const ql = q.toLowerCase();
  const title = (entry.title || key).toLowerCase();
  if (title === ql) return 1000;
  if (title.startsWith(ql)) return 500 + (50 - Math.min(50, title.length));
  if (title.includes(ql)) return 200;
  if ((entry.body || "").toLowerCase().includes(ql)) return 20;
  return 0;
}

export function Dictionary() {
  const cursor = useApp((s) => s.cursor);
  const here = bookById.get(cursor.bookId);

  const [mod, setMod] = useState<DictModule | "loading" | "failed">("loading");
  const [query, setQuery] = useState<string>(() => takeSeed("dictionary") ?? "");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [chapterText, setChapterText] = useState<string[] | null>(null);

  useEffect(() => {
    let live = true;
    loadDict().then(
      (m) => { if (live) setMod(m); },
      () => { if (live) setMod("failed"); }
    );
    return () => { live = false; };
  }, []);

  // Current chapter's verse text — bounded to just this chapter, for the
  // auto-suggest strip.
  useEffect(() => {
    let live = true;
    setChapterText(null);
    getChapter(cursor.translation, cursor.bookId, cursor.chapter)
      .then((ch) => { if (live) setChapterText(ch.verses.map((v) => v.text)); })
      .catch(() => { if (live) setChapterText(null); });
    return () => { live = false; };
  }, [cursor.translation, cursor.bookId, cursor.chapter]);

  const entries = typeof mod === "object" ? mod.entries : {};
  const allKeys = useMemo(() => Object.keys(entries), [entries]);

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const scored: [string, number][] = [];
    for (const k of allKeys) {
      const s = entryMatchesQuery(k, entries[k], q);
      if (s > 0) scored.push([k, s]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    return scored.slice(0, 20).map((x) => x[0]);
  }, [query, allKeys, entries]);

  // Auto-suggest: capitalized words in the current chapter that match a
  // dictionary title — a simple proper-noun heuristic, bounded to this
  // chapter only.
  const suggestions = useMemo(() => {
    if (!chapterText || typeof mod !== "object") return [];
    const titleIndex = new Map<string, string>();
    for (const [k, e] of Object.entries(entries)) titleIndex.set((e.title || k).toLowerCase(), k);
    const hits = new Map<string, number>();
    for (const text of chapterText) {
      const tokens = String(text).match(/\b[A-Z][a-z]{2,}\b/g) || [];
      for (const t of tokens) {
        const k = titleIndex.get(t.toLowerCase());
        if (k) hits.set(k, (hits.get(k) || 0) + 1);
      }
    }
    return [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
  }, [chapterText, entries, mod]);

  const openEntry = entries[openKey ?? ""] ?? null;

  return (
    <div className="gx-dictionary" role="region" aria-label="Bible Dictionary">
      <h2 className="gx-dictionary-title">DICTIONARY</h2>
      <p className="gx-dictionary-note">
        Sample of Easton's &amp; Smith's Bible Dictionary — not the full public-domain text.
      </p>

      <input
        className="gx-dictionary-input"
        placeholder="Abraham · covenant · Bethlehem …"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpenKey(null); }}
      />

      {mod === "loading" ? <p className="gx-dictionary-wait">Loading dictionary…</p> : null}
      {mod === "failed" ? <p className="gx-dictionary-wait">Couldn't load the dictionary.</p> : null}

      {typeof mod === "object" && !openEntry ? (
        <>
          {!query.trim() && suggestions.length > 0 ? (
            <section className="gx-dictionary-picks">
              <div className="gx-dictionary-picks-h">Picks for {here?.name} {cursor.chapter}</div>
              <div className="gx-dictionary-picks-row">
                {suggestions.map((k) => (
                  <button key={k} className="gx-dictionary-pick" onClick={() => setOpenKey(k)}>
                    {entries[k].title}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {query.trim() ? (
            <section>
              <div className="gx-dictionary-section-h">Results</div>
              {searchResults.length === 0 ? (
                <p className="gx-dictionary-wait">No matches for "{query}" in the sample.</p>
              ) : (
                <ul className="gx-dictionary-results">
                  {searchResults.map((k) => (
                    <li key={k} className="gx-dictionary-result-row">
                      <button className="gx-dictionary-result-btn" onClick={() => setOpenKey(k)}>
                        <b>{entries[k].title}</b>
                        <span className="gx-dictionary-result-snippet">{(entries[k].body || "").slice(0, 110)}…</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {!query.trim() && suggestions.length === 0 ? (
            <p className="gx-dictionary-wait">Search above, or open a chapter with recognized names.</p>
          ) : null}
        </>
      ) : null}

      {openEntry ? (
        <article className="gx-dictionary-entry">
          <button className="gx-dictionary-back" onClick={() => setOpenKey(null)}>× close</button>
          <h3 className="gx-dictionary-entry-title">{openEntry.title}</h3>
          <p className="gx-dictionary-entry-body">{openEntry.body}</p>
          {openEntry.smith ? (
            <>
              <div className="gx-dictionary-section-h">Smith's</div>
              <p className="gx-dictionary-entry-body">{openEntry.smith}</p>
            </>
          ) : null}
        </article>
      ) : null}

      {useInWindow() ? null : (
        <button
          className="gx-dictionary-close"
          aria-label="Close dictionary"
          onClick={() => closePanel()}
        >×</button>
      )}
    </div>
  );
}
