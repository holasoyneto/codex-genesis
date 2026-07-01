// Reference parsing — forgiving by design. "john 3:16", "Jhon 3 16",
// "1 co 13", "psa 23" all resolve; a near-miss book name returns its
// best guess so the door never dead-ends on a typo.

import { BOOKS, type Book } from "@/engine/corpus";

export interface ParsedRef {
  book: Book;
  chapter: number;
  verse: number | null;
  /** true when the book matched only fuzzily — surface as "did you mean". */
  fuzzy: boolean;
}

function norm(s: string): string {
  // Punctuation SEPARATES, it never deletes — stripping the colon from
  // "Genesis 1:1" would weld it into "Genesis 11".
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Damerau-Levenshtein — transpositions cost 1, because "jhon" is a
// swapped-finger "john", not two independent errors. Plain Levenshtein
// scores that 2 and lets "Job" steal the match by canon order.
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  return dp[a.length][b.length];
}

function matchBook(raw: string): { book: Book; fuzzy: boolean } | null {
  const q = norm(raw);
  if (!q) return null;
  // exact id or exact name
  for (const b of BOOKS) {
    if (b.id === q || norm(b.name) === q) return { book: b, fuzzy: false };
  }
  // name prefix ("gen", "psal", "1 co")
  const prefix = BOOKS.filter((b) => norm(b.name).startsWith(q) || b.id.startsWith(q.replace(/ /g, "")));
  if (prefix.length) return { book: prefix[0], fuzzy: false };
  // typo tolerance
  let best: Book | null = null;
  let bestD = 3;
  for (const b of BOOKS) {
    const d = editDistance(q, norm(b.name));
    if (d < bestD) { bestD = d; best = b; }
  }
  return best ? { book: best, fuzzy: true } : null;
}

export function parseRef(input: string): ParsedRef | null {
  const m = norm(input).match(/^(\d?\s*[a-z][a-z ]*?)\s*(\d+)?(?:[\s:.]+(\d+))?$/);
  if (!m) return null;
  const hit = matchBook(m[1]);
  if (!hit) return null;
  const chapter = m[2] ? Math.min(parseInt(m[2], 10) || 1, hit.book.chapters) : 1;
  const verse = m[3] ? parseInt(m[3], 10) : null;
  return { book: hit.book, chapter: Math.max(1, chapter), verse, fuzzy: hit.fuzzy };
}
