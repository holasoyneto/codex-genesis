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

  if (palm) {
    return (
      <div className="gx-dock-orbit">
        {unfolded ? (
          <div className="gx-dock gx-dock-palm glass gx-enter" role="toolbar" aria-label="Instruments">
            {items().map((f) => (
              <button
                key={f.id}
                className={"gx-dock-btn" + (active(f.id) ? " is-active" : "")}
                title={f.title}
                aria-label={f.title}
                onClick={() => { toggle(f.id); setUnfolded(false); }}
              >{f.glyph}</button>
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

  return (
    <div className="gx-dock glass" role="toolbar" aria-label="Instruments">
      {items().map((f) => (
        <button
          key={f.id}
          className={"gx-dock-btn" + (active(f.id) ? " is-active" : "")}
          title={f.title}
          aria-label={f.title}
          onClick={() => toggle(f.id)}
        >{f.glyph}</button>
      ))}
    </div>
  );
}
