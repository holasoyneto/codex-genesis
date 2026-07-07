// THE INVESTIGATIONS — PALANTIR §3. The analyst works a case: evidence
// accumulates from anywhere in the app (a verse, a range, an entity, a
// search hit, an Oracle answer); notes are the analyst's own words,
// editable inline; export hands the case to a human as a clean, honest
// brief. Case list → case view, one gesture deep, same panel.

import { useState } from "react";
import {
  useApp, goTo, openDossier,
  createInvestigation, deleteInvestigation, setActiveInvestigation, renameInvestigation,
  removeEvidence, updateEvidenceNote, type Investigation, type Evidence,
} from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { bookById } from "@/engine/corpus";
import { APP_VERSION } from "@/kernel/version";
import "./investigations.css";

function refLabel(ref: string): string {
  const [b, c, v] = ref.split(".");
  return `${bookById.get(b)?.name ?? b} ${c}${v ? ":" + v : ""}`;
}

const KIND_GLYPH: Record<Evidence["kind"], string> = {
  verse: "✦", range: "▤", entity: "☖", search: "⌕", oracle: "☲",
};

function evidenceLabel(ev: Evidence): { label: string; go?: () => void } {
  switch (ev.kind) {
    case "verse": {
      const ref = String(ev.payload.ref ?? "");
      const [b, c, v] = ref.split(".");
      return { label: refLabel(ref), go: () => goTo({ bookId: b, chapter: +c, verse: v ? +v : null }) };
    }
    case "range": {
      const from = String(ev.payload.from ?? ""), to = String(ev.payload.to ?? "");
      const [b, c, v] = from.split(".");
      return { label: `${refLabel(from)} – ${refLabel(to)}`, go: () => goTo({ bookId: b, chapter: +c, verse: v ? +v : null }) };
    }
    case "entity": {
      const id = String(ev.payload.id ?? "");
      const name = String(ev.payload.name ?? id);
      return { label: name, go: () => openDossier(id) };
    }
    case "search":
      return { label: `“${ev.payload.query}” · ${ev.payload.hits ?? "?"} hits` };
    case "oracle":
      return { label: String(ev.payload.question ?? "Oracle answer") };
    default:
      return { label: JSON.stringify(ev.payload) };
  }
}

function exportBrief(c: Investigation): void {
  const lines = [
    `# ${c.title}`,
    "",
    `_Case opened ${new Date(c.created).toISOString().slice(0, 10)} · ${c.items.length} item${c.items.length === 1 ? "" : "s"} · exported ${new Date().toISOString().slice(0, 10)}_`,
    "",
    "## Evidence",
    "",
    ...c.items.flatMap((ev) => {
      const { label } = evidenceLabel(ev);
      return [`### ${KIND_GLYPH[ev.kind]} ${label}`, "", ev.note ? `> ${ev.note}` : "_no note_", ""];
    }),
    ...(c.userEdges.length ? ["## Connections", "", ...c.userEdges.map((e) => `- **${e.from}** — ${e.kind} → **${e.to}**${e.note ? ` (${e.note})` : ""}`), ""] : []),
    "---",
    "",
    `_Scripture text: World English Bible (public domain). Exported from CODEX GENESIS v${APP_VERSION}._`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `codex-case-${c.id}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function CaseList({ cases, onOpen }: { cases: Investigation[]; onOpen: (id: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="gx-inv-list">
      <div className="gx-inv-new">
        <input
          className="gx-inv-new-input"
          placeholder="New case title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              const id = createInvestigation(title.trim());
              setTitle("");
              onOpen(id);
            }
          }}
        />
        <button
          className="gx-inv-new-go"
          onClick={() => { if (title.trim()) { const id = createInvestigation(title.trim()); setTitle(""); onOpen(id); } }}
        >+ CASE</button>
      </div>
      {!cases.length ? (
        <p className="gx-inv-empty">
          No cases yet — open one above, or use “add to investigation” from any verse, entity, or Oracle answer.
        </p>
      ) : (
        <ul className="gx-inv-rows">
          {[...cases].reverse().map((c) => (
            <li key={c.id} className="gx-inv-row">
              <button className="gx-inv-row-go" onClick={() => onOpen(c.id)}>
                <span className="gx-inv-row-title">{c.title}</span>
                <span className="gx-inv-row-meta">{c.items.length} item{c.items.length === 1 ? "" : "s"} · {new Date(c.created).toLocaleDateString()}</span>
              </button>
              <button className="gx-inv-row-del" aria-label={`Delete case ${c.title}`} onClick={() => deleteInvestigation(c.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CaseView({ c, onBack }: { c: Investigation; onBack: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="gx-inv-case">
      <div className="gx-inv-case-head">
        <button className="gx-inv-back" onClick={onBack}>‹ all cases</button>
        <input
          className="gx-inv-case-title"
          value={c.title}
          onChange={(e) => renameInvestigation(c.id, e.target.value)}
        />
        <button className="gx-inv-export" onClick={() => exportBrief(c)}>⇩ EXPORT BRIEF</button>
      </div>
      {!c.items.length ? (
        <p className="gx-inv-empty">
          No evidence yet — "add to investigation" from any verse, entity, search hit, or Oracle answer lands here.
        </p>
      ) : (
        <ul className="gx-inv-evidence">
          {c.items.map((ev) => {
            const { label, go } = evidenceLabel(ev);
            return (
              <li key={ev.id} className="gx-inv-ev">
                <div className="gx-inv-ev-head">
                  <span className="gx-inv-ev-glyph" aria-hidden>{KIND_GLYPH[ev.kind]}</span>
                  {go ? (
                    <button className="gx-inv-ev-label" onClick={go}>{label}</button>
                  ) : (
                    <span className="gx-inv-ev-label is-static">{label}</span>
                  )}
                  <button className="gx-inv-ev-del" aria-label="Remove evidence" onClick={() => removeEvidence(c.id, ev.id)}>✕</button>
                </div>
                {editing === ev.id ? (
                  <textarea
                    className="gx-inv-ev-note-edit"
                    autoFocus
                    defaultValue={ev.note}
                    onBlur={(e) => { updateEvidenceNote(c.id, ev.id, e.target.value); setEditing(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) (e.target as HTMLTextAreaElement).blur(); }}
                  />
                ) : (
                  <button className="gx-inv-ev-note" onClick={() => setEditing(ev.id)}>
                    {ev.note || <span className="gx-inv-ev-note-empty">+ add a note…</span>}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {c.userEdges.length ? (
        <section className="gx-inv-sec">
          <h3 className="gx-inv-sec-title">CONNECTIONS</h3>
          <ul className="gx-inv-edges">
            {c.userEdges.map((e) => (
              <li key={e.id} className="gx-inv-edge">{e.from} — <i>{e.kind}</i> → {e.to}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function Investigations() {
  const cases = useApp((s) => s.investigations);
  const active = useApp((s) => s.activeInvestigation);
  const [viewId, setViewId] = useState<string | null>(active);
  const viewing = viewId ? cases.find((c) => c.id === viewId) : null;

  return (
    <div className="gx-investigations" role="region" aria-label="Investigations">
      {!useInWindow() ? <h2 className="gx-inv-title">INVESTIGATIONS</h2> : null}
      {viewing ? (
        <CaseView c={viewing} onBack={() => setViewId(null)} />
      ) : (
        <CaseList cases={cases} onOpen={(id) => { setViewId(id); setActiveInvestigation(id); }} />
      )}
    </div>
  );
}
