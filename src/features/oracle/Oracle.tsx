// THE ORACLE — ask anything about the open passage. Two engines, chosen in
// a setup made for absolute beginners: LOCAL (Ollama — install, open, done;
// nothing leaves the machine) or CLOUD (your own Anthropic key, stored on
// this device only). Honesty is load-bearing: every answer names its engine,
// and the panel never pretends a broken engine works.

import { useEffect, useRef, useState } from "react";
import { useApp, setState, type OracleSettings, closePanel } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { takeSeed } from "@/kernel/seeds";
import { askOracleStream, listModels, probeLocal, cloudProvider, type OracleAnswer, type ChatTurn } from "@/engine/oracle";
import { gradeClaims, type Citation } from "@/engine/claims";
import { Ref } from "@/kernel/Ref";
import "./oracle.css";

const LEVEL_LABEL = {
  canon: "the whole canon in mind",
  testament: "the whole testament in mind",
  book: "the whole book in mind",
  chapter: "this chapter in mind",
} as const;

const OLLAMA_FIX = `launchctl setenv OLLAMA_ORIGINS "*" && osascript -e 'quit app "Ollama"' && open -a Ollama`;

function setOracle(patch: Partial<OracleSettings>) {
  setState((s) => ({ settings: { ...s.settings, oracle: { ...s.settings.oracle, ...patch } } }));
}

function Setup() {
  const oracle = useApp((s) => s.settings.oracle);
  const [probe, setProbe] = useState<"idle" | "busy" | "ok" | "fail">("idle");
  const [probeWhy, setProbeWhy] = useState("");
  const [copied, setCopied] = useState(false);

  const test = async () => {
    setProbe("busy");
    const r = await probeLocal(oracle.localUrl);
    setProbe(r.ok ? "ok" : "fail");
    setProbeWhy(r.ok ? `found ${r.model}` : r.why ?? "");
    if (r.ok) setOracle({ engine: "local" });
  };

  return (
    <div className="gx-oracle-setup">
      <p className="gx-oracle-lead">The Oracle needs a mind. Plug in the best one you have — you can switch anytime.</p>

      <section className="gx-oracle-card">
        <h3 className="gx-oracle-card-title">✦ YOUR FRONTIER MODEL <span className="gx-oracle-tag">one key · CODEX picks its strongest mind</span></h3>
        <ol className="gx-oracle-steps">
          <li>Paste a key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Anthropic</a>, <a href="https://console.x.ai" target="_blank" rel="noreferrer">xAI</a>, <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Gemini</a>, <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Groq</a> or <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">OpenRouter</a> — Gemini and Groq have free tiers.</li>
          <li>It stays on this device, nowhere else. CODEX asks the strongest model your key can see.</li>
        </ol>
        <div className="gx-oracle-actions">
          <input
            className="gx-oracle-key"
            type="password"
            placeholder="sk-ant-… · xai-… · AIza… · gsk_… · sk-or-…"
            value={oracle.anthropicKey}
            onChange={(e) => setOracle({ anthropicKey: e.target.value })}
          />
          <button
            className="gx-oracle-btn"
            disabled={!cloudProvider(oracle.anthropicKey)}
            onClick={() => setOracle({ engine: "cloud" })}
          >USE CLOUD</button>
        </div>
        {oracle.anthropicKey && !cloudProvider(oracle.anthropicKey) ? (
          <p className="gx-oracle-keyhint">
            That doesn't look like a key I know — Anthropic <code>sk-ant-</code> · xAI <code>xai-</code> · Gemini <code>AIza</code> · Groq <code>gsk_</code> · OpenRouter <code>sk-or-</code>.
          </p>
        ) : cloudProvider(oracle.anthropicKey) ? (
          <p className="gx-oracle-keyhint is-ok">
            ● {cloudProvider(oracle.anthropicKey)!.label} key recognized
          </p>
        ) : null}
      </section>

      <section className="gx-oracle-card">
        <h3 className="gx-oracle-card-title">◆ ON YOUR MACHINE <span className="gx-oracle-tag">private · free · no key</span></h3>
        <ol className="gx-oracle-steps">
          <li>Download <a href="https://ollama.com" target="_blank" rel="noreferrer">Ollama</a> and open it (it's one app, no account).</li>
          <li>In Ollama, pick any model when it asks — the small ones work fine.</li>
          <li>Press TEST below. That's it.</li>
        </ol>
        <div className="gx-oracle-actions">
          <button className="gx-oracle-btn" onClick={test} disabled={probe === "busy"}>
            {probe === "busy" ? "…" : "⚡ TEST"}
          </button>
          <span className={"gx-oracle-probe is-" + probe}>
            {probe === "ok" ? `● connected — ${probeWhy}` : probe === "fail" ? `○ not reachable — ${probeWhy}` : ""}
          </span>
        </div>
        {probe === "fail" ? (
          <div className="gx-oracle-fix">
            <p>Ollama is shy with websites by default. Paste this once into Terminal (⌘-space, type "Terminal"), press return, then TEST again:</p>
            <div className="gx-oracle-cmd">
              <code>{OLLAMA_FIX}</code>
              <button
                className="gx-oracle-copy"
                onClick={() => { void navigator.clipboard.writeText(OLLAMA_FIX); setCopied(true); }}
              >{copied ? "COPIED ✓" : "COPY"}</button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

interface ToolChip { name: string; args: string }
interface Turn {
  q: string;
  text: string;                 // streamed answer text
  tools: ToolChip[];            // the work, visible
  a?: OracleAnswer;
  cites?: Citation[];
  err?: string;
}

// Answer text with citations woven in as <Ref> chips; a quote that failed
// verbatim check against the corpus carries a visible ⚠ UNVERIFIED stamp.
function AnswerText({ text, cites }: { text: string; cites?: Citation[] }) {
  if (!cites?.length) return <p className="gx-oracle-a-text">{text}</p>;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  cites.forEach((c, i) => {
    if (c.start > last) nodes.push(<span key={"t" + i}>{text.slice(last, c.start)}</span>);
    nodes.push(
      <Ref key={"r" + i} bookId={c.bookId} chapter={c.chapter} verse={c.verse} className="gx-oracle-cite" />
    );
    if (c.verified === false) {
      nodes.push(<span key={"u" + i} className="gx-oracle-unverified" title="This quote does not match the verse verbatim">⚠ UNVERIFIED</span>);
    }
    last = c.end;
  });
  if (last < text.length) nodes.push(<span key="tail">{text.slice(last)}</span>);
  return <p className="gx-oracle-a-text">{nodes}</p>;
}

// The model & effort picker — the discovered list becomes a visible choice;
// Anthropic keys also choose how hard the mind thinks.
function MindPicker() {
  const oracle = useApp((s) => s.settings.oracle);
  const [models, setModels] = useState<string[]>([]);
  const anthropic = oracle.engine === "cloud" && cloudProvider(oracle.anthropicKey)?.id === "anthropic";
  useEffect(() => {
    if (oracle.engine !== "cloud") return;
    let live = true;
    listModels().then((r) => { if (live) setModels(r.models); }).catch(() => {});
    return () => { live = false; };
  }, [oracle.engine, oracle.anthropicKey]);
  if (oracle.engine !== "cloud") return null;
  return (
    <div className="gx-oracle-mind">
      <select
        className="gx-oracle-select"
        aria-label="Model"
        value={oracle.model}
        onChange={(e) => setOracle({ model: e.target.value })}
      >
        <option value="">strongest (auto)</option>
        {models.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      {anthropic ? (
        <select
          className="gx-oracle-select"
          aria-label="Effort"
          value={oracle.effort}
          onChange={(e) => setOracle({ effort: e.target.value as OracleSettings["effort"] })}
        >
          <option value="low">effort · low</option>
          <option value="medium">effort · medium</option>
          <option value="high">effort · high</option>
        </select>
      ) : null}
    </div>
  );
}

export function Oracle() {
  const oracle = useApp((s) => s.settings.oracle);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [turns]);
  // A <Ref> chip may open the panel WITH a question in hand.
  useEffect(() => { const s = takeSeed("oracle"); if (s) setQ(s); }, []);

  const patchLast = (fn: (t: Turn) => Turn) =>
    setTurns((ts) => ts.map((x, i) => (i === ts.length - 1 ? fn(x) : x)));

  const ask = async () => {
    const question = q.trim();
    if (!question || busy) return;
    setQ("");
    setBusy(true);
    // conversation memory: the running transcript travels with every turn
    const transcript: ChatTurn[] = turns.flatMap((t) =>
      t.a ? [{ role: "user" as const, content: t.q }, { role: "assistant" as const, content: t.text }] : []);
    setTurns((t) => [...t, { q: question, text: "", tools: [] }]);
    try {
      const a = await askOracleStream(question, transcript, {
        onDelta: (d) => patchLast((t) => ({ ...t, text: t.text + d })),
        onTool: (name, args) =>
          patchLast((t) => ({ ...t, tools: [...t.tools, { name, args: JSON.stringify(args) }] })),
      });
      const cites = await gradeClaims(a.text).catch(() => []);
      patchLast((t) => ({ ...t, a, text: a.text, cites }));
    } catch (e) {
      patchLast((t) => ({ ...t, err: String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gx-oracle" role="region" aria-label="Oracle">
      <h2 className="gx-oracle-title">THE ORACLE</h2>
      {!oracle.engine ? (
        <Setup />
      ) : (
        <>
          <p className="gx-oracle-oath">
            {oracle.engine === "local" ? "◆ on your machine" : "✦ cloud · your key"} · the Oracle can err — Scripture is the source ·{" "}
            <button className="gx-oracle-relink" onClick={() => setOracle({ engine: null })}>change engine</button>
          </p>
          <MindPicker />
          <div className="gx-oracle-turns">
            {turns.map((t, i) => (
              <div key={i} className="gx-oracle-turn">
                <p className="gx-oracle-q">{t.q}</p>
                {t.tools.length ? (
                  <div className="gx-oracle-tools">
                    {t.tools.map((tc, k) => (
                      <span key={k} className="gx-oracle-tool" title={tc.args}>
                        ⚙ {tc.name}
                      </span>
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
            />
            <button className="gx-oracle-btn" onClick={() => void ask()} disabled={busy}>ASK</button>
          </div>
        </>
      )}
      {useInWindow() ? null : (
        <button className="gx-oracle-close" aria-label="Close oracle" onClick={() => closePanel()}>×</button>
      )}
    </div>
  );
}
