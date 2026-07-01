// The shelves — translations as lanes, one tap sets the primary.
// Source lights are honest: ● baked bundle (offline forever),
// ◐ cached locally after first read, ○ network.

import { useApp, goTo, setState } from "@/kernel/store";
import "./library.css";

interface Shelf {
  id: string;
  name: string;
  lang: string;
  source: "bundle" | "network";
}

const SHELVES: Shelf[] = [
  { id: "kjv", name: "King James Version", lang: "EN 1611", source: "network" },
  { id: "web", name: "World English Bible", lang: "EN 2000", source: "network" },
  { id: "asv", name: "American Standard", lang: "EN 1901", source: "network" },
  { id: "ylt", name: "Young's Literal", lang: "EN 1862", source: "network" },
  { id: "wlc", name: "Westminster Leningrad Codex", lang: "עברית · Tanakh", source: "bundle" },
  { id: "sblgnt", name: "SBL Greek New Testament", lang: "Ελληνικά · NT", source: "bundle" },
];

export function Library() {
  const active = useApp((s) => s.cursor.translation);
  return (
    <div className="gx-library" role="region" aria-label="Library">
      <h2 className="gx-library-title">THE SHELVES</h2>
      <ul className="gx-shelves">
        {SHELVES.map((s) => (
          <li key={s.id}>
            <button
              className={"gx-shelf" + (s.id === active ? " is-active" : "")}
              onClick={() => goTo({ translation: s.id })}
              aria-pressed={s.id === active}
            >
              <span className="gx-shelf-light" data-src={s.source} aria-hidden>
                {s.source === "bundle" ? "●" : "○"}
              </span>
              <span className="gx-shelf-name">{s.name}</span>
              <span className="gx-shelf-lang">{s.lang}</span>
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
