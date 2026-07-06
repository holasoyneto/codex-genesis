// Marks — the reader's own gold. Press B on a focused verse (or use the
// omnibar) to keep it; the panel walks you back to every kept place.

import { useApp, goTo, setState, getState, type Mark, closePanel } from "@/kernel/store";
import { bookById } from "@/engine/corpus";
import "./marks.css";

// Export — the study leaves the app as a clean, honest markdown product.
function exportMarks(): void {
  const { marks } = getState();
  const lines = [
    "# Marks — CODEX GENESIS",
    "",
    `_${marks.length} kept verse${marks.length === 1 ? "" : "s"} · exported ${new Date().toISOString().slice(0, 10)}_`,
    "",
    ...[...marks].reverse().flatMap((m) => [
      `## ${refLabel(m)}`,
      "",
      m.text ? `> ${m.text}` : "",
      "",
      `_kept ${new Date(m.at).toISOString().slice(0, 10)}_`,
      "",
    ]),
    "---",
    "",
    "_Scripture text: World English Bible (public domain). Exported from CODEX GENESIS._",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "codex-marks.md";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function refLabel(m: Mark): string {
  const b = bookById.get(m.bookId);
  return `${b?.name ?? m.bookId} ${m.chapter}${m.verse ? ":" + m.verse : ""}`;
}

export function Marks() {
  const marks = useApp((s) => s.marks);
  return (
    <div className="gx-marks" role="region" aria-label="Marks">
      <h2 className="gx-marks-title">MARKS</h2>
      {marks.length ? (
        <button className="gx-marks-export" onClick={exportMarks}>⇩ EXPORT MARKDOWN</button>
      ) : null}
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
