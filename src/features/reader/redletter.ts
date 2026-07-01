// Red letters — painted ONLY from data/red-letter.json, a dataset derived
// from the World English Bible's <wj> (words-of-Jesus) markup: a real
// red-letter edition, not vibes. Shape: { "jhn.1": "38-39,42-43", ... } —
// compact verse ranges; keys starting with "_" are provenance notes.

interface RedIndex { [chapterKey: string]: string }

let index: RedIndex | null = null;
let loading: Promise<void> | null = null;

function ensure(): void {
  if (index || loading) return;
  loading = fetch(`${import.meta.env.BASE_URL}data/red-letter.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .then((j: RedIndex) => { index = j; })
    .catch(() => { index = {}; });
}

function parseRanges(spec: string): Set<number> {
  const out = new Set<number>();
  for (const part of spec.split(",")) {
    const [a, b] = part.split("-").map((n) => parseInt(n, 10));
    if (Number.isNaN(a)) continue;
    for (let v = a; v <= (Number.isNaN(b) ? a : b); v++) out.add(v);
  }
  return out;
}

/** Verse numbers carrying the words of Jesus, or null while loading /
    if the chapter has none. Kicks the fetch on first ask. */
export function redLetterVerses(bookId: string, chapter: number): Set<number> | null {
  ensure();
  if (!index) return null;
  const spec = index[`${bookId}.${chapter}`];
  return typeof spec === "string" && spec.length ? parseRanges(spec) : null;
}
