// The <Ref> chip — pivot everywhere (PALANTIR §3). Every reference in the
// app is the SAME object with the same gestures: click reads; the hover
// rail pivots into threads · compare · mark · the Oracle. One component,
// used by search hits, thread rows, dossier mentions, oracle citations —
// a ref can never again mean five different things in five panels.

import { goTo, openPanel, setState, addToInvestigation } from "./store";
import { bookById, getChapter } from "@/engine/corpus";
import { record } from "./witness";
import { setSeed } from "./seeds";
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

export function Ref({ bookId, chapter, verse, detail, className }: RefProps) {
  const read = () => goTo({ bookId, chapter, verse: verse ?? null });
  const label = refText(bookId, chapter, verse);
  return (
    <span className={"gx-ref" + (className ? " " + className : "")}>
      <button className="gx-ref-go" title="Read" onClick={read}>
        <span className="gx-ref-label">{label}</span>
        {detail ? <span className="gx-ref-detail">{detail}</span> : null}
      </button>
      <span className="gx-ref-rail" aria-label={`Actions for ${label}`}>
        <button title="Threads" aria-label={`Threads for ${label}`} onClick={() => { read(); openPanel("threads"); }}>⛬</button>
        <button title="Compare" aria-label={`Compare ${label}`} onClick={() => { read(); openPanel("compare"); }}>⇄</button>
        <button title="Mark" aria-label={`Mark ${label}`} onClick={() => void markIt(bookId, chapter, verse)}>✦</button>
        <button
          title="Ask the Oracle"
          aria-label={`Ask the Oracle about ${label}`}
          onClick={() => { read(); setSeed("oracle", `About ${label} — `); openPanel("oracle"); }}
        >☲</button>
        <button
          title="Add to investigation"
          aria-label={`Add ${label} to investigation`}
          onClick={() => addToInvestigation("verse", { ref: `${bookId}.${chapter}.${verse ?? 1}` }, "")}
        >🗂</button>
      </span>
    </span>
  );
}
