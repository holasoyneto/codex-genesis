// The Galaxy's inbox — PATH and NEAR arrive from the omnibar before the
// instrument mounts, so the query lives here (module state + subscription),
// not in a prop the veil cannot thread.

export type GalaxyQuery =
  | { kind: "path"; a: string; b: string }
  | { kind: "near"; ref: string; radius?: number }
  | { kind: "families"; ref: string; radius?: number };

let current: GalaxyQuery | null = null;
const subs = new Set<(q: GalaxyQuery | null) => void>();

export function setGalaxyQuery(q: GalaxyQuery | null): void {
  current = q;
  subs.forEach((f) => f(q));
}
export function getGalaxyQuery(): GalaxyQuery | null { return current; }
export function subscribeGalaxyQuery(f: (q: GalaxyQuery | null) => void): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}
