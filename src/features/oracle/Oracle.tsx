// THE ORACLE — ask anything about the open passage. Two engines, chosen in
// a setup made for absolute beginners: LOCAL (Ollama — install, open, done;
// nothing leaves the machine) or CLOUD (your own Anthropic key, stored on
// this device only). Honesty is load-bearing: every answer names its engine,
// and the panel never pretends a broken engine works.

import { useEffect, useRef, useState } from "react";
import { useApp, setState, type OracleSettings } from "@/kernel/store";
import { askOracle, probeLocal, type OracleAnswer } from "@/engine/oracle";
import { getChapter, bookById } from "@/engine/corpus";
import "./oracle.css";

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
      <p className="gx-oracle-lead">The Oracle needs a mind. Pick one — you can switch anytime.</p>

      <section className="gx-oracle-card">
        <h3 className="gx-oracle-card-title">◆ ON YOUR MACHINE <span className="gx-oracle-tag">private · free</span></h3>
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

      <section className="gx-oracle-card">
        <h3 className="gx-oracle-card-title">✦ IN THE CLOUD <span className="gx-oracle-tag">smartest · pay-as-you-go</span></h3>
        <ol className="gx-oracle-steps">
          <li>Get an API key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>.</li>
          <li>Paste it here — it stays on this device, nowhere else.</li>
        </ol>
        <div className="gx-oracle-actions">
          <input
            className="gx-oracle-key"
            type="password"
            placeholder="sk-ant-…"
            value={oracle.anthropicKey}
            onChange={(e) => setOracle({ anthropicKey: e.target.value })}
          />
          <button
            className="gx-oracle-btn"
            disabled={!oracle.anthropicKey.startsWith("sk-ant-")}
            onClick={() => setOracle({ engine: "cloud" })}
          >USE CLOUD</button>
        </div>
      </section>
    </div>
  );
}

interface Turn { q: string; a?: OracleAnswer; err?: string }

export function Oracle() {
  const oracle = useApp((s) => s.settings.oracle);
  const cursor = useApp((s) => s.cursor);
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
    const book = bookById.get(cursor.bookId);
    let context = `The reader has ${book?.name ?? cursor.bookId} ${cursor.chapter} open`;
    try {
      const ch = await getChapter(cursor.translation, cursor.bookId, cursor.chapter);
      const v = cursor.verse != null ? ch.verses.find((x) => x.n === cursor.verse) : null;
      context += v ? `, verse ${v.n}: "${v.text}"` : ".";
    } catch { context += "."; }
    try {
      const a = await askOracle(question, context);
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
                    <span className="gx-oracle-a-chip">⇄ {t.a.engine} · {t.a.model}</span>
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
