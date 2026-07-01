// The Shell owns space. Regions, from back to front:
//   wallpaper   — the starfield (desk only)
//   scripture   — the sacred center column (the Reader's home)
//   instruments — feature windows (desk) / sheets (palm)
//   edge        — fixed chrome SLOTS, each owned exactly once (trace top-right)
//   whisper     — ONE notification lane (top-right on desk, below the edge
//                 slot; bottom on palm) — queued, collision-free by layout
//   veil        — modal surface (omnibar), one at a time
// No feature may position itself fixed; it renders into a region. This is
// the law that kills v1's entire clash class.

import { useEffect } from "react";
import { useApp, dismissWhisper, closeVeil, getState, setState } from "@/kernel/store";
import { getFeature } from "@/kernel/registry";
import { bookById } from "@/engine/corpus";
import { Trace } from "./Trace";
import "./shell.css";

function useTheme(): "dark" | "light" {
  const pref = useApp((s) => s.settings.theme);
  const dark = pref === "auto"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : pref === "dark";
  const theme = dark ? "dark" : "light";
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return theme;
}

function WhisperLane() {
  const whispers = useApp((s) => s.whispers);
  if (!whispers.length) return null;
  return (
    <div className="gx-whisper-lane" role="status" aria-live="polite">
      {whispers.slice(0, 3).map((w) => (
        <div key={w.id} className={`gx-whisper gx-whisper-${w.kind}`}>
          <div className="gx-whisper-head">
            <span className="gx-whisper-title">{w.title}</span>
            <button
              className="gx-whisper-x"
              aria-label="Dismiss"
              onClick={() => dismissWhisper(w.id)}
            >×</button>
          </div>
          {w.body ? <p className="gx-whisper-body">{w.body}</p> : null}
        </div>
      ))}
    </div>
  );
}

function Instrument() {
  const panel = useApp((s) => s.panel);
  if (!panel) return null;
  const F = getFeature(panel)?.surfaces.main;
  if (!F) return null;
  return (
    <aside className="gx-instrument">
      <F />
    </aside>
  );
}

function Veil() {
  const veil = useApp((s) => s.veil);
  useEffect(() => {
    if (!veil) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeVeil(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [veil]);
  if (!veil) return null;
  const F = getFeature(veil.feature)?.surfaces.veil;
  if (!F) return null;
  return (
    <div className="gx-veil" onClick={(e) => { if (e.target === e.currentTarget) closeVeil(); }}>
      <F seed={veil.seed} />
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  useTheme();
  // Shell-level keys: ⌘K opens the one door; ←/→ turn chapters when the
  // reader has the floor (no veil, not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const open = getState().veil;
        setState({ veil: open ? null : { feature: "omnibar" } });
        return;
      }
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]");
      if (typing || getState().veil || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const { cursor } = getState();
        const book = bookById.get(cursor.bookId);
        if (!book) return;
        const next = cursor.chapter + (e.key === "ArrowRight" ? 1 : -1);
        if (next >= 1 && next <= book.chapters) {
          e.preventDefault();
          setState({ cursor: { ...cursor, chapter: next, verse: null } });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="gx-shell">
      <div className="gx-wallpaper" aria-hidden />
      <main className="gx-scripture">{children}</main>
      <Instrument />
      <div className="gx-edge">
        <Trace />
      </div>
      <WhisperLane />
      <Veil />
    </div>
  );
}
