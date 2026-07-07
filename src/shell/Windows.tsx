// The desk's window manager. Instruments open as movable, resizable glass
// windows inside the instruments region — several at once, geometry
// persisted in the ONE store, z-order = position in wm.open (last = front).
// Buttery by construction: drags and resizes mutate the element's style
// directly (transform / width / height) and commit to the store once, on
// release. No dependency, no re-layout during motion.

import { createContext, useEffect, useRef } from "react";
import {
  useApp, focusPanel, closePanel, setPanelGeo, getState, toggleReaderLink, type WinGeo,
} from "@/kernel/store";
import { getFeature } from "@/kernel/registry";
import "./windows.css";

/** The window instance id ("threads", "reader@wlc") — surfaces that can be
    spawned more than once read their pin from here. null = the sacred
    center (the main reader outside any window). */
export const WinContext = createContext<string | null>(null);

const PAD = 8;            // breathing room to the shell's edges
const TOP = 44;           // the trace strip stays sovereign
const SNAP = 12;          // edge magnetism
const MIN_W = 280, MIN_H = 200;

function viewport() { return { vw: window.innerWidth, vh: window.innerHeight }; }

/** Default geometry: most instruments dock right as a tall column; the
    Galaxy is born big — a sky needs room. Cascade avoids exact stacking. */
export function defaultGeo(id: string, index: number): WinGeo {
  const { vw, vh } = viewport();
  if (id === "galaxy") {
    const w = Math.min(860, vw - 2 * PAD), h = Math.min(620, vh - TOP - PAD);
    return { x: Math.max(PAD, (vw - w) / 2), y: Math.max(TOP, (vh - h) / 2), w, h };
  }
  const w = 360, h = Math.min(600, vh - TOP - PAD);
  return {
    x: Math.max(PAD, vw - w - PAD - index * 28),
    y: Math.min(TOP + index * 28, Math.max(TOP, vh - MIN_H)),
    w, h,
  };
}

/** No window may ever be lost: size fits the viewport, the title bar stays
    reachable. Applied on release, on viewport resize, and on rehydrate. */
export function clamp(g: WinGeo): WinGeo {
  const { vw, vh } = viewport();
  const w = Math.min(Math.max(g.w, MIN_W), vw - 2 * PAD);
  const h = Math.min(Math.max(g.h, MIN_H), vh - TOP - PAD);
  // Fully contained: no window may hang off-screen — content is never cut.
  const x = Math.min(Math.max(g.x, PAD), vw - PAD - w);
  const y = Math.min(Math.max(g.y, TOP), vh - PAD - h);
  return { x, y, w, h };
}

function snap(g: WinGeo): WinGeo {
  const { vw, vh } = viewport();
  let { x, y } = g;
  if (Math.abs(x - PAD) < SNAP) x = PAD;
  if (Math.abs(x + g.w - (vw - PAD)) < SNAP) x = vw - PAD - g.w;
  if (Math.abs(y - TOP) < SNAP) y = TOP;
  if (Math.abs(y + g.h - (vh - PAD)) < SNAP) y = vh - PAD - g.h;
  return { ...g, x, y };
}

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: Handle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

function Win({ id, index, front }: { id: string; index: number; front: boolean }) {
  // "reader@wlc" is an instance of the reader feature pinned to WLC.
  const featureId = id.split("@")[0];
  const f = getFeature(featureId);
  const geo = useApp((s) => s.wm.geo[id]) ?? defaultGeo(id, index);
  const reader = useApp((s) => s.readers[id]);
  const ref = useRef<HTMLDivElement>(null);
  const F = f?.surfaces.main;
  if (!f || !F) return null;
  const title = reader ? `${f.title} · ${reader.translation.toUpperCase()}` : f.title;

  const commit = (g: WinGeo) => setPanelGeo(id, clamp(snap(g)));

  const onDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    focusPanel(id);
    const el = ref.current!;
    const sx = e.clientX, sy = e.clientY;
    let dx = 0, dy = 0;
    const move = (ev: PointerEvent) => {
      dx = ev.clientX - sx; dy = ev.clientY - sy;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const up = () => {
      el.style.transform = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (dx || dy) commit({ ...geo, x: geo.x + dx, y: geo.y + dy });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onResize = (h: Handle) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    focusPanel(id);
    const el = ref.current!;
    const sx = e.clientX, sy = e.clientY;
    const g0 = { ...geo };
    let g1 = g0;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let { x, y, w, h: hh } = g0;
      if (h.includes("e")) w = g0.w + dx;
      if (h.includes("s")) hh = g0.h + dy;
      if (h.includes("w")) { w = g0.w - dx; x = g0.x + dx; }
      if (h.includes("n")) { hh = g0.h - dy; y = g0.y + dy; }
      if (w < MIN_W) { if (h.includes("w")) x -= MIN_W - w; w = MIN_W; }
      if (hh < MIN_H) { if (h.includes("n")) y -= MIN_H - hh; hh = MIN_H; }
      g1 = { x, y, w, h: hh };
      el.style.left = x + "px"; el.style.top = y + "px";
      el.style.width = w + "px"; el.style.height = hh + "px";
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      commit(g1);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <section
      ref={ref}
      className={"gx-win glass gx-enter" + (front ? " is-front" : "")}
      style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h, zIndex: index + 1 }}
      data-win={id}
      onPointerDown={() => { if (!front) focusPanel(id); }}
    >
      <header
        className="gx-win-bar"
        onPointerDown={onDrag}
        onDoubleClick={() => setPanelGeo(id, defaultGeo(id, index))}
      >
        <span className="gx-win-glyph" aria-hidden>{f.glyph}</span>
        <span className="gx-instrument-title gx-win-title">{title}</span>
        {reader ? (
          <button
            className={"gx-win-link" + (reader.linked ? " is-linked" : "")}
            title={reader.linked ? "Following the main cursor — click to detach" : "Detached — click to follow the main cursor"}
            aria-pressed={reader.linked}
            onClick={() => toggleReaderLink(id)}
          >{reader.linked ? "⛓" : "⛓̸"}</button>
        ) : null}
        <button className="gx-win-x" aria-label={`Close ${f.title}`} onClick={() => closePanel(id)}>×</button>
      </header>
      <div className="gx-win-body">
        <WinContext.Provider value={id}>
          <F />
        </WinContext.Provider>
      </div>
      {HANDLES.map((h) => (
        <div key={h} className={`gx-win-rz gx-win-rz-${h}`} onPointerDown={onResize(h)} />
      ))}
    </section>
  );
}

export function Windows() {
  const open = useApp((s) => s.wm.open);

  // Self-healing geometry: on viewport resize (and on mount, which heals a
  // persisted off-screen rehydrate), every window is clamped back on-screen.
  useEffect(() => {
    const heal = () => {
      const { wm } = getState();
      for (const id of wm.open) {
        const g = wm.geo[id];
        if (!g) continue;
        const c = clamp(g);
        if (c.x !== g.x || c.y !== g.y || c.w !== g.w || c.h !== g.h) setPanelGeo(id, c);
      }
    };
    heal();
    window.addEventListener("resize", heal);
    return () => window.removeEventListener("resize", heal);
  }, [open]);

  if (!open.length) return null;
  return (
    <div className="gx-windows">
      {open.map((id, i) => (
        <Win key={id} id={id} index={i} front={i === open.length - 1} />
      ))}
    </div>
  );
}
