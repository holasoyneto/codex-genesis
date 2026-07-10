// Marks — the reader's own gold. Press B on a focused verse (or use the
// omnibar) to keep it; the panel walks you back to every kept place.

import { useState } from "react";
import { useApp, goTo, setState, getState, type Mark, closePanel } from "@/kernel/store";
import { bookById } from "@/engine/corpus";
import { useInWindow } from "@/shell/Windows";
import { askOracleStream } from "@/engine/oracle";
import "./marks.css";

// Semantic mark search — literal substring search over ref + text runs
// first and instantly; when it comes back thin (few or no hits) we offer
// an AI-ranked pass over the SAME marks, through whichever Oracle engine
// the reader already has configured. No engine configured is not an
// error — it's a fact we say plainly instead of attempting the call.
const FEW_HITS = 2;

interface RankedHit { id: string; reason: string }

function literalHits(marks: Mark[], q: string): Mark[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return marks.filter((m) =>
    refLabel(m).toLowerCase().includes(needle) || (m.text ?? "").toLowerCase().includes(needle)
  );
}

async function rankMarks(query: string, marks: Mark[]): Promise<RankedHit[]> {
  const list = marks
    .map((m) => `[${m.id}] ${refLabel(m)}${m.text ? ` — "${m.text.slice(0, 110)}"` : ""}`)
    .join("\n");
  const question = [
    `Query: "${query}"`,
    "",
    `The reader's kept marks (${marks.length}):`,
    list,
    "",
    "Return the marks that resonate with this query — by theme, motif, character,",
    "doctrine, or emotional resonance, not just literal substrings. Ordered",
    "most→least relevant, at most 12. Output ONLY a JSON array, no prose, no",
    'fences: [{"id":"<mark-id>","reason":"<≤14-word reason>"}]',
  ].join("\n");
  const a = await askOracleStream(question, [], { onDelta: () => {}, onTool: () => {} });
  const m = a.text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  const parsed = JSON.parse(m[0]) as unknown;
  if (!Array.isArray(parsed)) return [];
  const validIds = new Set(marks.map((x) => x.id));
  return (parsed as { id?: unknown; reason?: unknown }[])
    .filter((x): x is { id: string; reason?: unknown } => typeof x.id === "string" && validIds.has(x.id))
    .slice(0, 12)
    .map((x) => ({ id: x.id, reason: String(x.reason ?? "").slice(0, 140) }));
}

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
  const engine = useApp((s) => s.settings.oracle.engine);
  const [q, setQ] = useState("");
  const [ranked, setRanked] = useState<RankedHit[] | null>(null);
  const [aiState, setAiState] = useState<"idle" | "busy" | "failed">("idle");

  const hits = q.trim() ? literalHits(marks, q) : null;
  const thin = hits !== null && hits.length <= FEW_HITS;
  const shown = ranked
    ? ranked.map((r) => marks.find((m) => m.id === r.id)).filter((m): m is Mark => !!m)
    : hits ?? marks;

  const runAiRank = () => {
    if (!engine || aiState === "busy" || !q.trim()) return;
    setAiState("busy");
    rankMarks(q.trim(), marks)
      .then((r) => { setRanked(r); setAiState("idle"); })
      .catch(() => setAiState("failed"));
  };

  return (
    <div className="gx-marks" role="region" aria-label="Marks">
      <h2 className="gx-marks-title">MARKS</h2>
      {marks.length ? (
        <>
          <input
            className="gx-marks-search"
            placeholder="Search your marks…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setRanked(null); setAiState("idle"); }}
            spellCheck={false}
          />
          {q.trim() && thin ? (
            <div className="gx-marks-airow">
              {!engine ? (
                <p className="gx-marks-aihint">connect an engine for semantic search</p>
              ) : aiState === "failed" ? (
                <p className="gx-marks-aihint">the Oracle didn't answer — try again</p>
              ) : (
                <button className="gx-marks-aigo" onClick={runAiRank} disabled={aiState === "busy"}>
                  {aiState === "busy" ? "ranking…" : "✦ AI-ranked search"}
                </button>
              )}
            </div>
          ) : null}
          <button className="gx-marks-export" onClick={exportMarks}>⇩ EXPORT MARKDOWN</button>
        </>
      ) : null}
      {!marks.length ? (
        <p className="gx-marks-empty">
          {/* DESIGN §I.5 — one sentence teaching what this is, one concrete
              action, never a blank pane. */}
          Marks are verses you keep for later — open any verse's menu and
          choose <b>Mark</b>, or focus a verse in the reader and press <b>B</b>.
        </p>
      ) : q.trim() && !shown.length ? (
        <p className="gx-marks-empty">Nothing found for “{q}”.</p>
      ) : (
        <ul className="gx-marks-rows">
          {(ranked ? shown : [...shown].reverse()).map((m) => (
            <li key={m.id} className="gx-mark-row">
              <button
                className="gx-mark-go"
                onClick={() => goTo({ bookId: m.bookId, chapter: m.chapter, verse: m.verse })}
              >
                <span className="gx-mark-ref">{refLabel(m)}</span>
                <span className="gx-mark-text">
                  {ranked?.find((r) => r.id === m.id)?.reason ?? m.text}
                </span>
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
      {useInWindow() ? null : (
        <button
          className="gx-marks-close"
          aria-label="Close marks"
          onClick={() => closePanel()}
        >×</button>
      )}
    </div>
  );
}
