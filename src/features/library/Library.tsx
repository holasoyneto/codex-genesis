// The shelves — translations as lanes, one tap sets the primary.
// Source lights are honest: ● baked bundle (offline forever),
// ○ network-then-kept. Lanes derive from the engine's ONE registry.

import { useApp, goTo, setState } from "@/kernel/store";
import { TRANSLATIONS } from "@/engine/corpus";
import "./library.css";

export function Library() {
  const active = useApp((s) => s.cursor.translation);
  return (
    <div className="gx-library" role="region" aria-label="Library">
      <h2 className="gx-library-title">THE SHELVES</h2>
      <ul className="gx-shelves">
        {TRANSLATIONS.map((t) => (
          <li key={t.id}>
            <button
              className={"gx-shelf" + (t.id === active ? " is-active" : "")}
              onClick={() => goTo({ translation: t.id })}
              aria-pressed={t.id === active}
            >
              <span className="gx-shelf-light" data-src={t.bundled ? "bundle" : "network"} aria-hidden>
                {t.bundled ? "●" : "○"}
              </span>
              <span className="gx-shelf-name">{t.name}</span>
              <span className="gx-shelf-lang">{t.lang}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="gx-library-note">
        ● baked in — read without a connection · ○ fetched, then kept
      </p>
      <button
        className="gx-library-close"
        aria-label="Close library"
        onClick={() => setState({ panel: null })}
      >×</button>
    </div>
  );
}
