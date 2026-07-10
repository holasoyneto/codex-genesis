// WORD STUDY — one word, weighed. The whole bundled KJV is scanned in
// memory: frequency by book (a quiet bar chart of plain divs), the first
// occurrences, and every verse — each one a door to the reader. An
// optional theology pull asks the Oracle; without an engine it stays
// honestly quiet.

import { useEffect, useMemo, useRef, useState } from "react";
import { closePanel, goTo } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { takeSeed } from "@/kernel/seeds";
import { BOOKS, bookById, bundleChapters } from "@/engine/corpus";
import { askOracleStream } from "@/engine/oracle";
import "./wordstudy.css";

interface Hit { bookId: string; chapter: number; verse: number; text: string }
interface Study {
  term: string;
  total: number;
  byBook: { bookId: string; name: string; count: number }[];
  hits: Hit[];
}

const BOOK_ORDER = new Map(BOOKS.map((b, i) => [b.id, i]));

async function studyWord(term: string): Promise<Study> {
  const chapters = await bundleChapters("kjv");
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  const counts = new Map<string, number>();
  const hits: Hit[] = [];
  // Bundle keys are "gen.1" — sort into canonical order so "first
  // occurrences" means first in the canon, not first in JSON key order.
  const keys = Object.keys(chapters).sort((a, b) => {
    const [ab, ac] = a.split(".");
    const [bb, bc] = b.split(".");
    return (BOOK_ORDER.get(ab) ?? 99) - (BOOK_ORDER.get(bb) ?? 99) || Number(ac) - Number(bc);
  });
  for (const key of keys) {
    const [bookId, chStr] = key.split(".");
    const chapter = Number(chStr);
    for (const v of chapters[key]) {
      const n = (v.text.match(re) ?? []).length;
      if (n > 0) {
        counts.set(bookId, (counts.get(bookId) ?? 0) + n);
        hits.push({ bookId, chapter, verse: v.n, text: v.text });
      }
    }
  }
  const byBook = [...counts.entries()]
    .map(([bookId, count]) => ({ bookId, name: bookById.get(bookId)?.name ?? bookId, count }))
    .sort((a, b) => b.count - a.count);
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  return { term, total, byBook, hits };
}

const VERSE_CAP = 100;

export function WordStudy() {
  const inWindow = useInWindow();
  const [term, setTerm] = useState<string>(() => takeSeed("wordstudy") ?? "");
  const [input, setInput] = useState("");
  const [study, setStudy] = useState<Study | "working" | "failed" | null>(null);
  const [oracle, setOracle] = useState<{ state: "idle" | "asking" | "done"; text: string; err: string | null }>(
    { state: "idle", text: "", err: null },
  );
  const oracleRun = useRef(0);

  useEffect(() => {
    if (!term.trim()) { setStudy(null); return; }
    let live = true;
    setStudy("working");
    setOracle({ state: "idle", text: "", err: null });
    studyWord(term.trim())
      .then((s) => { if (live) setStudy(s); })
      .catch(() => { if (live) setStudy("failed"); });
    return () => { live = false; };
  }, [term]);

  const submit = () => { if (input.trim()) { setTerm(input.trim()); setInput(""); } };

  const askTheology = () => {
    if (typeof study !== "object" || study === null) return;
    const run = ++oracleRun.current;
    setOracle({ state: "asking", text: "", err: null });
    askOracleStream(
      `Why does the biblical word "${study.term}" matter theologically? ` +
      `It occurs ${study.total} times in the KJV. One tight paragraph (110–160 words), ` +
      `plain prose, scripture-faithful, ecumenical — no headings, no bullets.`,
      [],
      {
        onDelta: (t) => { if (oracleRun.current === run) setOracle((o) => ({ ...o, text: o.text + t })); },
        onTool: () => {},
      },
    )
      .then(() => { if (oracleRun.current === run) setOracle((o) => ({ ...o, state: "done" })); })
      .catch((e: unknown) => {
        if (oracleRun.current === run) setOracle((o) => ({ ...o, state: "done", err: String(e instanceof Error ? e.message : e) }));
      });
  };

  const maxCount = useMemo(
    () => (typeof study === "object" && study !== null ? study.byBook.reduce((m, b) => Math.max(m, b.count), 0) : 0),
    [study],
  );

  return (
    <div className="gx-wordstudy" role="region" aria-label="Word Study">
      <h2 className="gx-wordstudy-title">WORD STUDY</h2>

      <div className="gx-wordstudy-ask">
        <input
          className="gx-wordstudy-input"
          placeholder="love · grace · shepherd …"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          spellCheck={false}
          aria-label="Word to study"
        />
        <button className="gx-wordstudy-go" onClick={submit}>STUDY</button>
      </div>

      {!term.trim() ? (
        <p className="gx-wordstudy-hint">
          Give it one word. It reads the whole bundled KJV and returns the
          word's weight: frequency by book, first occurrences, every verse.
        </p>
      ) : study === "working" ? (
        <p className="gx-wordstudy-wait">Reading the whole corpus…</p>
      ) : study === "failed" ? (
        <p className="gx-wordstudy-none">The bundled corpus could not be read.</p>
      ) : study === null ? null : study.total === 0 ? (
        <p className="gx-wordstudy-none">“{study.term}” does not occur in the bundled KJV (whole words only).</p>
      ) : (
        <>
          <header className="gx-wordstudy-hero">
            <span className="gx-wordstudy-word">{study.term}</span>
            <span className="gx-wordstudy-tally">
              {study.total.toLocaleString()} occurrences · {study.byBook.length} book{study.byBook.length === 1 ? "" : "s"} · {study.hits.length.toLocaleString()} verses
            </span>
          </header>

          <h3 className="gx-wordstudy-subtitle">FREQUENCY BY BOOK</h3>
          <ul className="gx-wordstudy-bars">
            {study.byBook.slice(0, 18).map((b) => (
              <li key={b.bookId} className="gx-wordstudy-bar-row">
                <span className="gx-wordstudy-bar-name">{b.name}</span>
                <span className="gx-wordstudy-bar-track">
                  <span
                    className="gx-wordstudy-bar-fill"
                    style={{ width: `${maxCount ? Math.max(2, Math.round((b.count / maxCount) * 100)) : 0}%` }}
                  />
                </span>
                <span className="gx-wordstudy-bar-count">{b.count}</span>
              </li>
            ))}
          </ul>
          {study.byBook.length > 18 ? (
            <p className="gx-wordstudy-hint">…and {study.byBook.length - 18} more books.</p>
          ) : null}

          <h3 className="gx-wordstudy-subtitle">FIRST OCCURRENCES</h3>
          <ul className="gx-wordstudy-verses">
            {study.hits.slice(0, 5).map((h) => (
              <VerseRow key={`${h.bookId}.${h.chapter}.${h.verse}`} hit={h} term={study.term} />
            ))}
          </ul>

          <h3 className="gx-wordstudy-subtitle">EVERY VERSE</h3>
          <ul className="gx-wordstudy-verses">
            {study.hits.slice(0, VERSE_CAP).map((h) => (
              <VerseRow key={`all.${h.bookId}.${h.chapter}.${h.verse}`} hit={h} term={study.term} />
            ))}
          </ul>
          {study.hits.length > VERSE_CAP ? (
            <p className="gx-wordstudy-hint">
              Showing the first {VERSE_CAP} of {study.hits.length.toLocaleString()} verses — narrow the word to see them all.
            </p>
          ) : null}

          <h3 className="gx-wordstudy-subtitle">WHY IT MATTERS</h3>
          {oracle.state === "idle" ? (
            <button className="gx-wordstudy-oracle-go" onClick={askTheology}>ASK THE ORACLE</button>
          ) : oracle.err && !oracle.text ? (
            <p className="gx-wordstudy-hint">The Oracle is not available — {oracle.err}</p>
          ) : (
            <blockquote className="gx-wordstudy-theology">
              {oracle.text || "…"}
              {oracle.state === "asking" ? <span className="gx-wordstudy-cursor">▌</span> : null}
            </blockquote>
          )}
        </>
      )}

      {inWindow ? null : (
        <button className="gx-wordstudy-close" aria-label="Close word study" onClick={() => closePanel()}>×</button>
      )}
    </div>
  );
}

function VerseRow({ hit, term }: { hit: Hit; term: string }) {
  const name = bookById.get(hit.bookId)?.name ?? hit.bookId;
  // Split the verse text on the studied word so matches render emphasized
  // without dangerouslySetInnerHTML.
  const re = new RegExp(`(\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "gi");
  const parts = hit.text.split(re);
  return (
    <li>
      <button
        className="gx-wordstudy-verse-row"
        title="open this verse in the reader"
        onClick={() => goTo({ bookId: hit.bookId, chapter: hit.chapter, verse: hit.verse })}
      >
        <span className="gx-wordstudy-verse-ref">{name} {hit.chapter}:{hit.verse}</span>
        <span className="gx-wordstudy-verse-text">
          {parts.map((p, i) => (p.toLowerCase() === term.toLowerCase()
            ? <em key={i} className="gx-wordstudy-mark">{p}</em>
            : <span key={i}>{p}</span>))}
        </span>
      </button>
    </li>
  );
}
