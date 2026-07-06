// Marks — the reader's own gold. Press B on a focused verse (or use the
// omnibar) to keep it; the panel walks you back to every kept place.

import { useApp, goTo, setState, type Mark, closePanel } from "@/kernel/store";
import { bookById } from "@/engine/corpus";
import "./marks.css";

export function refLabel(m: Mark): string {
  const b = bookById.get(m.bookId);
  return `${b?.name ?? m.bookId} ${m.chapter}${m.verse ? ":" + m.verse : ""}`;
}

export function Marks() {
  const marks = useApp((s) => s.marks);
  return (
    <div className="gx-marks" role="region" aria-label="Marks">
      <h2 className="gx-marks-title">MARKS</h2>
      {!marks.length ? (
        <p className="gx-marks-empty">
          Nothing kept yet — focus a verse and press <b>B</b>.
        </p>
      ) : (
        <ul className="gx-marks-rows">
          {[...marks].reverse().map((m) => (
            <li key={m.id} className="gx-mark-row">
              <button
                className="gx-mark-go"
                onClick={() => goTo({ bookId: m.bookId, chapter: m.chapter, verse: m.verse })}
              >
                <span className="gx-mark-ref">{refLabel(m)}</span>
                <span className="gx-mark-text">{m.text}</span>
              </button>
              <button
                className="gx-mark-x"
                aria-label={`Remove mark ${refLabel(m)}`}
                onClick={() => setState((s) => ({ marks: s.marks.filter((x) => x.id !== m.id) }))}
              >×</button>
            </li>
          ))}
        </ul>
      )}
      <button
        className="gx-marks-close"
        aria-label="Close marks"
        onClick={() => closePanel()}
      >×</button>
    </div>
  );
}
