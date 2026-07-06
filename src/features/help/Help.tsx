// HELP — generated from the feature registry. The law finally executes
// itself: docs cannot promise what isn't registered.

import { closeVeil, openPanel } from "@/kernel/store";
import { allFeatures } from "@/kernel/registry";
import "./help.css";

// The shell's own keys — owned here because the shell has no manifest.
const SHELL_KEYS: { keys: string; what: string }[] = [
  { keys: "⌘K", what: "the one door — a verse, a book, a command" },
  { keys: "← →", what: "turn the chapter" },
  { keys: "B", what: "keep the focused verse (a mark)" },
  { keys: "⌘[ ⌘]", what: "walk the jump ledger back / forward" },
  { keys: "?", what: "this overlay" },
  { keys: "esc", what: "close the veil" },
];

export function Help() {
  return (
    <div className="gx-help glass glass-lg gx-enter" role="dialog" aria-label="Help">
      <h2 className="gx-instrument-title gx-help-title">CODEX — THE INSTRUMENTS</h2>
      <ul className="gx-help-features">
        {allFeatures().filter((f) => f.surfaces.main).map((f) => (
          <li key={f.id}>
            <button
              className="gx-help-row"
              onClick={() => { openPanel(f.id); closeVeil(); }}
            >
              <span className="gx-help-glyph" aria-hidden>{f.glyph}</span>
              <span className="gx-help-name">{f.title}</span>
              <span className="gx-help-what">{f.help ?? (f.commands?.[0]?.hint ?? "")}</span>
              {f.keybinding ? <kbd className="gx-help-kbd">{f.keybinding}</kbd> : null}
            </button>
          </li>
        ))}
      </ul>
      <h3 className="gx-instrument-title gx-help-title">THE KEYS</h3>
      <ul className="gx-help-keys">
        {SHELL_KEYS.map((k) => (
          <li key={k.keys} className="gx-help-key">
            <kbd className="gx-help-kbd">{k.keys}</kbd>
            <span className="gx-help-what">{k.what}</span>
          </li>
        ))}
      </ul>
      <p className="gx-help-oath">every row above is generated from the feature registry — nothing promised that isn't real</p>
    </div>
  );
}
