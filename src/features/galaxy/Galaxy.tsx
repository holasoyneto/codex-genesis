// THE GALAXY — the whole canon as a sky. Books are arcs on a spiral ring,
// verses are stars, entities are named gold bodies. PATH burns a gold
// trail; NEAR ignites a neighborhood; a click on a star turns the reader
// there. The canonical proof of EXOGRAMMAR law 3: 415K cross-references
// became a sky, not a list.

import { useEffect, useRef, useState } from "react";
import { useApp, goTo, getState } from "@/kernel/store";
import { closePanel } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { bookById } from "@/engine/corpus";
import { loadGraph, path as graphPath, near as graphNear, type Graph, type PathHop } from "@/engine/graph";
import { loadOntology, type Ontology } from "@/engine/ontology";
import { starField, bookArcs, entityBodies, verseKeyPos, spiral, ringBBox, type Star, type Body } from "./layout";
import { subscribeGalaxyQuery, getGalaxyQuery, type GalaxyQuery } from "./query";
import "./galaxy.css";

interface View { x: number; y: number; s: number } // world offset + scale

interface Scene {
  graph: Graph;
  ont: Ontology | null;
  stars: Star[];
  bodies: Body[];
}

const label = (id: string) => {
  const m = id.match(/^(.+)\.(\d+)\.(\d+)$/);
  if (!m) return id;
  return `${bookById.get(m[1])?.name ?? m[1]} ${m[2]}:${m[3]}`;
};

export function Galaxy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursor = useApp((s) => s.cursor);
  const [scene, setScene] = useState<Scene | null>(null);
  const [query, setQuery] = useState<GalaxyQuery | null>(getGalaxyQuery());
  const viewRef = useRef<View>({ x: 0, y: 0, s: 0.55 });
  const flyRef = useRef<{ tx: number; ty: number; ts: number } | null>(null);
  const drawRef = useRef<() => void>(() => {});
  // True once the user has manually panned/zoomed — auto-fit then stops
  // fighting their input (defect #3: initial view was off-center; the
  // canon ring bbox now drives the fit, re-applied on resize until touched).
  const userMovedRef = useRef(false);
  const [result, setResult] = useState<{ trail?: PathHop[]; glow?: Map<string, number>; note: string } | null>(null);

  // Build the scene once — graph + ontology + deterministic star field.
  useEffect(() => {
    let live = true;
    (async () => {
      const graph = await loadGraph();
      let ont: Ontology | null = null;
      try { ont = await loadOntology(); } catch { /* stars still shine */ }
      const verseIds = [...graph.adj.keys()].filter((k) => k.includes("."));
      const t0 = performance.now();
      const stars = starField(verseIds);
      const bodies = ont ? entityBodies(ont) : [];
      if (import.meta.env.DEV) console.debug(`[galaxy] ${stars.length} stars in ${Math.round(performance.now() - t0)}ms`);
      if (live) setScene({ graph, ont, stars, bodies });
    })().catch(() => { /* the HUD stays honest below */ });
    return () => { live = false; };
  }, []);

  // Queries arrive from the omnibar (galaxy · path a b · near ref).
  useEffect(() => subscribeGalaxyQuery(setQuery), []);

  // Resolve the active query against the graph.
  useEffect(() => {
    if (!scene) return;
    if (!query) { setResult(null); return; }
    if (query.kind === "path") {
      const trail = graphPath(scene.graph, query.a, query.b);
      setResult({
        trail: trail ?? undefined,
        note: trail
          ? `PATH ${label(query.a)} → ${label(query.b)} · ${trail.length - 1} hops`
          : `PATH ${label(query.a)} → ${label(query.b)} · no route`,
      });
    } else {
      const glow = graphNear(scene.graph, query.ref, query.radius ?? 1);
      setResult({ glow, note: `NEAR ${label(query.ref)} · ${glow.size - 1} neighbors` });
    }
  }, [scene, query]);

  // Fly-to on cursor change — the sky follows the reader.
  useEffect(() => {
    const p = verseKeyPos(`${cursor.bookId}.${cursor.chapter}.${cursor.verse ?? 1}`);
    if (p) flyRef.current = { tx: p.x, ty: p.y, ts: performance.now() };
    requestAnimationFrame(() => drawRef.current());
  }, [cursor.bookId, cursor.chapter, cursor.verse]);

  // Auto-fit: center the canon ring's own bbox in the window and pick a
  // scale that lets it breathe. Runs once per scene load and again on
  // every canvas resize, until the user's own pan/zoom takes over.
  const fit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { cx, cy, r } = ringBBox();
    const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600;
    const s = Math.min(6, Math.max(0.15, (Math.min(w, h) * 0.42) / (r || 1)));
    viewRef.current = { x: cx, y: cy, s };
  };

  // The renderer — DPR-aware, draws on demand (and during flight).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    if (!userMovedRef.current) fit();

    const css = () => getComputedStyle(document.documentElement);
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
      }
      const v = viewRef.current;

      // flight: ease toward the target
      const fly = flyRef.current;
      if (fly) {
        const k = 0.14;
        v.x += (fly.tx - v.x) * k;
        v.y += (fly.ty - v.y) * k;
        if (Math.abs(fly.tx - v.x) + Math.abs(fly.ty - v.y) < 0.5) flyRef.current = null;
        else raf = requestAnimationFrame(draw);
      }

      const style = css();
      const fg = style.getPropertyValue("--fg").trim() || "#dbe4f0";
      const dim = style.getPropertyValue("--fg-dim").trim() || "#8295ae";
      const gold = style.getPropertyValue("--gold").trim() || "#d4af5f";
      const accent = style.getPropertyValue("--accent").trim() || "#5cc8ff";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const toScreen = (p: { x: number; y: number }) => ({
        x: (p.x - v.x) * v.s + w / 2,
        y: (p.y - v.y) * v.s + h / 2,
      });

      // book arcs — the canon ring
      ctx.strokeStyle = dim; ctx.globalAlpha = 0.28; ctx.lineWidth = 1;
      for (const b of bookArcs()) {
        ctx.beginPath();
        const steps = 14;
        for (let i = 0; i <= steps; i++) {
          const p = toScreen(spiral(b.t0 + ((b.t1 - b.t0) * i) / steps, 46));
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.stroke();
      }
      // book names when the sky is close enough
      if (v.s > 0.75) {
        ctx.globalAlpha = 0.6; ctx.fillStyle = dim;
        ctx.font = "9px ui-monospace, Menlo, monospace";
        for (const b of bookArcs()) {
          const p = toScreen({ x: b.lx, y: b.ly });
          if (p.x > -40 && p.x < w + 40 && p.y > -10 && p.y < h + 10)
            ctx.fillText(b.name.toUpperCase(), p.x, p.y);
        }
      }

      // stars
      ctx.globalAlpha = 0.55; ctx.fillStyle = fg;
      const r = Math.max(0.6, Math.min(1.6, v.s));
      for (const s of scene.stars) {
        const x = (s.x - v.x) * v.s + w / 2;
        const y = (s.y - v.y) * v.s + h / 2;
        if (x < -2 || x > w + 2 || y < -2 || y > h + 2) continue;
        ctx.fillRect(x, y, r, r);
      }

      // NEAR ignition
      if (result?.glow) {
        for (const [id, d] of result.glow) {
          const p = verseKeyPos(id) ?? bodyPos(id);
          if (!p) continue;
          const sp = toScreen(p);
          ctx.globalAlpha = d === 0 ? 0.95 : 0.6 / d;
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, d === 0 ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // PATH — the gold trail
      if (result?.trail) {
        ctx.globalAlpha = 0.9; ctx.strokeStyle = gold; ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (const hop of result.trail) {
          const p = verseKeyPos(hop.id) ?? bodyPos(hop.id);
          if (!p) continue;
          const sp = toScreen(p);
          started ? ctx.lineTo(sp.x, sp.y) : ctx.moveTo(sp.x, sp.y);
          started = true;
        }
        ctx.stroke();
        ctx.fillStyle = gold;
        for (const hop of result.trail) {
          const p = verseKeyPos(hop.id) ?? bodyPos(hop.id);
          if (!p) continue;
          const sp = toScreen(p);
          ctx.beginPath(); ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2); ctx.fill();
        }
      }

      // entities — named gold bodies
      ctx.fillStyle = gold;
      for (const b of scene.bodies) {
        const p = toScreen(b);
        if (p.x < -30 || p.x > w + 30 || p.y < -10 || p.y > h + 10) continue;
        const rad = Math.min(5, 1.6 + Math.log2(b.weight) * 0.55);
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad * Math.min(1.4, v.s + 0.4), 0, Math.PI * 2); ctx.fill();
      }
      // Entity labels — zoom-dependent culling + simple collision avoidance
      // (audit defect #4: labels clumped into an unreadable knot near dense
      // regions like Joseph/Moses/Egypt). Strategy: at low zoom show only
      // the top-N most-mentioned bodies IN VIEW; as the view zooms in, both
      // the cap relaxes and the minimum on-screen spacing shrinks, so more
      // names appear only once there's room for them. A label that would
      // land within its neighbor's footprint is skipped outright rather
      // than overlapping — legibility over completeness.
      if (v.s > 0.5) {
        ctx.font = "10px ui-monospace, Menlo, monospace";
        const cap = v.s > 1.6 ? 300 : v.s > 1.1 ? 80 : v.s > 0.75 ? 36 : 16;
        const minGap = v.s > 1.6 ? 16 : v.s > 1.1 ? 22 : 30; // px between label anchors
        const inView = scene.bodies
          .map((b) => ({ b, p: toScreen(b) }))
          .filter(({ p }) => p.x > -60 && p.x < w + 60 && p.y > -10 && p.y < h + 10)
          // already weight-sorted from entityBodies(); top-N by importance first
          .slice(0, cap);
        const placed: { x: number; y: number }[] = [];
        const fade = Math.min(1, (v.s - 0.5) / 0.4); // fades in as you zoom past 0.5
        ctx.globalAlpha = 0.8 * fade;
        ctx.fillStyle = gold;
        for (const { b, p } of inView) {
          const lx = p.x + 6, ly = p.y + 3;
          let collide = false;
          for (const q of placed) {
            if (Math.abs(q.x - lx) < minGap && Math.abs(q.y - ly) < 12) { collide = true; break; }
          }
          if (collide) continue;
          placed.push({ x: lx, y: ly });
          ctx.fillText(b.name, lx, ly);
        }
      }

      // the reader's place — a quiet ring
      const here = verseKeyPos(`${cursor.bookId}.${cursor.chapter}.${cursor.verse ?? 1}`);
      if (here) {
        const p = toScreen(here);
        ctx.globalAlpha = 0.9; ctx.strokeStyle = accent; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const bodyPos = (id: string) => scene.bodies.find((b) => b.id === id) ?? null;

    drawRef.current = draw;
    draw();

    // pan + zoom — the thing itself is the control. One finger pans;
    // two pinch; the wheel zooms about the pointer.
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = 0, lastPinch = 0;
    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) moved = 0;
      canvas.setPointerCapture(e.pointerId);
      flyRef.current = null;
    };
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const v = viewRef.current;
      if (pointers.size === 2) {
        // pinch: scale about the midpoint
        const [a, b] = [...pointers.values()];
        const before = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        p.x = e.clientX; p.y = e.clientY;
        const [a2, b2] = [...pointers.values()];
        const after = Math.hypot(a2.x - b2.x, a2.y - b2.y) || 1;
        const rect = canvas.getBoundingClientRect();
        const mx = (a2.x + b2.x) / 2 - rect.left - rect.width / 2;
        const my = (a2.y + b2.y) / 2 - rect.top - rect.height / 2;
        const wx = mx / v.s + v.x, wy = my / v.s + v.y;
        v.s = Math.min(6, Math.max(0.15, v.s * (after / before)));
        v.x = wx - mx / v.s; v.y = wy - my / v.s;
        moved = 99; lastPinch = performance.now();
        userMovedRef.current = true;
        requestAnimationFrame(draw);
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      v.x -= dx / v.s; v.y -= dy / v.s;
      if (moved > 5) userMovedRef.current = true;
      requestAnimationFrame(draw);
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size > 0 || moved > 5 || performance.now() - lastPinch < 250) return;
      // a click: the nearest star within reach turns the reader
      const v = viewRef.current;
      const rect = canvas.getBoundingClientRect();
      const wx = (e.clientX - rect.left - rect.width / 2) / v.s + v.x;
      const wy = (e.clientY - rect.top - rect.height / 2) / v.s + v.y;
      const reach = 10 / v.s;
      let best: Star | null = null, bd = reach * reach;
      for (const s of scene.stars) {
        const d = (s.x - wx) ** 2 + (s.y - wy) ** 2;
        if (d < bd) { bd = d; best = s; }
      }
      if (best) {
        const m = best.id.match(/^(.+)\.(\d+)\.(\d+)$/);
        if (m) goTo({ bookId: m[1], chapter: +m[2], verse: +m[3] });
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      const wx = mx / v.s + v.x, wy = my / v.s + v.y;
      v.s = Math.min(6, Math.max(0.15, v.s * Math.exp(-e.deltaY * 0.0016)));
      v.x = wx - mx / v.s; v.y = wy - my / v.s;
      userMovedRef.current = true;
      requestAnimationFrame(draw);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(() => {
      // re-fit on resize (defect #3) until the user has taken the wheel
      if (!userMovedRef.current) fit();
      requestAnimationFrame(draw);
    });
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, [scene, result, cursor.bookId, cursor.chapter, cursor.verse]);

  const here = bookById.get(cursor.bookId);
  return (
    <div className="gx-galaxy" role="region" aria-label="The Galaxy">
      <canvas ref={canvasRef} className="gx-galaxy-canvas" data-stars={scene?.stars.length ?? 0} />
      <div className="gx-galaxy-hud glass-sm glass">
        <span className="gx-instrument-title">THE GALAXY</span>
        <span className="gx-galaxy-note">
          {!scene
            ? "gathering the sky…"
            : result
              ? result.note
              : `${scene.stars.length.toLocaleString()} stars · ${scene.bodies.length} named bodies · at ${here?.name} ${cursor.chapter}${getState().cursor.verse ? ":" + getState().cursor.verse : ""}`}
        </span>
        <span className="gx-galaxy-prov">TSK · TORREY 1880 + CODEX ONTOLOGY</span>
      </div>
      {useInWindow() ? null : (
        <button className="gx-galaxy-close" aria-label="Close galaxy" onClick={() => closePanel("galaxy")}>×</button>
      )}
    </div>
  );
}
