// The <Ref> chip — pivot everywhere (PALANTIR §3). Every reference in the
// app is the SAME object with the same gestures: click reads; the hover
// rail pivots into threads · compare · mark · the Oracle. One component,
// used by search hits, thread rows, dossier mentions, oracle citations —
// a ref can never again mean five different things in five panels.

import { goTo, openPanel, setState, addToInvestigation, whisper } from "./store";
import { bookById, getChapter } from "@/engine/corpus";
import { record } from "./witness";
import { setSeed } from "./seeds";
import { verb } from "./lexicon";
import "./ref.css";

export interface RefProps {
  bookId: string;
  chapter: number;
  verse?: number | null;
  /** extra line under the reference (a snippet, a surface form) */
  detail?: React.ReactNode;
  className?: string;
}

export function refText(bookId: string, chapter: number, verse?: number | null): string {
  return `${bookById.get(bookId)?.name ?? bookId} ${chapter}${verse != null ? ":" + verse : ""}`;
}

async function markIt(bookId: string, chapter: number, verse: number | null | undefined) {
  let text = "";
  try {
    const ch = await getChapter("web", bookId, chapter);
    text = ch.verses.find((v) => v.n === (verse ?? 1))?.text.slice(0, 90) ?? "";
  } catch { /* a mark without its first words is still a mark */ }
  setState((s) => ({
    marks: [...s.marks, {
      id: "m" + Math.random().toString(36).slice(2, 9),
      bookId, chapter, verse: verse ?? null, text, at: Date.now(),
    }],
  }));
  record("mark", `${bookId}.${chapter}.${verse ?? ""}`);
}

// DESIGN §II.8 — Ref actions are labeled pills: verb word (small caps) with
// its glyph, sourced from the one lexicon — never a bare-glyph rune strip.
export function Ref({ bookId, chapter, verse, detail, className }: RefProps) {
  const read = () => goTo({ bookId, chapter, verse: verse ?? null });
  const label = refText(bookId, chapter, verse);
  const threads = verb("threads"), compare = verb("compare"), mark = verb("mark"),
    ask = verb("ask"), kase = verb("case"), copy = verb("copy");
  return (
    <span className={"gx-ref" + (className ? " " + className : "")}>
      <button className="gx-ref-go" title="Read" onClick={read}>
        <span className="gx-ref-label">{label}</span>
        {detail ? <span className="gx-ref-detail">{detail}</span> : null}
      </button>
      <span className="gx-ref-rail" aria-label={`Actions for ${label}`}>
        <button className="gx-ref-pill" title={threads.hint} aria-label={`${threads.word} for ${label} — ${threads.hint}`} onClick={() => { read(); openPanel("threads"); }}>
          <span aria-hidden>{threads.glyph}</span><b>{threads.word}</b>
        </button>
        <button className="gx-ref-pill" title={compare.hint} aria-label={`${compare.word} ${label} — ${compare.hint}`} onClick={() => { read(); openPanel("compare"); }}>
          <span aria-hidden>⇄</span><b>{compare.word}</b>
        </button>
        <button
          className="gx-ref-pill"
          title={mark.hint}
          aria-label={`${mark.word} ${label} — ${mark.hint}`}
          onClick={() => { void markIt(bookId, chapter, verse); whisper({ kind: "toast", title: `Marked ${label}` }); }}
        >
          <span aria-hidden>{mark.glyph}</span><b>{mark.word}</b>
        </button>
        <button
          className="gx-ref-pill"
          title={copy.hint}
          aria-label={`${copy.word} ${label} — ${copy.hint}`}
          onClick={() => { void navigator.clipboard?.writeText(label); whisper({ kind: "toast", title: `Copied ${label}` }); }}
        >
          <span aria-hidden>{copy.glyph}</span><b>{copy.word}</b>
        </button>
        <button
          className="gx-ref-pill"
          title={ask.hint}
          aria-label={`${ask.word} the Oracle about ${label} — ${ask.hint}`}
          onClick={() => { read(); setSeed("oracle", `About ${label} — `); openPanel("oracle"); }}
        >
          <span aria-hidden>{ask.glyph}</span><b>{ask.word}</b>
        </button>
        <button
          className="gx-ref-pill"
          title={kase.hint}
          aria-label={`${kase.word} ${label} — ${kase.hint}`}
          onClick={() => { addToInvestigation("verse", { ref: `${bookId}.${chapter}.${verse ?? 1}` }, ""); whisper({ kind: "toast", title: `Added ${label} to case` }); }}
        >
          <span aria-hidden>{kase.glyph}</span><b>{kase.word}</b>
        </button>
      </span>
    </span>
  );
}
