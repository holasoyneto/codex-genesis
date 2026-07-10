// THE ORACLE — the one door to every AI mind. A mode strip (ASK · COUNCIL ·
// MISSION) and an engine chip that opens THE MIND drawer, where exactly one
// mind is chosen. Honesty is load-bearing: every answer names its engine, the
// chip never pretends a broken engine works, and switching minds mid-thread
// is a feature (each turn stamps the engine that ran it).

import { useEffect, useRef, useState } from "react";
import { useApp, closePanel, addToInvestigation } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { takeSeed } from "@/kernel/seeds";
import { askOracleStream, cloudProvider, probeLocal, type OracleAnswer, type ChatTurn } from "@/engine/oracle";
import { gradeClaims, type Citation } from "@/engine/claims";
import { Ref } from "@/kernel/Ref";
import { MindDrawer } from "./MindDrawer";
import { CouncilMode } from "./CouncilMode";
import { MissionMode } from "./MissionMode";
import "./oracle.css";

type Mode = "ask" | "council" | "mission";

const LEVEL_LABEL = {
  canon: "the whole canon in mind",
  testament: "the whole testament in mind",
  book: "the whole book in mind",
  chapter: "this chapter in mind",
} as const;

const MODES: { id: Mode; label: string }[] = [
  { id: "ask", label: "ASK" },
  { id: "council", label: "COUNCIL" },
  { id: "mission", label: "MISSION" },
];

// A model id trimmed to its short, human name for the chip.
function shortModel(id: string): string {
  const bare = id.replace(/^models\//, "").split("/").pop() || id;
  return bare.length > 22 ? bare.slice(0, 21) + "…" : bare;
}

// ── the mode strip — segmented control, gold active segment ─────────────
function ModeStrip({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="gx-oracle-strip" role="tablist" aria-label="Oracle mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={mode === m.id}
          data-mode={m.id}
          className={"gx-oracle-seg" + (mode === m.id ? " is-on" : "")}
          onClick={() => setMode(m.id)}
        >{m.label}</button>
      ))}
    </div>
  );
}

// ── the engine chip — provider glyph, short model, live status dot ──────
function EngineChip({ onOpen }: { onOpen: () => void }) {
  const oracle = useApp((s) => s.settings.oracle);
  const [reachable, setReachable] = useState<boolean | null>(null);

  // Probe lazily — once, when the active engine changes; never poll.
  useEffect(() => {
    let live = true;
    setReachable(null);
    if (oracle.engine === "local") {
      probeLocal(oracle.localUrl.replace(/\/$/, "")).then((r) => { if (live) setReachable(r.ok); }).catch(() => { if (live) setReachable(false); });
    } else if (oracle.engine === "cloud") {
      setReachable(!!cloudProvider(oracle.anthropicKey));
    }
    return () => { live = false; };
  }, [oracle.engine, oracle.localUrl, oracle.localModel, oracle.anthropicKey]);

  if (!oracle.engine) return null;
  const provider = cloudProvider(oracle.anthropicKey);
  const glyph = oracle.engine === "local" ? "◆" : "✦";
  const name = oracle.engine === "local"
    ? (oracle.localProvider || "on this machine")
    : (provider?.label.replace(/\s*\(.*\)$/, "") || "cloud");
  const model = oracle.engine === "local"
    ? (oracle.localModel ? shortModel(oracle.localModel) : "")
    : (oracle.model ? shortModel(oracle.model) : "strongest");
  const ok = reachable !== false;

  return (
    <button className="gx-oracle-chip" onClick={onOpen} aria-label="Open THE MIND — the engine drawer">
      <span className="gx-oracle-chip-glyph" aria-hidden>{glyph}</span>
      <span>{name}</span>
      {model ? <span className="gx-oracle-chip-model">· {model}</span> : null}
      <span className={"gx-oracle-chip-dot " + (ok ? "is-ok" : "is-off")} aria-hidden>{ok ? "●" : "○"}</span>
    </button>
  );
}

interface ToolChip { name: string; args: string }
interface Turn {
  q: string;
  text: string;
  tools: ToolChip[];
  a?: OracleAnswer;
  cites?: Citation[];
  err?: string;
}

function AnswerText({ text, cites }: { text: string; cites?: Citation[] }) {
  if (!cites?.length) return <p className="gx-oracle-a-text">{text}</p>;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  cites.forEach((c, i) => {
    if (c.start > last) nodes.push(<span key={"t" + i}>{text.slice(last, c.start)}</span>);
    nodes.push(<Ref key={"r" + i} bookId={c.bookId} chapter={c.chapter} verse={c.verse} className="gx-oracle-cite" />);
    if (c.verified === false) {
      nodes.push(<span key={"u" + i} className="gx-oracle-unverified" title="This quote does not match the verse verbatim">⚠ UNVERIFIED</span>);
    }
    last = c.end;
  });
  if (last < text.length) nodes.push(<span key="tail">{text.slice(last)}</span>);
  return <p className="gx-oracle-a-text">{nodes}</p>;
}

// ── ASK MODE — the conversation (streaming, tools, citations) ───────────
function AskMode({ onOpenMind }: { onOpenMind: () => void }) {
  const oracle = useApp((s) => s.settings.oracle);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [turns]);
  useEffect(() => { const s = takeSeed("oracle"); if (s) setQ(s); }, []);

  const patchLast = (fn: (t: Turn) => Turn) =>
    setTurns((ts) => ts.map((x, i) => (i === ts.length - 1 ? fn(x) : x)));

  const ask = async () => {
    const question = q.trim();
    if (!question || busy) return;
    setQ("");
    setBusy(true);
    const transcript: ChatTurn[] = turns.flatMap((t) =>
      t.a ? [{ role: "user" as const, content: t.q }, { role: "assistant" as const, content: t.text }] : []);
    setTurns((t) => [...t, { q: question, text: "", tools: [] }]);
    try {
      const a = await askOracleStream(question, transcript, {
        onDelta: (d) => patchLast((t) => ({ ...t, text: t.text + d })),
        onTool: (name, args) => patchLast((t) => ({ ...t, tools: [...t.tools, { name, args: JSON.stringify(args) }] })),
      });
      const cites = await gradeClaims(a.text).catch(() => []);
      patchLast((t) => ({ ...t, a, text: a.text, cites }));
    } catch (e) {
      patchLast((t) => ({ ...t, err: String(e) }));
    } finally {
      setBusy(false);
    }
  };

  if (!oracle.engine) {
    return (
      <div className="gx-oracle-empty">
        <p>The Oracle needs a mind. Plug in the best one you have — you can switch anytime.</p>
        <button className="gx-oracle-btn" onClick={onOpenMind}>◆ open THE MIND</button>
      </div>
    );
  }

  return (
    <>
      <div className="gx-oracle-turns">
        {turns.map((t, i) => (
          <div key={i} className="gx-oracle-turn">
            <p className="gx-oracle-q">{t.q}</p>
            {t.tools.length ? (
              <div className="gx-oracle-tools">
                {t.tools.map((tc, k) => (
                  <span key={k} className="gx-oracle-tool" title={tc.args}>⚙ {tc.name}</span>
                ))}
              </div>
            ) : null}
            {t.err ? (
              <p className="gx-oracle-err">{t.err}</p>
            ) : t.text || t.a ? (
              <div className="gx-oracle-a">
                <AnswerText text={t.text} cites={t.cites} />
                {t.a ? (
                  <span className="gx-oracle-a-chip">
                    ⇄ {t.a.engine} · {t.a.model} · {LEVEL_LABEL[t.a.context.level]} (~{Math.round(t.a.context.approxTokens / 1000)}k tokens)
                    {t.cites?.length ? ` · ${t.cites.length} refs · ${t.cites.filter((c) => c.verified === false).length} unverified` : ""}
                  </span>
                ) : null}
                {t.text ? (
                  <button
                    className="gx-oracle-a-inv"
                    title="Add this answer to your investigation"
                    onClick={() => addToInvestigation("oracle", { question: t.q, answer: t.text.slice(0, 600) }, "")}
                  >🗂 add to investigation</button>
                ) : null}
              </div>
            ) : (
              <p className="gx-oracle-wait"><span className="gx-oracle-shimmer">the Oracle ponders…</span></p>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="gx-oracle-ask">
        <input
          className="gx-oracle-input"
          placeholder="Ask about this passage…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void ask(); }}
          aria-label="Ask the Oracle"
        />
        <button className="gx-oracle-btn" onClick={() => void ask()} disabled={busy}>ASK</button>
      </div>
    </>
  );
}

export function Oracle() {
  const engine = useApp((s) => s.settings.oracle.engine);
  const [mode, setMode] = useState<Mode>("ask");
  // The panel opens straight into THE MIND when no engine is configured.
  const [mind, setMind] = useState<boolean>(!engine);

  // A command (or the omnibar) may open the Oracle in a specific mode.
  useEffect(() => {
    const seeded = takeSeed("oracle-mode");
    if (seeded === "council" || seeded === "mission" || seeded === "ask") setMode(seeded);
  }, []);

  // Escape closes the drawer.
  useEffect(() => {
    if (!mind) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setMind(false); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [mind]);

  const openMind = () => setMind(true);

  return (
    <div className="gx-oracle" role="region" aria-label="Oracle">
      <header className="gx-oracle-head">
        <h2 className="gx-oracle-title">THE ORACLE</h2>
        <div className="gx-oracle-bar">
          <ModeStrip mode={mode} setMode={setMode} />
          <EngineChip onOpen={openMind} />
          {!engine && !mind ? (
            <button className="gx-oracle-chip" onClick={openMind} aria-label="Open THE MIND">the mind ○</button>
          ) : null}
        </div>
      </header>

      <div className="gx-oracle-stage">
        {mode === "ask" ? <AskMode onOpenMind={openMind} />
          : mode === "council" ? <CouncilMode onOpenMind={openMind} />
          : <MissionMode onOpenMind={openMind} />}
        {mind ? <MindDrawer onClose={() => setMind(false)} /> : null}
      </div>

      {useInWindow() ? null : (
        <button className="gx-oracle-close" aria-label="Close oracle" onClick={() => closePanel()}>×</button>
      )}
    </div>
  );
}
