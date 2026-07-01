// THE ORACLE — ask anything about the open passage. Two engines, chosen in
// a setup made for absolute beginners: LOCAL (Ollama — install, open, done;
// nothing leaves the machine) or CLOUD (your own Anthropic key, stored on
// this device only). Honesty is load-bearing: every answer names its engine,
// and the panel never pretends a broken engine works.

import { useEffect, useRef, useState } from "react";
import { useApp, setState, type OracleSettings } from "@/kernel/store";
import { askOracle, probeLocal, cloudProvider, type OracleAnswer } from "@/engine/oracle";
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

interface Turn { q: string; a?: OracleAnswer; err?: string }

export function Oracle() {
  const oracle = useApp((s) => s.settings.oracle);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [turns]);

  const ask = async () => {
    const question = q.trim();
    if (!question || busy) return;
    setQ("");
    setBusy(true);
    setTurns((t) => [...t, { q: question }]);
    try {
      const a = await askOracle(question);
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a } : x)));
    } catch (e) {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, err: String(e) } : x)));
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
          <div className="gx-oracle-turns">
            {turns.map((t, i) => (
              <div key={i} className="gx-oracle-turn">
                <p className="gx-oracle-q">{t.q}</p>
                {t.a ? (
                  <div className="gx-oracle-a">
                    <p className="gx-oracle-a-text">{t.a.text}</p>
                    <span className="gx-oracle-a-chip">
                      ⇄ {t.a.engine} · {t.a.model} · {LEVEL_LABEL[t.a.context.level]} (~{Math.round(t.a.context.approxTokens / 1000)}k tokens)
                    </span>
                  </div>
                ) : t.err ? (
                  <p className="gx-oracle-err">{t.err}</p>
                ) : (
                  <p className="gx-oracle-wait">the Oracle ponders…</p>
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
      <button className="gx-oracle-close" aria-label="Close oracle" onClick={() => setState({ panel: null })}>×</button>
    </div>
  );
}
