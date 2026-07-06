// Search — the door's long arm. Free text in the omnibar lands here;
// every hit walks straight into the reader.

import { useEffect, useState } from "react";
import { useApp, closePanel } from "@/kernel/store";
import { Ref } from "@/kernel/Ref";
import { searchScripture, type SearchHit } from "@/engine/search";
import { record } from "@/kernel/witness";
import "./search.css";

// Seed passes from the omnibar through module state — panels carry no
// payload in the store (they are surfaces, not messages).
let seedQuery = "";
export function setSearchSeed(q: string): void { seedQuery = q; }

function Snippet({ text }: { text: string }) {
  const parts = text.split(/<\/?mark>/);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <b key={i} className="gx-hit-match">{p}</b> : <span key={i}>{p}</span>))}
    </>
  );
}

export function Search() {
  const translation = useApp((s) => s.cursor.translation);
  const [q, setQ] = useState(seedQuery);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [state, setSearchState] = useState<"idle" | "busy" | "failed">("idle");

  useEffect(() => {
    if (!q.trim()) { setHits(null); setSearchState("idle"); return; }
    let live = true;
    setSearchState("busy");
    const t = setTimeout(() => {
      searchScripture(translation, q.trim())
        .then((h) => { if (live) { setHits(h); setSearchState("idle"); if (!h.length) record("search-empty", q.trim()); } })
        .catch(() => { if (live) setSearchState("failed"); });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [q, translation]);

  return (
    <div className="gx-search" role="region" aria-label="Search">
      <h2 className="gx-search-title">SEARCH</h2>
      <input
        className="gx-search-input"
        value={q}
        placeholder="Search the whole of Scripture…"
        onChange={(e) => setQ(e.target.value)}
        spellCheck={false}
        autoFocus
      />
      {state === "failed" ? (
        <p className="gx-search-note">The search source did not answer — try again.</p>
      ) : state === "busy" ? (
        <p className="gx-search-note">…</p>
      ) : hits && !hits.length ? (
        <p className="gx-search-note">Nothing found for “{q}”.</p>
      ) : (
        <ul className="gx-search-rows">
          {(hits ?? []).map((h, i) => (
            <li key={i} className="gx-hit">
              <Ref
                bookId={h.bookId}
                chapter={h.chapter}
                verse={h.verse}
                className="gx-hit-ref"
                detail={<span className="gx-hit-text"><Snippet text={h.text} /></span>}
              />
            </li>
          ))}
        </ul>
      )}
      <button
        className="gx-search-close"
        aria-label="Close search"
        onClick={() => closePanel()}
      >×</button>
    </div>
  );
}
