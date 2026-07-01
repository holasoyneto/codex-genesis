// The corpus engine — one typed door to scripture text.
// Resolution chain, most-truthful first:
//   1. memory   (this session)
//   2. IndexedDB (previous sessions — offline works forever after first read)
//   3. baked bundle  /data/bibles/<id>.json  (wlc, sblgnt, beyond, …)
//   4. network mirrors (bolls.life → bible-api.com), then cached to (2)
// Every result carries `servedFrom` — honesty is load-bearing (v1's ⇄ chip).

import booksRaw from "./books.json";

export interface Book {
  id: string;
  name: string;
  testament: "OT" | "NT" | "DC" | "BYD";
  chapters: number;
}
export const BOOKS: Book[] = booksRaw as Book[];
export const bookById = new Map(BOOKS.map((b) => [b.id, b]));

export interface Verse { n: number; text: string }
export interface Chapter {
  translation: string;
  bookId: string;
  chapter: number;
  verses: Verse[];
  servedFrom: "memory" | "cache" | "bundle" | "bolls" | "bible-api";
}

// bookId → bolls.life numeric id (1=Genesis … 66=Revelation)
const BOLLS_ID: Record<string, number> = {
  gen: 1, exo: 2, lev: 3, num: 4, deu: 5, jos: 6, jdg: 7, rut: 8,
  "1sa": 9, "2sa": 10, "1ki": 11, "2ki": 12, "1ch": 13, "2ch": 14,
  ezr: 15, neh: 16, est: 17, job: 18, psa: 19, pro: 20, ecc: 21, sng: 22,
  isa: 23, jer: 24, lam: 25, ezk: 26, dan: 27, hos: 28, jol: 29, amo: 30,
  oba: 31, jon: 32, mic: 33, nam: 34, hab: 35, zep: 36, hag: 37, zec: 38, mal: 39,
  mat: 40, mrk: 41, luk: 42, jhn: 43, act: 44, rom: 45,
  "1co": 46, "2co": 47, gal: 48, eph: 49, php: 50, col: 51,
  "1th": 52, "2th": 53, "1ti": 54, "2ti": 55, tit: 56, phm: 57, heb: 58, jas: 59,
  "1pe": 60, "2pe": 61, "1jn": 62, "2jn": 63, "3jn": 64, jud: 65, rev: 66,
};

// Translations with a baked bundle in /data/bibles.
const BUNDLED = new Set(["wlc", "sblgnt", "beyond", "charles", "eth-en", "zohrab"]);
// bolls translation codes for the common English corpora.
const BOLLS_CODE: Record<string, string> = { kjv: "KJV", web: "WEB", asv: "ASV", ylt: "YLT" };

// ── caches ─────────────────────────────────────────────────────────────
const memory = new Map<string, Chapter>();
const bundles = new Map<string, Promise<Record<string, Verse[]>>>();

const DB_NAME = "codex-genesis";
const DB_STORE = "chapters";
let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}
async function idbGet(key: string): Promise<Chapter | undefined> {
  try {
    const d = await db();
    return await new Promise((resolve) => {
      const req = d.transaction(DB_STORE).objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result as Chapter | undefined);
      req.onerror = () => resolve(undefined);
    });
  } catch { return undefined; }
}
async function idbPut(key: string, value: Chapter): Promise<void> {
  try {
    const d = await db();
    d.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).put(value, key);
  } catch { /* private mode */ }
}

// ── sources ────────────────────────────────────────────────────────────
async function fromBundle(translation: string, bookId: string, chapter: number): Promise<Verse[] | null> {
  if (!BUNDLED.has(translation)) return null;
  if (!bundles.has(translation)) {
    bundles.set(translation, fetch(`/data/bibles/${translation}.json`)
      .then((r) => { if (!r.ok) throw new Error(`bundle ${translation}: ${r.status}`); return r.json(); })
      .then((j: { chapters: Record<string, Verse[]> }) => j.chapters));
  }
  const chapters = await bundles.get(translation)!;
  return chapters[`${bookId}.${chapter}`] ?? null;
}

function sanitizeBolls(html: string): string {
  return html
    // Markup whose CONTENT is not scripture: <S> carries Strong's numbers,
    // <sup> carries KJV margin notes ("comprehended: or, did not admit").
    // Both must go with their contents, before the generic tag strip.
    .replace(/<S>[^<]*<\/S>/gi, "")
    .replace(/<sup>[\s\S]*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    // bolls.life leaks Strong's numbers — sometimes glued to the preceding
    // word ("man444"), sometimes standalone ("man 444 that"). Scripture
    // text never carries inline integers; strip both forms. (Lesson
    // inherited from v1's bible.js.)
    .replace(/(?<=[a-zA-ZéÀ-ſ'])\d+/g, "")
    .replace(/(?<=^|[\s.,;:!?()'"—–-])\d{2,5}(?=[\s.,;:!?()'"—–-]|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fromBolls(translation: string, bookId: string, chapter: number): Promise<Verse[] | null> {
  const code = BOLLS_CODE[translation];
  const bid = BOLLS_ID[bookId];
  if (!code || !bid) return null;
  const r = await fetch(`https://bolls.life/get-text/${code}/${bid}/${chapter}/`);
  if (!r.ok) throw new Error(`bolls ${translation} ${bookId}.${chapter}: ${r.status}`);
  const rows = (await r.json()) as { verse: number; text: string }[];
  return rows.map((v) => ({ n: v.verse, text: sanitizeBolls(String(v.text || "")) }));
}

async function fromBibleApi(translation: string, bookId: string, chapter: number): Promise<Verse[] | null> {
  const book = bookById.get(bookId);
  if (!book || !BOLLS_ID[bookId]) return null;
  const r = await fetch(`https://bible-api.com/${encodeURIComponent(book.name)}+${chapter}?translation=${translation}`);
  if (!r.ok) throw new Error(`bible-api ${translation} ${bookId}.${chapter}: ${r.status}`);
  const j = (await r.json()) as { verses: { verse: number; text: string }[] };
  return j.verses.map((v) => ({ n: v.verse, text: v.text.trim() }));
}

// ── the door ───────────────────────────────────────────────────────────
// Bump when the sanitizer changes — cached text from an older sanitizer
// is stale by definition and must re-fetch, not linger.
const SANITIZER_REV = 2;

export async function getChapter(translation: string, bookId: string, chapter: number): Promise<Chapter> {
  const key = `r${SANITIZER_REV}:${translation}/${bookId}.${chapter}`;
  const mem = memory.get(key);
  if (mem) return { ...mem, servedFrom: "memory" };

  const cached = await idbGet(key);
  if (cached) {
    const out: Chapter = { ...cached, servedFrom: "cache" };
    memory.set(key, out);
    return out;
  }

  const attempts: [Chapter["servedFrom"], () => Promise<Verse[] | null>][] = [
    ["bundle", () => fromBundle(translation, bookId, chapter)],
    ["bolls", () => fromBolls(translation, bookId, chapter)],
    ["bible-api", () => fromBibleApi(translation, bookId, chapter)],
  ];
  let lastErr: unknown = null;
  for (const [servedFrom, run] of attempts) {
    try {
      const verses = await run();
      if (verses && verses.length) {
        const out: Chapter = { translation, bookId, chapter, verses, servedFrom };
        memory.set(key, out);
        void idbPut(key, out);
        return out;
      }
    } catch (e) { lastErr = e; }
  }
  throw new Error(`no source could serve ${key}` + (lastErr ? ` · last: ${String(lastErr)}` : ""));
}
