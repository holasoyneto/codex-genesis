// The Galaxy's sky — deterministic geometry. Every verse gets a fixed
// position computed from book/chapter/verse alone (a hash, no bake step):
// books are arcs along a spiral canon ring, chapters walk the arc, verses
// scatter around the chapter point like a small cluster. Entities sit at
// the centroid of their mentions — named gold bodies among the stars.

import { BOOKS, bookById } from "@/engine/corpus";
import type { Ontology } from "@/engine/ontology";

export interface Star { x: number; y: number; id: string }
export interface BookArc {
  id: string; name: string;
  t0: number; t1: number;              // spiral parameter range
  lx: number; ly: number;              // label anchor
  testament: string;
}
export interface Body { x: number; y: number; id: string; name: string; weight: number }

const TURNS = 2.25;                    // the canon winds just over two turns
const R0 = 120, R1 = 520;              // spiral inner/outer radius

// The spiral: t ∈ [0,1] → world point.
export function spiral(t: number, wobble = 0): { x: number; y: number } {
  const angle = t * TURNS * Math.PI * 2 - Math.PI / 2;
  const r = R0 + (R1 - R0) * t + wobble;
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

// Deterministic 32-bit hash → [0,1).
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

// Cumulative chapter fractions — each book's share of the spiral is its
// share of the canon's chapters (the 66; beyond-books join later phases).
const CANON = BOOKS.filter((b) => b.testament === "OT" || b.testament === "NT");
const TOTAL_CH = CANON.reduce((a, b) => a + b.chapters, 0);
const bookT = new Map<string, { t0: number; t1: number }>();
{
  let acc = 0;
  for (const b of CANON) {
    const t0 = acc / TOTAL_CH;
    acc += b.chapters;
    bookT.set(b.id, { t0, t1: acc / TOTAL_CH });
  }
}

export function versePos(bookId: string, chapter: number, verse: number): { x: number; y: number } | null {
  const span = bookT.get(bookId);
  const book = bookById.get(bookId);
  if (!span || !book) return null;
  const t = span.t0 + (span.t1 - span.t0) * ((chapter - 0.5) / book.chapters);
  const key = `${bookId}.${chapter}.${verse}`;
  // verses cluster around the chapter point — a small deterministic scatter
  const a = hash01(key) * Math.PI * 2;
  const d = 4 + hash01(key + "*") * 26;
  const p = spiral(t, (hash01(key + "~") - 0.5) * 30);
  return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
}

export function verseKeyPos(id: string): { x: number; y: number } | null {
  const m = id.match(/^(.+)\.(\d+)\.(\d+)$/);
  return m ? versePos(m[1], +m[2], +m[3]) : null;
}

/** The canon ring's own center and radius, from the arc geometry itself
    (not assumed to be world-origin — the spiral's start angle and turn
    count make it asymmetric). Used to auto-fit the initial view and on
    resize so the ring is always centered in the window (audit defect #3:
    the ring rendered off-center, dead space top-left). */
export function ringBBox(): { cx: number; cy: number; r: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const p = spiral(i / steps, 46);
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, r: Math.max(maxX - minX, maxY - minY) / 2 };
}

export function bookArcs(): BookArc[] {
  return CANON.map((b) => {
    const { t0, t1 } = bookT.get(b.id)!;
    const mid = spiral((t0 + t1) / 2, 46);
    return { id: b.id, name: b.name, t0, t1, lx: mid.x, ly: mid.y, testament: b.testament };
  });
}

/** All stars, computed once (<100ms for ~31k verse keys). */
export function starField(verseIds: Iterable<string>): Star[] {
  const out: Star[] = [];
  for (const id of verseIds) {
    const p = verseKeyPos(id);
    if (p) out.push({ x: p.x, y: p.y, id });
  }
  return out;
}

/** Entities as gold bodies at the centroid of their mentions. */
export function entityBodies(ont: Ontology, min = 4): Body[] {
  const out: Body[] = [];
  for (const [id, mentions] of ont.mentionsByEntity) {
    if (mentions.length < min) continue;
    let sx = 0, sy = 0, n = 0;
    for (const m of mentions) {
      const p = verseKeyPos(m.ref);
      if (p) { sx += p.x; sy += p.y; n++; }
    }
    if (!n) continue;
    const e = ont.entities.get(id);
    out.push({ x: sx / n, y: sy / n, id, name: e?.names[0] ?? id, weight: mentions.length });
  }
  return out.sort((a, b) => b.weight - a.weight);
}
