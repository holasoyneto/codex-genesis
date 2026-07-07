// The Shell owns space. Regions, from back to front:
//   wallpaper   — the starfield (desk only)
//   scripture   — the sacred center column (the Reader's home)
//   instruments — feature windows (desk) / sheets (palm)
//   edge        — fixed chrome SLOTS, each owned exactly once (trace top-right)
//   whisper     — ONE notification lane (top-right on desk, below the edge
//                 slot; bottom on palm) — queued, collision-free by layout
//   veil        — modal surface (omnibar), one at a time
// No feature may position itself fixed; it renders into a region. Chrome
// that cannot choose its own place cannot collide.

import { useEffect, useState } from "react";
import {
  useApp, dismissWhisper, closeVeil, closePanel, getState, setState,
  historyBack, historyForward,
} from "@/kernel/store";
import { getFeature } from "@/kernel/registry";
import { bookById } from "@/engine/corpus";
import { Trace } from "./Trace";
import { Dock } from "./Dock";
import { Trail } from "./Trail";
import { Windows } from "./Windows";
import { PalmNav } from "./PalmNav";
import { dispatchKey } from "./keymap";
import "./shell.css";

/** One tree, two postures — the shell decides, features never ask. */
export function usePalm(): boolean {
  const [palm, setPalm] = useState(() => window.matchMedia("(max-width: 880px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 880px)");
    const on = () => setPalm(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return palm;
}

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
        <div key={w.id} className={`gx-whisper gx-whisper-${w.kind} glass gx-enter`}>
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

// Palm: the focused instrument as THE bottom sheet — drag handle, snap
// points (half / full), swipe-down to dismiss. Desk: the window manager.
function PalmSheet({ panel }: { panel: string }) {
  const [full, setFull] = useState(false);
  const ref = { el: null as HTMLElement | null };
  const F = getFeature(panel)?.surfaces.main;
  if (!F) return null;

  const onHandle = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = (ref.el = (e.currentTarget as HTMLElement).closest(".gx-instrument") as HTMLElement);
    const sy = e.clientY;
    let dy = 0;
    const move = (ev: PointerEvent) => {
      dy = ev.clientY - sy;
      if (dy > 0) el.style.transform = `translateY(${dy}px)`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.style.transform = "";
      if (dy > 110) closePanel(panel);        // swipe down — dismissed
      else if (dy < -60) setFull(true);       // pulled up — full
      else if (dy > 40 && full) setFull(false); // nudged down — half
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <aside className={"gx-instrument glass gx-enter" + (full ? " is-full" : "")}>
      <button
        className="gx-sheet-handle"
        aria-label={full ? "Collapse sheet" : "Expand sheet"}
        onPointerDown={onHandle}
        onDoubleClick={() => setFull((f) => !f)}
      ><span className="gx-sheet-grip" aria-hidden /></button>
      <div className="gx-sheet-body">
        <F />
      </div>
    </aside>
  );
}

function Instruments() {
  const palm = usePalm();
  const panel = useApp((s) => s.panel);
  if (!palm) return <Windows />;
  if (!panel) return null;
  return <PalmSheet key={panel} panel={panel} />;
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
  const palm = usePalm();
  const [immersed, setImmersed] = useState(false);
  // Immersive reading (palm): chrome yields on scroll-down, returns on
  // scroll-up or a touch. Scripture fills the screen.
  useEffect(() => {
    if (!palm) { setImmersed(false); return; }
    const el = document.querySelector(".gx-scripture");
    if (!el) return;
    let last = el.scrollTop;
    const onScroll = () => {
      const y = el.scrollTop;
      if (y > last + 6 && y > 64) setImmersed(true);
      else if (y < last - 6 || y <= 64) setImmersed(false);
      last = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [palm]);
  const zen = useApp((s) => s.zen);
  const hideReader = useApp((s) => s.hideReader);
  // Zen restores the Word — a hidden reader and zen cannot coexist.
  useEffect(() => { if (zen && getState().hideReader) setState({ hideReader: false }); }, [zen]);
  // Zen leaves on any touch, too.
  useEffect(() => {
    if (!zen) return;
    const out = () => setState({ zen: false });
    window.addEventListener("pointerdown", out);
    return () => window.removeEventListener("pointerdown", out);
  }, [zen]);
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
      // ⌘[ / ⌘] — the jump ledger, back and forward.
      if ((e.metaKey || e.ctrlKey) && (e.key === "[" || e.key === "]")) {
        e.preventDefault();
        if (e.key === "[") historyBack(); else historyForward();
        return;
      }
      const typing = !!(e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]");
      // Zen: ANY key returns the desk (the Word keeps the room until touched).
      if (!typing && getState().zen && e.key.toLowerCase() !== "z") {
        setState({ zen: false });
        return;
      }
      // The registry's declared keybindings — one listener, one truth.
      // Never inside inputs; never under a veil (esc there belongs to it).
      if (!typing && !getState().veil && dispatchKey(e)) {
        e.preventDefault();
        return;
      }
      if (typing || getState().veil || e.metaKey || e.ctrlKey || e.altKey) return;
      // ? — the generated help overlay.
      if (e.key === "?") {
        e.preventDefault();
        setState({ veil: { feature: "help" } });
        return;
      }
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
    <div
      className={
        "gx-shell" + (zen ? " is-zen" : "") + (hideReader ? " is-noreader" : "") +
        (immersed && !zen ? " is-immersed" : "")
      }
      onPointerDown={immersed ? () => setImmersed(false) : undefined}
    >
      <div className="gx-wallpaper" aria-hidden />
      <main className="gx-scripture">{children}</main>
      <Instruments />
      <div className="gx-edge">
        <Trace />
        <Dock />
        <Trail />
        {palm ? <PalmNav /> : null}
      </div>
      <WhisperLane />
      <Veil />
    </div>
  );
}
