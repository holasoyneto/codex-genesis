// Settings — few, honest, live. Every control edits the ONE store and the
// page answers immediately; there is no "apply". Scripture options only —
// instrument options live with their instruments.

import { useApp, setState, type Settings as S } from "@/kernel/store";
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
  return (
    <div className="gx-settings" role="region" aria-label="Settings">
      <h2 className="gx-settings-title">SETTINGS</h2>

      <div className="gx-set-row">
        <span className="gx-set-label">Theme</span>
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
        <label className="gx-set-label" htmlFor="gx-scale">Scripture size</label>
        <input
          id="gx-scale"
          type="range" min={16} max={26} step={1}
          value={s.scriptureScale}
          onChange={(e) => set("scriptureScale", Number(e.target.value))}
        />
        <span className="gx-set-value">{s.scriptureScale}px</span>
      </div>

      <div className="gx-set-row">
        <span className="gx-set-label">Red letters</span>
        <button
          className={"gx-switch" + (s.redLetter ? " is-on" : "")}
          role="switch" aria-checked={s.redLetter}
          aria-label="Words of Jesus in red"
          onClick={() => set("redLetter", !s.redLetter)}
        ><i /></button>
      </div>

      <div className="gx-set-row">
        <span className="gx-set-label">The golden Name</span>
        <button
          className={"gx-switch" + (s.divineName ? " is-on" : "")}
          role="switch" aria-checked={s.divineName}
          aria-label="Render the divine name in Hebrew gold"
          onClick={() => set("divineName", !s.divineName)}
        ><i /></button>
      </div>

      <button
        className="gx-settings-close"
        aria-label="Close settings"
        onClick={() => setState({ panel: null })}
      >×</button>
    </div>
  );
}
