// MISSIONS — PALANTIR §4. An Oracle mode where the model runs a
// multi-step plan against the kernel's tool loop (the same loop the
// Oracle panel already drives — askOracleStream), with a visible step
// feed (glass chips: thinking → tool → result) and a final ARTIFACT: a
// structured brief (title, findings, verse grid, claims ledger) saved to
// the active investigation. Nothing new engine-side — Missions is a
// framing of the kernel loop the Oracle already has (EXOGRAMMAR law 5:
// the engine is the askOracleStream + kernel tool registry; this panel
// is a thin, mortal skin over it).

import { useEffect, useRef, useState } from "react";
import { useApp, addToInvestigation } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { askOracleStream, type ChatTurn } from "@/engine/oracle";
import { Ref } from "@/kernel/Ref";
import { parseRef } from "@/features/omnibar/refparse";
import { takeSeed } from "@/kernel/seeds";
import "./missions.css";

interface StepChip { kind: "tool"; name: string; args: string }
interface Artifact {
  title: string;
  text: string;
  refs: { bookId: string; chapter: number; verse: number | null }[];
  toolCalls: number;
}

const MISSION_PROMPT = (goal: string) =>
  `MISSION: ${goal}\n\nWork this as a multi-step research plan using your tools — ` +
  `search, cross-references, entity dossiers, graph paths — rather than answering ` +
  `from memory alone. When you conclude, give a clear title line first ` +
  `("TITLE: ...") followed by your findings with verse citations (book chapter:verse).`;

function extractRefs(text: string): Artifact["refs"] {
  const found: Artifact["refs"] = [];
  const seen = new Set<string>();
  // A loose scan for "Book ch:v" patterns via the same parser the omnibar
  // uses — good enough for a findings grid, not a citation authority
  // (claim grading in the Oracle panel remains the authority on verbatim
  // accuracy; this is a navigational convenience for the artifact).
  const re = /\b([1-3]?\s?[A-Za-z]+\.?)\s?(\d{1,3}):(\d{1,3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const p = parseRef(`${m[1]} ${m[2]}:${m[3]}`);
    // Only exact/prefix book matches — a fuzzy match means the "book" word
    // was really some other English word that happened to precede digits
    // (parseRef's typo tolerance is right for the omnibar, wrong here).
    if (!p || p.fuzzy) continue;
    const key = `${p.book.id}.${p.chapter}.${p.verse}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ bookId: p.book.id, chapter: p.chapter, verse: p.verse ?? null });
  }
  return found.slice(0, 24);
}

export function Missions() {
  const oracle = useApp((s) => s.settings.oracle);
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<StepChip[]>([]);
  const [live, setLive] = useState("");
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const stepsRef = useRef(0);
  useEffect(() => { const s = takeSeed("missions"); if (s) setGoal(s); }, []);

  const run = async () => {
    const g = goal.trim();
    if (!g || busy || !oracle.engine) return;
    setBusy(true); setSteps([]); setLive(""); setArtifact(null); setErr(null); setSaved(false);
    stepsRef.current = 0;
    try {
      const transcript: ChatTurn[] = [];
      const a = await askOracleStream(MISSION_PROMPT(g), transcript, {
        onDelta: (d) => setLive((t) => t + d),
        onTool: (name, args) => { stepsRef.current++; setSteps((s) => [...s, { kind: "tool", name, args: JSON.stringify(args) }]); },
      });
      const titleMatch = a.text.match(/TITLE:\s*(.+)/);
      setArtifact({
        title: titleMatch?.[1]?.trim() || g,
        text: a.text.replace(/TITLE:\s*.+\n?/, "").trim(),
        refs: extractRefs(a.text),
        toolCalls: stepsRef.current,
      });
    } catch (e) {
      setErr(String(e).slice(0, 300));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!artifact) return;
    addToInvestigation(
      "oracle",
      { question: `MISSION: ${artifact.title}`, answer: artifact.text.slice(0, 1200), refs: artifact.refs, toolCalls: artifact.toolCalls },
      "mission artifact"
    );
    setSaved(true);
  };

  return (
    <div className="gx-missions" role="region" aria-label="Missions">
      {!useInWindow() ? <h2 className="gx-mis-title">MISSIONS</h2> : null}
      <p className="gx-mis-lead">
        Give the Oracle a research goal — it plans, works the kernel's tools step by step, and returns a structured brief you can save to your investigation.
      </p>
      {!oracle.engine ? (
        <div className="gx-mis-noengine">
          {goal ? <p className="gx-mis-seeded">Goal ready — “{goal}”</p> : null}
          <p className="gx-mis-none">No Oracle engine configured yet — open the Oracle to set one up first, then return here to launch.</p>
        </div>
      ) : (
        <>
          <div className="gx-mis-ask">
            <input
              className="gx-mis-input"
              placeholder="e.g. Trace covenant-breaking meals through both testaments"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void run(); }}
              disabled={busy}
            />
            <button className="gx-mis-go" onClick={() => void run()} disabled={busy || !goal.trim()}>
              {busy ? "…" : "RUN"}
            </button>
          </div>

          {steps.length ? (
            <div className="gx-mis-steps">
              {steps.map((s, i) => (
                <span key={i} className="gx-mis-step" title={s.args}>⚙ {s.name}</span>
              ))}
            </div>
          ) : null}

          {busy && !artifact ? (
            <p className="gx-mis-live">{live || <span className="gx-oracle-shimmer">planning…</span>}</p>
          ) : null}

          {err ? <p className="gx-mis-err">{err}</p> : null}

          {artifact ? (
            <article className="gx-mis-artifact">
              <header className="gx-mis-art-head">
                <span className="gx-mis-art-tag">ARTIFACT</span>
                <h3 className="gx-mis-art-title">{artifact.title}</h3>
              </header>
              <p className="gx-mis-art-text">{artifact.text}</p>
              {artifact.refs.length ? (
                <div className="gx-mis-grid">
                  {artifact.refs.map((r, i) => (
                    <Ref key={i} bookId={r.bookId} chapter={r.chapter} verse={r.verse} />
                  ))}
                </div>
              ) : null}
              <footer className="gx-mis-art-foot">
                <span className="gx-mis-art-meta">{steps.length} tool call{steps.length === 1 ? "" : "s"} · {artifact.refs.length} refs</span>
                <button className="gx-mis-save" onClick={save} disabled={saved}>
                  {saved ? "✓ saved to investigation" : "🗂 save artifact to investigation"}
                </button>
              </footer>
            </article>
          ) : null}
        </>
      )}
    </div>
  );
}
