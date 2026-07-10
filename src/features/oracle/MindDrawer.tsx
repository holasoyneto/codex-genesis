// THE MIND — the Oracle's settings drawer. One overlay, reachable at any
// time, where exactly one mind is chosen and made unmistakable. Three
// sections: the ENGINE ROOM (native MLX on this Mac), LOCAL SERVERS
// (autofound OpenAI-compatible endpoints), and CLOUD (the user's own key,
// model and effort). Switching minds mid-conversation is a feature — every
// turn already stamps its engine, so history stays honest.

import { useEffect, useRef, useState } from "react";
import { useApp, setState, flushPersist, type OracleSettings } from "@/kernel/store";
import { listModels, cloudProvider } from "@/engine/oracle";
import { autofindLocal, nativeMlx, type LocalServer, type MlxModelInfo } from "@/engine/detectLocal";

const OLLAMA_FIX = `launchctl setenv OLLAMA_ORIGINS "*" && osascript -e 'quit app "Ollama"' && open -a Ollama`;

function setOracle(patch: Partial<OracleSettings>) {
  setState((s) => ({ settings: { ...s.settings, oracle: { ...s.settings.oracle, ...patch } } }));
}

// ── §1 ENGINE ROOM — native MLX (packaged Mac app only) ─────────────────
function EngineRoom() {
  const [models, setModels] = useState<MlxModelInfo[]>([]);
  const [status, setStatus] = useState<{ running: boolean; port: number; model: string | null }>({ running: false, port: 0, model: null });
  const [starting, setStarting] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    if (!nativeMlx) return;
    const [list, st] = await Promise.all([nativeMlx.mlxList(), nativeMlx.mlxStatus()]);
    setModels(list);
    setStatus(st);
  };
  // Re-scanned every time the drawer opens — models change on disk.
  useEffect(() => { void refresh(); }, []);

  const start = async (m: MlxModelInfo) => {
    if (!nativeMlx) return;
    setErr(null);
    setStarting(m.path);
    const r = await nativeMlx.mlxStart(m.path);
    setStarting(null);
    if (!r.ok || !r.base) { setErr(r.error || "failed to start"); return; }
    let served = m.name;
    try {
      const res = await fetch(`${r.base}/models`, { signal: AbortSignal.timeout(3000) });
      const j = (await res.json()) as { data?: { id?: string }[] };
      served = j.data?.[0]?.id || served;
    } catch { /* fall back to the folder name */ }
    setOracle({ engine: "local", localUrl: r.base, localModel: served, localProvider: "Apple MLX" });
    flushPersist();
    await refresh();
  };

  const stop = async () => { if (!nativeMlx) return; await nativeMlx.mlxStop(); await refresh(); };
  const addFolder = async () => { if (!nativeMlx) return; const dir = await nativeMlx.pickFolder(); if (dir) await refresh(); };

  if (!nativeMlx) return null;

  return (
    <section className="gx-oracle-sec">
      <h3 className="gx-oracle-sec-title">
        ⚙ ENGINE ROOM — this Mac
        <button className="gx-oracle-refresh" aria-label="Rescan MLX models" title="rescan" onClick={() => void refresh()}>↻</button>
      </h3>
      <div className="gx-oracle-mlx">
        {status.running ? (
          <div className="gx-oracle-mlx-running">
            <span className="gx-oracle-probe is-ok">● serving {status.model}</span>
            <button className="gx-oracle-btn is-ghost" onClick={() => void stop()}>STOP</button>
          </div>
        ) : null}
        {models.length ? (
          <div className="gx-oracle-local-list">
            {models.map((m) => {
              const busy = starting === m.path;
              const active = status.running && status.model === m.name;
              return (
                <div key={m.path} className="gx-oracle-mlx-row">
                  <span className="gx-oracle-mlx-name">{m.name}</span>
                  <span className="gx-oracle-mlx-size">{m.sizeGB} GB</span>
                  <button
                    className="gx-oracle-btn is-ghost"
                    disabled={busy || active}
                    onClick={() => void start(m)}
                  >{busy ? "waking…" : active ? "● serving" : "▶ START"}</button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="gx-oracle-keyhint">No MLX models found in the Hugging Face cache yet.</p>
        )}
        <div className="gx-oracle-actions">
          <button className="gx-oracle-btn is-ghost" onClick={() => void addFolder()}>+ ADD FOLDER</button>
        </div>
        {err ? <p className="gx-oracle-keyhint">{err}</p> : null}
      </div>
    </section>
  );
}

// ── §3 CLOUD — the key, model and effort controls ───────────────────────
function CloudSection() {
  const oracle = useApp((s) => s.settings.oracle);
  const [models, setModels] = useState<string[]>([]);
  const provider = cloudProvider(oracle.anthropicKey);
  const anthropic = provider?.id === "anthropic";
  const active = oracle.engine === "cloud";

  useEffect(() => {
    if (!provider) { setModels([]); return; }
    let live = true;
    listModels().then((r) => { if (live) setModels(r.models); }).catch(() => {});
    return () => { live = false; };
  }, [oracle.anthropicKey]);

  return (
    <section className={"gx-oracle-sec gx-oracle-card" + (active ? " is-active" : "")}>
      <h3 className="gx-oracle-card-title">✦ CLOUD <span className="gx-oracle-tag">your own key · stored on this device only</span></h3>
      <div className="gx-oracle-actions">
        <input
          className="gx-oracle-key"
          type="password"
          placeholder="sk-ant-… · xai-… · AIza… · gsk_… · sk-or-…"
          value={oracle.anthropicKey}
          onChange={(e) => setOracle({ anthropicKey: e.target.value })}
          aria-label="Cloud API key"
        />
        <button
          className="gx-oracle-btn"
          disabled={!provider}
          onClick={() => { setOracle({ engine: "cloud" }); flushPersist(); }}
        >{active ? "● ACTIVE" : "USE CLOUD"}</button>
      </div>
      {oracle.anthropicKey && !provider ? (
        <p className="gx-oracle-keyhint">
          That doesn't look like a key I know — Anthropic <code>sk-ant-</code> · xAI <code>xai-</code> · Gemini <code>AIza</code> · Groq <code>gsk_</code> · OpenRouter <code>sk-or-</code>.
        </p>
      ) : provider ? (
        <p className="gx-oracle-keyhint is-ok">● {provider.label} key recognized</p>
      ) : (
        <p className="gx-oracle-keyhint is-ok" style={{ color: "var(--fg-dim)" }}>
          A key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Gemini</a> or <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Groq</a> is free to start.
        </p>
      )}
      {provider ? (
        <div className="gx-oracle-cloud-controls">
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
            <div className="gx-oracle-effort">
              <div className="gx-oracle-effort-strip" role="group" aria-label="Effort">
                {(["low", "medium", "high"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    className={"gx-oracle-effort-seg" + (oracle.effort === lvl ? " is-on" : "")}
                    aria-pressed={oracle.effort === lvl}
                    onClick={() => setOracle({ effort: lvl })}
                  >{lvl}</button>
                ))}
              </div>
              <span className="gx-oracle-effort-why">effort — how long the mind may think before it answers</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// ── §2 LOCAL SERVERS — autofound OpenAI-compatible endpoints ────────────
function LocalServers({ onProbeState }: { onProbeState: (nothingFound: boolean) => void }) {
  const oracle = useApp((s) => s.settings.oracle);
  const [scan, setScan] = useState<"idle" | "busy" | "done">("idle");
  const [servers, setServers] = useState<LocalServer[]>([]);

  const autofind = async () => {
    setScan("busy");
    const found = await autofindLocal();
    setServers(found);
    setScan("done");
    onProbeState(found.length === 0);
  };
  // AUTOFIND runs automatically when the drawer opens.
  useEffect(() => { void autofind(); }, []);

  const choose = (s: LocalServer, model: string) => {
    setOracle({ engine: "local", localUrl: s.base, localModel: model, localProvider: s.provider });
    flushPersist();
  };

  return (
    <section className="gx-oracle-sec">
      <h3 className="gx-oracle-sec-title">
        ◆ LOCAL SERVERS
        <button className="gx-oracle-refresh" aria-label="Rescan local servers" title="rescan" onClick={() => void autofind()}>↻</button>
      </h3>
      <div className="gx-oracle-actions">
        <span className={"gx-oracle-probe" + (scan === "done" ? " is-ok" : "")}>
          {scan === "busy" ? "scanning…"
            : scan === "done"
              ? (servers.length ? `● ${servers.reduce((n, s) => n + s.models.length, 0)} model(s) on ${servers.length} server(s)` : "○ nothing serving yet")
              : "…"}
        </span>
      </div>
      {servers.length ? (
        <div className="gx-oracle-local-list">
          {servers.map((s) => (
            <div key={s.base} className="gx-oracle-local-group">
              <p className="gx-oracle-local-src">{s.provider} <span className="gx-oracle-local-base">{s.base.replace(/^https?:\/\//, "")}</span></p>
              {s.models.map((m) => {
                const active = oracle.engine === "local" && oracle.localUrl === s.base && oracle.localModel === m;
                return (
                  <button
                    key={m}
                    className={"gx-oracle-local-model" + (active ? " is-active" : "")}
                    onClick={() => choose(s, m)}
                  >
                    <span className="gx-oracle-local-dot">{active ? "●" : "○"}</span> {m}
                    {active ? <span className="gx-oracle-local-on">active</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <p className="gx-oracle-keyhint" style={{ color: "var(--fg-dim)" }}>
          Run a local model — <a href="https://ollama.com" target="_blank" rel="noreferrer">Ollama</a> (<code>ollama run llama3.2</code>) or Apple <a href="https://github.com/ml-explore/mlx-lm" target="_blank" rel="noreferrer">MLX</a> — then rescan.
        </p>
      )}
    </section>
  );
}

export function MindDrawer({ onClose }: { onClose: () => void }) {
  const [probeFailed, setProbeFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("button, input, select")?.focus(); }, []);

  return (
    <div
      className="gx-oracle-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="THE MIND — choose the Oracle's engine"
      ref={ref}
    >
      <div className="gx-oracle-drawer-head">
        <h3 className="gx-oracle-drawer-title">THE MIND</h3>
        <button className="gx-oracle-drawer-x" aria-label="Close the mind drawer" onClick={onClose}>×</button>
      </div>

      <EngineRoom />
      <LocalServers onProbeState={setProbeFailed} />
      <CloudSection />

      <div className="gx-oracle-drawer-foot">
        the Oracle can err — Scripture is the source
        {probeFailed ? (
          <div className="gx-oracle-fix">
            <p>No local server answered. Start one (<code>ollama run llama3.2</code> or <code>mlx_lm.server</code>). If Ollama is running but shy with apps, paste this once into Terminal, then rescan:</p>
            <div className="gx-oracle-cmd">
              <code>{OLLAMA_FIX}</code>
              <button
                className="gx-oracle-copy"
                onClick={() => { void navigator.clipboard.writeText(OLLAMA_FIX); setCopied(true); }}
              >{copied ? "COPIED ✓" : "COPY"}</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
