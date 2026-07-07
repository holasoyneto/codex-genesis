// THE TRAIL — PALANTIR §3. The Witness's jump ledger, rendered as a
// walkable breadcrumb ribbon: quiet glass strip, desk bottom-left (mirrors
// the dock's bottom-center, trace's top-right — each edge slot owned
// exactly once). A click on any step turns the reader there; "save" lands
// the last steps as evidence in the active investigation in one stroke.

import { useState } from "react";
import { useApp, goTo, saveTrailToInvestigation } from "@/kernel/store";
import { bookById } from "@/engine/corpus";
import { usePalm } from "./Shell";
import "./trail.css";

const STEPS_SHOWN = 5;

function stepLabel(c: { bookId: string; chapter: number; verse: number | null }): string {
  const b = bookById.get(c.bookId);
  return `${b?.name ?? c.bookId} ${c.chapter}${c.verse ? ":" + c.verse : ""}`;
}

export function Trail() {
  const trail = useApp((s) => s.trail);
  const palm = usePalm();
  const [open, setOpen] = useState(false);
  // Palm has no room for a persistent ribbon — the Trail lives in the
  // Witness window there; the desk gets the quiet bottom-left strip.
  if (palm || trail.length < 2) return null;
  const recent = trail.slice(-STEPS_SHOWN);

  return (
    <div className={"gx-trail glass-sm glass" + (open ? " is-open" : "")} role="navigation" aria-label="The Trail">
      <button className="gx-trail-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ⛓ TRAIL
      </button>
      {open ? (
        <>
          <ol className="gx-trail-steps">
            {recent.map((s, i) => (
              <li key={s.at}>
                <button className="gx-trail-step" onClick={() => goTo(s.cursor)}>
                  {stepLabel(s.cursor)}
                </button>
                {i < recent.length - 1 ? <span className="gx-trail-arrow" aria-hidden>→</span> : null}
              </li>
            ))}
          </ol>
          <button
            className="gx-trail-save"
            title="Save the last steps of the Trail to your active investigation"
            onClick={() => saveTrailToInvestigation(20)}
          >save trail to investigation</button>
        </>
      ) : null}
    </div>
  );
}
