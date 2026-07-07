// Settings — few, honest, live. Every control edits the ONE store and the
// page answers immediately; there is no "apply". Scripture options only —
// instrument options live with their instruments.

import { useRef, useState } from "react";
import { useApp, setState, type Settings as S, closePanel } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { exportStore, importStore } from "@/kernel/share";
import "./settings.css";

function set<K extends keyof S>(key: K, value: S[K]) {
  setState((s) => ({ settings: { ...s.settings, [key]: value } }));
}

const THEMES: { id: S["theme"]; label: string }[] = [
  { id: "auto", label: "AUTO" },
  { id: "light", label: "DAY" },
  { id: "dark", label: "NIGHT" },
];

export function Settings() {
  const s = useApp((st) => st.settings);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  return (
    <div className="gx-settings" role="region" aria-label="Settings">
      <h2 className="gx-settings-title">SETTINGS</h2>

      <div className="gx-set-row">
        <span className="gx-set-label">
          Theme
          <i className="gx-set-hint">auto follows your system; day and night are fixed</i>
        </span>
        <div className="gx-seg" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={s.theme === t.id}
              className={"gx-seg-btn" + (s.theme === t.id ? " is-on" : "")}
              onClick={() => set("theme", t.id)}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div className="gx-set-row">
        <label className="gx-set-label" htmlFor="gx-scale">
          Scripture size
          <i className="gx-set-hint">the reading column's text size, in pixels</i>
        </label>
        <input
          id="gx-scale"
          type="range" min={16} max={26} step={1}
          value={s.scriptureScale}
          onChange={(e) => set("scriptureScale", Number(e.target.value))}
        />
        <span className="gx-set-value">{s.scriptureScale}px</span>
      </div>

      <div className="gx-set-row">
        <span className="gx-set-label">
          Red letters
          <i className="gx-set-hint">words attributed to Jesus render in red</i>
        </span>
        <button
          className={"gx-switch" + (s.redLetter ? " is-on" : "")}
          role="switch" aria-checked={s.redLetter}
          aria-label="Words of Jesus in red"
          onClick={() => set("redLetter", !s.redLetter)}
        ><i /></button>
      </div>

      <div className="gx-set-row">
        <span className="gx-set-label">
          The golden Name
          <i className="gx-set-hint">LORD/GOD render as יהוה in reverent gold</i>
        </span>
        <button
          className={"gx-switch" + (s.divineName ? " is-on" : "")}
          role="switch" aria-checked={s.divineName}
          aria-label="Render the divine name in Hebrew gold"
          onClick={() => set("divineName", !s.divineName)}
        ><i /></button>
      </div>

      <div className="gx-set-row">
        <span className="gx-set-label">
          Entity names — quiet underlines
          <i className="gx-set-hint">named people and places open their Dossier on click</i>
        </span>
        <button
          className={"gx-switch" + (s.entities ? " is-on" : "")}
          role="switch" aria-checked={s.entities}
          aria-label="Underline named persons and places in the reader"
          onClick={() => set("entities", !s.entities)}
        ><i /></button>
      </div>

      <div className="gx-set-row">
        <span className="gx-set-label">
          The Witness — local use ledger
          <i className="gx-set-hint">records what you do, on this device only, never sent anywhere</i>
        </span>
        <button
          className={"gx-switch" + (s.witness ? " is-on" : "")}
          role="switch" aria-checked={s.witness}
          aria-label="Record app usage locally"
          onClick={() => set("witness", !s.witness)}
        ><i /></button>
      </div>

      <div className="gx-set-row gx-set-sync">
        <span className="gx-set-label">
          Your data — a file, not a wire (#72)
          <i className="gx-set-hint">export everything to a file, or restore from one — no account, no server</i>
        </span>
        <div className="gx-set-sync-acts">
          <button className="gx-set-sync-btn" onClick={exportStore}>⇩ export store</button>
          <button className="gx-set-sync-btn" onClick={() => fileRef.current?.click()}>⇧ import store</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const r = await importStore(file);
              setImportMsg(r.ok ? "imported — marks and cases merged, settings restored" : `failed: ${r.error}`);
              setTimeout(() => setImportMsg(null), 4000);
            }}
          />
        </div>
        {importMsg ? <p className="gx-set-sync-msg">{importMsg}</p> : null}
      </div>

      {useInWindow() ? null : (
        <button
          className="gx-settings-close"
          aria-label="Close settings"
          onClick={() => closePanel()}
        >×</button>
      )}
    </div>
  );
}
