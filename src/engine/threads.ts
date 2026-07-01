// The threads — R. A. Torrey's Treasury of Scripture Knowledge (public
// domain): 432,898 connections across 29,364 verses, served locally from
// data/crossrefs.json. Keys are "book.chapter.verse".

interface ThreadIndex { verses: Record<string, string[]> }

let index: ThreadIndex | null = null;
let loading: Promise<ThreadIndex> | null = null;

function load(): Promise<ThreadIndex> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}data/crossrefs.json`)
      .then((r) => { if (!r.ok) throw new Error(`crossrefs: ${r.status}`); return r.json(); })
      .then((j: ThreadIndex) => { index = j; return j; });
  }
  return loading;
}

export interface ThreadRef { bookId: string; chapter: number; verse: number }

export function parseKey(key: string): ThreadRef | null {
  const m = key.match(/^(.+)\.(\d+)\.(\d+)$/);
  return m ? { bookId: m[1], chapter: +m[2], verse: +m[3] } : null;
}

/** Cross-references for a verse, strongest-first as Torrey ordered them. */
export async function threadsFor(bookId: string, chapter: number, verse: number): Promise<ThreadRef[]> {
  const j = index ?? await load();
  const refs = j.verses[`${bookId}.${chapter}.${verse}`] ?? [];
  return refs.map(parseKey).filter((r): r is ThreadRef => !!r);
}
