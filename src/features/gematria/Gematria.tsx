// Gematria — Hebrew, Greek, and English numerology for a word or phrase.
// Defaults to the verse under the cursor; "find matches" scans a bounded
// slice of the corpus (current book only) lazily, on request, so it never
// freezes the UI or precomputes a whole-corpus index at load.

import { useEffect, useMemo, useState } from "react";
import { useApp, closePanel } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { Ref } from "@/kernel/Ref";
import { takeSeed } from "@/kernel/seeds";
import { bookById, getChapter } from "@/engine/corpus";
import { computeGematria, gematriaRows, detectLang, type GematriaResult } from "./compute";
import "./gematria.css";

interface MatchHit { bookId: string; chapter: number; verse: number; word: string }

// Tokenize verse text into words, dropping short noise tokens the way the
// og index did (english words need length ≥ 4 to avoid "the"/"a" noise).
function tokenize(text: string): string[] {
  return (text || "")
    .replace(/[֑-ֽֿׁ-ׇ׳״]/g, "")
    .split(/[\s.,;:!?·"׳״«»()[\]{}‐-—]+/)
    .filter((w) => w.length >= 2);
}

const MAX_CHAPTERS_SCANNED = 30; // bound the scan — current book, capped

export function Gematria() {
  const cursor = useApp((s) => s.cursor);
  const here = bookById.get(cursor.bookId);

  const [input, setInput] = useState<string>(() => takeSeed("gematria") ?? "");
  const [verseText, setVerseText] = useState<string | null>(null);
  const [loadingVerse, setLoadingVerse] = useState(true);

  const [matchesFor, setMatchesFor] = useState<{ key: string; value: number } | null>(null);
  const [matches, setMatches] = useState<MatchHit[] | "loading" | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);

  // Default text — the verse under the cursor, mirroring compare/Compare.tsx.
  useEffect(() => {
    let live = true;
    setLoadingVerse(true);
    setVerseText(null);
    getChapter(cursor.translation, cursor.bookId, cursor.chapter)
      .then((ch) => {
        if (!live) return;
        const v = cursor.verse != null ? ch.verses.find((x) => x.n === cursor.verse) : ch.verses[0];
        setVerseText(v?.text ?? null);
        setLoadingVerse(false);
      })
      .catch(() => { if (live) { setVerseText(null); setLoadingVerse(false); } });
    return () => { live = false; };
  }, [cursor.translation, cursor.bookId, cursor.chapter, cursor.verse]);

  const text = input.trim() || verseText || "";
  const lang = useMemo(() => detectLang(text), [text]);
  const result: GematriaResult | null = useMemo(() => (text ? computeGematria(text, lang) : null), [text, lang]);
  const rows = useMemo(() => (result ? gematriaRows(result) : []), [result]);

  // Clear any stale match results when the underlying text changes.
  useEffect(() => { setMatchesFor(null); setMatches(null); setScanNote(null); }, [text]);

  async function findMatches(key: string, value: number) {
    if (!value) return;
    setMatchesFor({ key, value });
    setMatches("loading");
    setScanNote(null);
    const system =
      lang === "hebrew" ? "hechrachi" : lang === "greek" ? "isopsephy" : "en_ordinal";
    const scoreFn =
      system === "hechrachi"
        ? (w: string) => (detectLang(w) === "hebrew" ? computeGematria(w, "hebrew") : null)
        : system === "isopsephy"
        ? (w: string) => (detectLang(w) === "greek" ? computeGematria(w, "greek") : null)
        : (w: string) => (w.length >= 4 && detectLang(w) === "english" ? computeGematria(w, "english") : null);

    const book = bookById.get(cursor.bookId);
    const total = book?.chapters ?? 1;
    const scanCount = Math.min(total, MAX_CHAPTERS_SCANNED);
    const hits: MatchHit[] = [];
    for (let c = 1; c <= scanCount; c++) {
      try {
        const ch = await getChapter(cursor.translation, cursor.bookId, c);
        for (const v of ch.verses) {
          for (const tok of tokenize(v.text)) {
            const r = scoreFn(tok);
            if (!r) continue;
            const rv =
              r.lang === "hebrew" ? r.hechrachi : r.lang === "greek" ? r.isopsephy : r.ordinal;
            if (rv === value) hits.push({ bookId: cursor.bookId, chapter: c, verse: v.n, word: tok });
            if (hits.length >= 40) break;
          }
          if (hits.length >= 40) break;
        }
      } catch {
        // one chapter failing to fetch shouldn't abort the whole scan
      }
      if (hits.length >= 40) break;
    }
    setMatches(hits);
    setScanNote(
      total > scanCount
        ? `scanned ${scanCount} of ${total} chapters in ${book?.name ?? cursor.bookId} — limited scope`
        : `scanned all ${scanCount} chapters in ${book?.name ?? cursor.bookId}`
    );
  }

  return (
    <div className="gx-gematria" role="region" aria-label="Gematria">
      <h2 className="gx-gematria-title">GEMATRIA</h2>

      <input
        className="gx-gematria-input"
        placeholder="a word or phrase — leave blank to use the verse below"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        dir="auto"
      />

      <p className="gx-gematria-here">
        {here?.name} {cursor.chapter}
        {cursor.verse != null ? `:${cursor.verse}` : ""}
        {cursor.verse == null ? <span className="gx-gematria-hint"> — tap a verse to follow it</span> : null}
      </p>

      {!input.trim() && loadingVerse ? <p className="gx-gematria-wait">…</p> : null}
      {!input.trim() && !loadingVerse && !verseText ? (
        <p className="gx-gematria-wait">No verse text available here.</p>
      ) : null}

      {text ? (
        <>
          <p className="gx-gematria-text" dir="auto">{text}</p>
          <p className="gx-gematria-lang">{lang}</p>
          <ul className="gx-gematria-rows">
            {rows.map((r) => (
              <li key={r.key} className="gx-gematria-row">
                <span className="gx-gematria-row-label">{r.label}</span>
                <button
                  className="gx-gematria-row-value"
                  onClick={() => findMatches(r.key, r.value)}
                  title="Find other words/verses sharing this value"
                >
                  {r.value}
                </button>
              </li>
            ))}
          </ul>

          {matchesFor ? (
            <div className="gx-gematria-matches">
              <h3 className="gx-gematria-matches-title">MATCHES · value {matchesFor.value}</h3>
              {matches === "loading" ? <p className="gx-gematria-wait">computing…</p> : null}
              {Array.isArray(matches) && matches.length === 0 ? (
                <p className="gx-gematria-wait">No matches found in the scanned range.</p>
              ) : null}
              {Array.isArray(matches) && matches.length > 0 ? (
                <ul className="gx-gematria-hits">
                  {matches.map((m, i) => (
                    <li key={`${m.bookId}.${m.chapter}.${m.verse}.${i}`} className="gx-gematria-hit">
                      <span className="gx-gematria-hit-word" dir="auto">{m.word}</span>
                      <Ref bookId={m.bookId} chapter={m.chapter} verse={m.verse} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {scanNote ? <p className="gx-gematria-scannote">{scanNote}</p> : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="gx-gematria-wait">Type a word or phrase, or navigate to a verse.</p>
      )}

      {useInWindow() ? null : (
        <button
          className="gx-gematria-close"
          aria-label="Close gematria"
          onClick={() => closePanel()}
        >×</button>
      )}
    </div>
  );
}
