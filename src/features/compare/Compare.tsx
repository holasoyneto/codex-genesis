// Compare — one verse, every voice that carries it. Lanes come from the
// engine's translation registry filtered by coverage; the original
// tongues sit beside the English without ceremony.

import { useEffect, useState } from "react";
import { useApp, setState } from "@/kernel/store";
import { TRANSLATIONS, covers, getChapter, bookById } from "@/engine/corpus";
import "./compare.css";

interface Lane { id: string; name: string; text: string | null }

export function Compare() {
  const cursor = useApp((s) => s.cursor);
  const verse = cursor.verse ?? 1;
  const [lanes, setLanes] = useState<Lane[] | null>(null);
  const here = bookById.get(cursor.bookId);

  useEffect(() => {
    let live = true;
    setLanes(null);
    const able = TRANSLATIONS.filter((t) => covers(t, cursor.bookId));
    Promise.all(
      able.map(async (t): Promise<Lane> => {
        try {
          const ch = await getChapter(t.id, cursor.bookId, cursor.chapter);
          // Only lanes truly served by the corpus asked for — a routed
          // substitution would silently duplicate another lane.
          if (ch.translation !== t.id) return { id: t.id, name: t.name, text: null };
          return { id: t.id, name: t.name, text: ch.verses.find((v) => v.n === verse)?.text ?? null };
        } catch {
          return { id: t.id, name: t.name, text: null };
        }
      })
    ).then((ls) => { if (live) setLanes(ls.filter((l) => l.text)); });
    return () => { live = false; };
  }, [cursor.bookId, cursor.chapter, verse]);

  return (
    <div className="gx-compare" role="region" aria-label="Compare translations">
      <h2 className="gx-compare-title">COMPARE</h2>
      <p className="gx-compare-here">
        {here?.name} {cursor.chapter}:{verse}
        {cursor.verse == null ? <span className="gx-compare-hint"> — tap a verse to follow it</span> : null}
      </p>
      {lanes === null ? (
        <p className="gx-compare-wait">…</p>
      ) : (
        <ul className="gx-compare-lanes">
          {lanes.map((l) => (
            <li key={l.id} className="gx-lane">
              <span className="gx-lane-name">{l.name}</span>
              <p className="gx-lane-text" dir="auto">{l.text}</p>
            </li>
          ))}
        </ul>
      )}
      <button
        className="gx-compare-close"
        aria-label="Close compare"
        onClick={() => setState({ panel: null })}
      >×</button>
    </div>
  );
}
