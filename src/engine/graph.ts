// The fused graph (PALANTIR §2) — ONE traversable structure over verses
// AND entities. TSK cross-reference edges, ontology relations, and entity
// mentions fuse into a single adjacency; every edge carries its source, so
// a path can show its provenance at every hop. Lazy-built once, cached.
//
// Node ids: verses are "bookId.chapter.verse" (dots), entities are ontology
// ids (no dots) — the two namespaces cannot collide.

import { loadOntology } from "./ontology";

export type EdgeSource = "tsk" | "ontology" | "mention";
export interface Edge { to: string; src: EdgeSource }

export interface Graph {
  /** node id → undirected neighbors */
  adj: Map<string, Edge[]>;
  verseCount: number;
  entityCount: number;
  edgeCount: number;
}

let loading: Promise<Graph> | null = null;
let loaded: Graph | null = null;

/** The graph if it has finished building, else null (for sync HUD reads). */
export function getLoadedGraph(): Graph | null { return loaded; }

export function loadGraph(): Promise<Graph> {
  if (loading) return loading;
  loading = (async () => {
    const adj = new Map<string, Edge[]>();
    let edgeCount = 0;
    const link = (a: string, b: string, src: EdgeSource) => {
      (adj.get(a) ?? adj.set(a, []).get(a)!).push({ to: b, src });
      (adj.get(b) ?? adj.set(b, []).get(b)!).push({ to: a, src });
      edgeCount++;
    };

    // 1 · TSK — Torrey's 432k threads (undirected: an answer runs both ways).
    const r = await fetch(`${import.meta.env.BASE_URL}data/crossrefs.json`);
    if (!r.ok) throw new Error(`crossrefs: ${r.status}`);
    const tsk = (await r.json()) as { verses: Record<string, string[]> };
    const verseIds = new Set<string>();
    for (const [from, tos] of Object.entries(tsk.verses)) {
      verseIds.add(from);
      for (const to of tos) { verseIds.add(to); link(from, to, "tsk"); }
    }

    // 2 · Ontology relations — entity ↔ entity, evidence-bearing.
    // 3 · Mentions — entity ↔ every verse that names it.
    let entityCount = 0;
    try {
      const ont = await loadOntology();
      entityCount = ont.entities.size;
      for (const rel of ont.relations) link(rel.from, rel.to, "ontology");
      for (const m of ont.mentions) link(m.entityId, m.ref, "mention");
    } catch { /* the graph still stands on TSK alone */ }

    const g: Graph = { adj, verseCount: verseIds.size, entityCount, edgeCount };
    loaded = g;
    return g;
  })().catch((e) => { loading = null; throw e; });
  return loading;
}

export interface PathHop { id: string; via: EdgeSource | null }

/** Shortest route between two nodes (BFS — edges are unweighted). */
export function path(g: Graph, a: string, b: string, maxNodes = 400_000): PathHop[] | null {
  if (a === b) return [{ id: a, via: null }];
  if (!g.adj.has(a) || !g.adj.has(b)) return null;
  const prev = new Map<string, { id: string; via: EdgeSource }>();
  const queue: string[] = [a];
  const seen = new Set<string>([a]);
  let qi = 0;
  while (qi < queue.length && seen.size < maxNodes) {
    const cur = queue[qi++];
    for (const e of g.adj.get(cur) ?? []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, { id: cur, via: e.src });
      if (e.to === b) {
        const hops: PathHop[] = [];
        let at: string | undefined = b;
        while (at) {
          const p = prev.get(at);
          hops.unshift({ id: at, via: p?.via ?? null });
          at = p?.id;
        }
        return hops;
      }
      queue.push(e.to);
    }
  }
  return null;
}

/** Ego network: every node within `radius` hops, with its distance. */
export function near(g: Graph, node: string, radius = 1, cap = 600): Map<string, number> {
  const out = new Map<string, number>([[node, 0]]);
  let frontier = [node];
  for (let d = 1; d <= radius && out.size < cap; d++) {
    const next: string[] = [];
    for (const cur of frontier) {
      for (const e of g.adj.get(cur) ?? []) {
        if (out.has(e.to) || out.size >= cap) continue;
        out.set(e.to, d);
        next.push(e.to);
      }
    }
    frontier = next;
  }
  return out;
}

/** Bounded label propagation over the seed's neighborhood — the graph's
    quiet answer to "what belongs together here". Deterministic order. */
export function families(g: Graph, seed: string, radius = 2, iterations = 4): Map<string, number> {
  const ego = near(g, seed, radius, 800);
  const nodes = [...ego.keys()].sort();
  const label = new Map<string, number>(nodes.map((n, i) => [n, i]));
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    for (const n of nodes) {
      const votes = new Map<number, number>();
      for (const e of g.adj.get(n) ?? []) {
        const l = label.get(e.to);
        if (l != null) votes.set(l, (votes.get(l) ?? 0) + 1);
      }
      if (!votes.size) continue;
      let best = label.get(n)!, bestN = 0;
      for (const [l, c] of votes) if (c > bestN || (c === bestN && l < best)) { best = l; bestN = c; }
      if (best !== label.get(n)) { label.set(n, best); changed = true; }
    }
    if (!changed) break;
  }
  return label;
}
