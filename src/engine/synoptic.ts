// The synoptic parallels — pericope-level alignment across Matthew, Mark,
// Luke (and John where a parallel exists). Baked with provenance; the
// Compare instrument shows a quiet parallels row when the cursor sits
// inside an aligned pericope.

import type { ProvenanceMeta } from "@/kernel/Provenance";

export interface Pericope {
  id: string;
  title: string;
  matt: string | null;
  mark: string | null;
  luke: string | null;
  john: string | null;
}

interface SynopticFile { _meta: ProvenanceMeta; pericopes: Pericope[] }

// The dataset speaks full gospel names; the corpus speaks canon ids.
const GOSPEL_ID: Record<string, string> = { matt: "mat", mark: "mrk", luke: "luk", john: "jhn" };
const GOSPELS = ["matt", "mark", "luke", "john"] as const;

export interface ParallelRef {
  gospel: string;              // display name of the lane
  bookId: string;
  chapter: number;
  verse: number;
  label: string;               // "Matthew 1:1–17"
}

interface Span { bookId: string; c1: number; v1: number; c2: number; v2: number }

// "matt.1.1-17" (verses in one chapter) · "luke.3.23-38" · "matt.4.1-5.2"
function parseSpan(raw: string): Span | null {
  const m = raw.match(/^([a-z]+)\.(\d+)\.(\d+)(?:-(?:(\d+)\.)?(\d+))?$/);
  if (!m) return null;
  const bookId = GOSPEL_ID[m[1]];
  if (!bookId) return null;
  const c1 = +m[2], v1 = +m[3];
  const c2 = m[4] ? +m[4] : c1;
  const v2 = m[5] ? +m[5] : v1;
  return { bookId, c1, v1, c2, v2 };
}

let loading: Promise<SynopticFile> | null = null;
export function loadSynoptic(): Promise<SynopticFile> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}data/synoptic.json`)
      .then((r) => { if (!r.ok) throw new Error(`synoptic: ${r.status}`); return r.json(); });
  }
  return loading;
}

function inSpan(s: Span, bookId: string, chapter: number, verse: number | null): boolean {
  if (s.bookId !== bookId) return false;
  if (chapter < s.c1 || chapter > s.c2) return false;
  if (verse == null) return true; // a chapter-level cursor counts if the chapter overlaps
  if (chapter === s.c1 && verse < s.v1) return false;
  if (chapter === s.c2 && verse > s.v2) return false;
  return true;
}

export interface ParallelHit {
  pericope: Pericope;
  parallels: ParallelRef[];    // the OTHER gospels' openings
  meta: ProvenanceMeta;
}

/** The pericope (if any) the cursor sits in, with its sibling passages. */
export async function parallelsAt(
  bookId: string, chapter: number, verse: number | null
): Promise<ParallelHit | null> {
  const file = await loadSynoptic();
  for (const p of file.pericopes) {
    let here: string | null = null;
    for (const g of GOSPELS) {
      const raw = p[g];
      if (!raw) continue;
      const s = parseSpan(raw);
      if (s && inSpan(s, bookId, chapter, verse)) { here = g; break; }
    }
    if (!here) continue;
    const parallels: ParallelRef[] = [];
    for (const g of GOSPELS) {
      if (g === here) continue;
      const raw = p[g];
      if (!raw) continue;
      const s = parseSpan(raw);
      if (!s) continue;
      parallels.push({
        gospel: g,
        bookId: s.bookId,
        chapter: s.c1,
        verse: s.v1,
        label: `${g[0].toUpperCase()}${g.slice(1)} ${s.c1}:${s.v1}${s.c2 !== s.c1 ? `–${s.c2}:${s.v2}` : s.v2 !== s.v1 ? `–${s.v2}` : ""}`,
      });
    }
    return parallels.length ? { pericope: p, parallels, meta: file._meta } : null;
  }
  return null;
}
