// The dock — a quiet frosted edge strip, GENERATED from the feature
// registry (law 5: the dock cannot promise what isn't registered).
// Desk: bottom-center. Palm: the same list unfolds from a floating orb.

import { useState } from "react";
import { useApp, openPanel, closePanel } from "@/kernel/store";
import { allFeatures } from "@/kernel/registry";
import { usePalm } from "./Shell";
import "./dock.css";

function items() {
  return allFeatures().filter((f) => f.surfaces.main);
}

export function Dock() {
  const palm = usePalm();
  const open = useApp((s) => s.wm.open);
  const panel = useApp((s) => s.panel);
  const [unfolded, setUnfolded] = useState(false);

  const active = (id: string) => (palm ? panel === id : open.includes(id));
  const toggle = (id: string) => (active(id) ? closePanel(id) : openPanel(id));

  // Palm: the orb opens a full menu SHEET (DESIGN §I.2) — each row is
  // glyph + NAME + one-line purpose, never a bare-glyph strip.
  if (palm) {
    return (
      <div className="gx-dock-orbit">
        {unfolded ? (
          <div className="gx-dock-menu glass gx-enter" role="menu" aria-label="Instruments">
            <p className="gx-dock-menu-title">INSTRUMENTS</p>
            {items().map((f) => (
              <button
                key={f.id}
                role="menuitem"
                className={"gx-dock-row" + (active(f.id) ? " is-active" : "")}
                onClick={() => { toggle(f.id); setUnfolded(false); }}
              >
                <span className="gx-dock-row-glyph" aria-hidden>{f.glyph}</span>
                <span className="gx-dock-row-text">
                  <b>{f.title.toUpperCase()}</b>
                  <i>{f.purpose}</i>
                </span>
                {active(f.id) ? <span className="gx-dock-row-dot" aria-hidden /> : null}
              </button>
            ))}
          </div>
        ) : null}
        <button
          className="gx-dock-orb glass"
          aria-label="Instruments"
          aria-expanded={unfolded}
          onClick={() => setUnfolded((u) => !u)}
        >✦</button>
      </div>
    );
  }

  // Desk: labels under glyphs, always visible — no hover required to know
  // what a button is (DESIGN §I.2). The open-state dot marks multitasking
  // orientation (DESIGN §IV.12): open features carry a visible dot + a
  // brighter label, not just a color shift on the glyph.
  return (
    <div className="gx-dock glass" role="toolbar" aria-label="Instruments">
      {items().map((f) => (
        <button
          key={f.id}
          className={"gx-dock-btn" + (active(f.id) ? " is-active" : "")}
          title={`${f.title} — ${f.purpose}`}
          aria-label={`${f.title} — ${f.purpose}`}
          onClick={() => toggle(f.id)}
        >
          <span className="gx-dock-glyph" aria-hidden>{f.glyph}</span>
          <span className="gx-dock-label">{f.title}</span>
          {active(f.id) ? <span className="gx-dock-dot" aria-hidden /> : null}
        </button>
      ))}
    </div>
  );
}
