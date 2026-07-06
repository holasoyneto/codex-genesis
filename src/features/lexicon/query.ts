// The lexicon's inbox — a lemma may arrive from the omnibar before the
// instrument mounts.

let current: string | null = null;
const subs = new Set<(q: string) => void>();

export function setLemma(q: string): void {
  current = q;
  subs.forEach((f) => f(q));
}
export function getLemma(): string | null { return current; }
export function subscribeLemma(f: (q: string) => void): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}
