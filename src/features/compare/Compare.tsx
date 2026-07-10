// Compare — one verse, every voice that carries it. Lanes come from the
// engine's translation registry filtered by coverage; the original
// tongues sit beside the English without ceremony.

import { useEffect, useState } from "react";
import { useApp, closePanel } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { Ref } from "@/kernel/Ref";
import { TRANSLATIONS, covers, getChapter, bookById } from "@/engine/corpus";
import { parallelsAt, type ParallelHit } from "@/engine/synoptic";
import { takeSeed } from "@/kernel/seeds";
import "./compare.css";

interface Lane { id: string; name: string; texts: Record<number, string | null> }

function collapseRuns(nums: number[]): string {
  const sorted = [...nums].sort((a, b) => a - b);
  const runs: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    runs.push(i === j ? `${sorted[i]}` : `${sorted[i]}–${sorted[j]}`);
    i = j + 1;
  }
  return runs.join(", ");
}

export function Compare() {
  const cursor = useApp((s) => s.cursor);
  // A reader selection may seed several verses at once — the Reader's
  // action bar hands them off exactly once (setSeed/takeSeed), same lane
  // as every other panel seed. No seed → the old single-cursor-verse
  // behavior stands untouched.
  const [seedVerses] = useState<number[] | null>(() => {
    const raw = takeSeed("compare");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { verses?: unknown };
      const vs = Array.isArray(parsed.verses) ? parsed.verses.filter((n): n is number => typeof n === "number") : [];
      return vs.length ? [...new Set(vs)].sort((a, b) => a - b) : null;
    } catch {
      return null;
    }
  });
  const multi = seedVerses !== null && seedVerses.length > 1;
  const verses = seedVerses ?? [cursor.verse ?? 1];
  const verse = verses[0];
  const [lanes, setLanes] = useState<Lane[] | null>(null);
  const [parallels, setParallels] = useState<ParallelHit | null>(null);
  const here = bookById.get(cursor.bookId);

  // A quiet parallels row when the cursor sits in an aligned pericope —
  // single-verse mode only (a multi-verse hold has no one pericope).
  useEffect(() => {
    if (multi) return;
    let live = true;
    setParallels(null);
    parallelsAt(cursor.bookId, cursor.chapter, cursor.verse)
      .then((p) => { if (live) setParallels(p); })
      .catch(() => { /* the lanes stand on their own */ });
    return () => { live = false; };
  }, [multi, cursor.bookId, cursor.chapter, cursor.verse]);

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
          if (ch.translation !== t.id) return { id: t.id, name: t.name, texts: {} };
          const texts: Record<number, string | null> = {};
          for (const n of verses) texts[n] = ch.verses.find((v) => v.n === n)?.text ?? null;
          return { id: t.id, name: t.name, texts };
        } catch {
          return { id: t.id, name: t.name, texts: {} };
        }
      })
    ).then((ls) => { if (live) setLanes(ls.filter((l) => verses.some((n) => l.texts[n]))); });
    return () => { live = false; };
  }, [cursor.bookId, cursor.chapter, verses.join(",")]);

  return (
    <div className="gx-compare" role="region" aria-label="Compare translations">
      <h2 className="gx-compare-title">COMPARE</h2>
      <p className="gx-compare-here">
        {multi
          ? `${here?.name} ${cursor.chapter}:${collapseRuns(verses)}`
          : <>{here?.name} {cursor.chapter}:{verse}
              {cursor.verse == null ? <span className="gx-compare-hint"> — tap a verse to follow it</span> : null}
            </>}
      </p>
      {parallels ? (
        <div className="gx-compare-parallels">
          <span className="gx-compare-parallels-name">parallels · {parallels.pericope.title}</span>
          <div className="gx-compare-parallels-row">
            {parallels.parallels.map((p) => (
              <Ref key={p.gospel} bookId={p.bookId} chapter={p.chapter} verse={p.verse} />
            ))}
          </div>
        </div>
      ) : null}
      {lanes === null ? (
        <p className="gx-compare-wait">…</p>
      ) : multi ? (
        <div className="gx-compare-multi">
          {verses.map((n) => (
            <div key={n} className="gx-compare-vgroup">
              <h3 className="gx-compare-vgroup-ref">{here?.name} {cursor.chapter}:{n}</h3>
              <ul className="gx-compare-lanes">
                {lanes.filter((l) => l.texts[n]).map((l) => (
                  <li key={l.id} className="gx-lane">
                    <span className="gx-lane-name">{l.name}</span>
                    <p className="gx-lane-text" dir="auto">{l.texts[n]}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="gx-compare-lanes">
          {lanes.map((l) => (
            <li key={l.id} className="gx-lane">
              <span className="gx-lane-name">{l.name}</span>
              <p className="gx-lane-text" dir="auto">{l.texts[verse]}</p>
            </li>
          ))}
        </ul>
      )}
      {useInWindow() ? null : (
        <button
          className="gx-compare-close"
          aria-label="Close compare"
          onClick={() => closePanel()}
        >×</button>
      )}
    </div>
  );
}
