// The lexicon engine — Strong's Hebrew (H1–H8674) and Greek (G1–G5624)
// dictionaries, baked under /data/lexicon with provenance. Dictionary
// lookup only this phase; occurrence indexes are Phase 5 future work.

import type { ProvenanceMeta } from "@/kernel/Provenance";

export interface LexEntry {
  word: string;
  translit?: string;
  pron?: string;
  pos?: string;
  gloss?: string;
  def?: string;
  kjv?: string;
  usage?: number;
}

interface LexFile { _meta: ProvenanceMeta; entries: Record<string, LexEntry> }

const files = new Map<string, Promise<LexFile>>();

function load(lang: "hebrew" | "greek"): Promise<LexFile> {
  if (!files.has(lang)) {
    files.set(lang, fetch(`${import.meta.env.BASE_URL}data/lexicon/strongs-${lang}.json`)
      .then((r) => { if (!r.ok) throw new Error(`lexicon ${lang}: ${r.status}`); return r.json(); }));
  }
  return files.get(lang)!;
}

export interface LexResult { id: string; entry: LexEntry; meta: ProvenanceMeta }

/** Look up a Strong's number — "H430", "g26", "H0430" all resolve. */
export async function lemma(raw: string): Promise<LexResult | null> {
  const m = raw.trim().toUpperCase().match(/^([HG])0*(\d+)$/);
  if (!m) return null;
  const id = m[1] + m[2];
  const file = await load(m[1] === "H" ? "hebrew" : "greek");
  const entry = file.entries[id];
  return entry ? { id, entry, meta: file._meta } : null;
}
