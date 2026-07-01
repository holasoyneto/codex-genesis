// Scripture search. Network-served by bolls.life's find endpoint for the
// English corpora; results are sanitized like every other bolls text.
// (A local index over cached chapters can join the chain later — the
// signature won't change.)

import { TRANSLATIONS, bookById } from "./corpus";

const BOLLS_BOOK_TO_ID: Record<number, string> = {};
{
  // Rebuild the reverse of the engine's bolls numbering from book order —
  // ids 1..66 follow the canon order of the 66.
  const canon = [
    "gen","exo","lev","num","deu","jos","jdg","rut","1sa","2sa","1ki","2ki","1ch","2ch",
    "ezr","neh","est","job","psa","pro","ecc","sng","isa","jer","lam","ezk","dan","hos",
    "jol","amo","oba","jon","mic","nam","hab","zep","hag","zec","mal",
    "mat","mrk","luk","jhn","act","rom","1co","2co","gal","eph","php","col","1th","2th",
    "1ti","2ti","tit","phm","heb","jas","1pe","2pe","1jn","2jn","3jn","jud","rev",
  ];
  canon.forEach((id, i) => { BOLLS_BOOK_TO_ID[i + 1] = id; });
}

export interface SearchHit {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string; // sanitized, match still wrapped in <mark> pairs → split by caller
}

function sanitize(html: string): string {
  return html
    .replace(/<(S|sup)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(?!\/?mark\b)[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchScripture(translation: string, query: string, limit = 24): Promise<SearchHit[]> {
  const t = TRANSLATIONS.find((x) => x.id === translation && x.bolls) ?? TRANSLATIONS.find((x) => x.bolls);
  if (!t) return [];
  const r = await fetch(
    `https://bolls.life/find/${t.bolls}/?search=${encodeURIComponent(query)}&match_case=false&match_whole=false&limit=${limit}`
  );
  if (!r.ok) throw new Error(`search: ${r.status}`);
  const rows = (await r.json()) as { book: number; chapter: number; verse: number; text: string }[];
  return rows
    .map((row) => {
      const bookId = BOLLS_BOOK_TO_ID[row.book];
      const b = bookId ? bookById.get(bookId) : undefined;
      if (!bookId || !b) return null;
      return { bookId, bookName: b.name, chapter: row.chapter, verse: row.verse, text: sanitize(row.text) };
    })
    .filter((h): h is SearchHit => !!h);
}
