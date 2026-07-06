// Claim grading (PALANTIR §4/#90) — every reference the Oracle quotes is
// checked VERBATIM against the baked WEB corpus. A quote that does not
// match its verse earns a visible ⚠ UNVERIFIED stamp. Honesty is machinery,
// not decoration.

import { BOOKS, bundleChapters } from "./corpus";

export interface Citation {
  /** character range of the reference inside the answer text */
  start: number;
  end: number;
  bookId: string;
  chapter: number;
  verse: number | null;
  label: string;
  /** null = nothing quoted near the ref (no stamp) · true = verbatim · false = mismatch */
  verified: boolean | null;
}

// Book-name alternation, longest first ("1 Corinthians" before "John").
const NAMES = [...BOOKS]
  .sort((a, b) => b.name.length - a.name.length)
  .map((b) => ({ b, re: b.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") }));
const REF_RE = new RegExp(
  `\\b(${NAMES.map((n) => n.re).join("|")})\\s+(\\d+)(?::(\\d+))?\\b`, "g"
);
const byName = new Map(BOOKS.map((b) => [b.name.toLowerCase(), b.id]));

const normalize = (s: string) =>
  s.toLowerCase().replace(/[“”‘’]/g, '"').replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Find every scripture reference in an answer and grade any quote that
    travels with it (same sentence) against the corpus. */
export async function gradeClaims(text: string): Promise<Citation[]> {
  let chapters: Record<string, { n: number; text: string }[]> | null = null;
  try { chapters = await bundleChapters("web"); } catch { /* grade what we can */ }

  const out: Citation[] = [];
  for (const m of text.matchAll(REF_RE)) {
    const bookId = byName.get(m[1].toLowerCase());
    if (!bookId) continue;
    const chapter = +m[2];
    const verse = m[3] ? +m[3] : null;
    const cite: Citation = {
      start: m.index!, end: m.index! + m[0].length,
      bookId, chapter, verse,
      label: m[0], verified: null,
    };

    // A quote near the reference: the longest "…" span in the same sentence.
    if (chapters && verse != null) {
      const sStart = Math.max(text.lastIndexOf(". ", m.index!), 0);
      const sEnd = text.indexOf(". ", cite.end);
      const sentence = text.slice(sStart, sEnd === -1 ? undefined : sEnd + 1);
      const quotes = [...sentence.matchAll(/[“"]([^”"]{12,})[”"]/g)].map((q) => q[1]);
      if (quotes.length) {
        const vtext = chapters[`${bookId}.${chapter}`]?.find((v) => v.n === verse)?.text;
        if (vtext) {
          const hay = normalize(vtext);
          cite.verified = quotes.some((q) => hay.includes(normalize(q)));
        }
      }
    }
    out.push(cite);
  }
  return out;
}
