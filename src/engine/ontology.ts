// The ontology engine — the keystone (PALANTIR §1). Every named person and
// place in the corpus is a first-class OBJECT with verse-anchored mentions,
// relations, and provenance. The verse stops being the only atom: clicking
// "Melchizedek" anywhere opens Melchizedek.
//
// Loaded once from the baked, audited seed under /data/ontology. The index
// (entities + relations + manifest) is small and eager; mentions are small
// too (a few thousand rows) and load together so a Dossier or a chapter can
// resolve instantly. Data outlives code; this engine only reads it.

export type EntityKind =
  | "person" | "place" | "event" | "lemma" | "topic" | "number" | "pericope";

export interface ContestedView { view: string; source: string }
export interface Contested { why: string; views: ContestedView[] }

export interface Entity {
  id: string;
  kind: EntityKind;
  names: string[];        // primary first, then aliases
  summary: string;
  contested?: Contested;  // honesty is load-bearing — disputes are data
}

export interface Mention {
  entityId: string;
  ref: string;            // bookId.chapter.verse
  form: string;           // the surface phrase actually in the verse
}

export interface Relation {
  from: string;
  to: string;
  kind: string;           // father_of | mother_of | spouse_of | king_of | blessed | …
  ref?: string;           // evidence verse
  provenance: string;
}

export interface Provenance {
  source: string;
  license: string;
  extracted_by: string;
  method: string;
  scope: string;
  limitations?: string;
  contested_policy?: string;
}

export interface Manifest {
  _meta: Provenance;
  generated: string;
  books: string[];
  counts: {
    persons: number; places: number; entities: number;
    relations: number; mentions: number;
    mentionsByBook: Record<string, number>;
  };
}

export interface Ontology {
  meta: Provenance;
  manifest: Manifest;
  entities: Map<string, Entity>;
  mentions: Mention[];
  relations: Relation[];
  /** entityId → its mentions, in canonical order */
  mentionsByEntity: Map<string, Mention[]>;
  /** "book.chapter" → verseNumber → mentions in that verse */
  mentionsByChapter: Map<string, Map<number, Mention[]>>;
}

const BASE = import.meta.env.BASE_URL;
const j = async <T>(p: string): Promise<T> => {
  const r = await fetch(`${BASE}data/ontology/${p}`);
  if (!r.ok) throw new Error(`ontology ${p}: ${r.status}`);
  return r.json() as Promise<T>;
};

let loading: Promise<Ontology> | null = null;
let loaded: Ontology | null = null;

/** The resolved ontology if it has finished loading, else null. Lets the
    omnibar rank entities synchronously without awaiting inside render. */
export function getLoadedOntology(): Ontology | null { return loaded; }

export function loadOntology(): Promise<Ontology> {
  if (loading) return loading;
  loading = (async () => {
    const manifest = await j<Manifest>("manifest.json");
    const [persons, places, rels] = await Promise.all([
      j<{ entities: Entity[] }>("persons.json"),
      j<{ entities: Entity[] }>("places.json"),
      j<{ relations: Relation[] }>("relations.json"),
    ]);
    const mentionFiles = await Promise.all(
      manifest.books.map((b) => j<{ mentions: Mention[] }>(`mentions/${b}.json`))
    );

    const entities = new Map<string, Entity>();
    for (const e of [...persons.entities, ...places.entities]) entities.set(e.id, e);

    const mentions: Mention[] = mentionFiles.flatMap((f) => f.mentions);
    const mentionsByEntity = new Map<string, Mention[]>();
    const mentionsByChapter = new Map<string, Map<number, Mention[]>>();
    for (const m of mentions) {
      (mentionsByEntity.get(m.entityId) ?? mentionsByEntity.set(m.entityId, []).get(m.entityId)!).push(m);
      const [b, c, v] = m.ref.split(".");
      const chKey = `${b}.${c}`;
      let byV = mentionsByChapter.get(chKey);
      if (!byV) mentionsByChapter.set(chKey, (byV = new Map()));
      (byV.get(Number(v)) ?? byV.set(Number(v), []).get(Number(v))!).push(m);
    }

    const ont: Ontology = {
      meta: manifest._meta, manifest,
      entities, mentions, relations: rels.relations,
      mentionsByEntity, mentionsByChapter,
    };
    loaded = ont;
    return ont;
  })().catch((e) => { loading = null; throw e; });
  return loading;
}

// ── queries (all synchronous over a loaded Ontology) ───────────────────────

export function entityById(o: Ontology, id: string): Entity | undefined {
  return o.entities.get(id);
}

/** Mentions in one chapter, grouped by verse number (for the reader chips). */
export function chapterMentions(o: Ontology, bookId: string, chapter: number): Map<number, Mention[]> {
  return o.mentionsByChapter.get(`${bookId}.${chapter}`) ?? new Map();
}

/** Everywhere an entity is named, in canonical order. */
export function entityMentions(o: Ontology, id: string): Mention[] {
  return o.mentionsByEntity.get(id) ?? [];
}

/** Relations touching an entity, split by direction — the walkable graph edge. */
export function entityRelations(o: Ontology, id: string): { out: Relation[]; in: Relation[] } {
  const out: Relation[] = [], incoming: Relation[] = [];
  for (const r of o.relations) {
    if (r.from === id) out.push(r);
    if (r.to === id) incoming.push(r);
  }
  return { out, in: incoming };
}

/** Rank entities for the omnibar. Exact/prefix name beats substring; a real
    entity outranks a fuzzy book guess (the caller decides how to weave it). */
export function searchEntities(o: Ontology, query: string, limit = 5): Entity[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored: { e: Entity; s: number }[] = [];
  for (const e of o.entities.values()) {
    let best = 0;
    for (const name of e.names) {
      const n = name.toLowerCase();
      if (n === q) best = Math.max(best, 100);
      else if (n.startsWith(q)) best = Math.max(best, 70);
      else if (n.includes(q)) best = Math.max(best, 40);
    }
    if (best) scored.push({ e, s: best });
  }
  scored.sort((a, b) =>
    b.s - a.s ||
    (o.mentionsByEntity.get(b.e.id)?.length ?? 0) - (o.mentionsByEntity.get(a.e.id)?.length ?? 0) ||
    a.e.names[0].localeCompare(b.e.names[0])
  );
  return scored.slice(0, limit).map((x) => x.e);
}

// Human labels for relation kinds — the edge speaks plainly in the Dossier.
const REL_LABEL: Record<string, string> = {
  father_of: "father of", mother_of: "mother of", spouse_of: "spouse of",
  sibling_of: "sibling of", brother_of: "brother of", ancestor_of: "ancestor of",
  uncle_of: "uncle of", king_of: "king of", blessed: "blessed",
  killed: "killed", ruled: "ruled", located_in: "located in",
  dwelt_in: "dwelt in", participant_in: "took part in", speaker_of: "spoke",
  about: "about", quotes: "quotes", fulfills: "fulfills", parallels: "parallels",
  anointed: "anointed", called: "called", covenant_with: "made covenant with",
  rebuked: "rebuked", summoned: "summoned", loved: "loved",
  guardian_of: "guardian of", mother_in_law_of: "mother-in-law of",
};
export function relationLabel(kind: string): string {
  return REL_LABEL[kind] ?? kind.replace(/_/g, " ");
}
// The inverse phrasing when reading an incoming edge ("X is the father of ME"
// reads, from ME, as "father: X").
const REL_INVERSE: Record<string, string> = {
  father_of: "father", mother_of: "mother", spouse_of: "spouse",
  sibling_of: "sibling", brother_of: "brother", ancestor_of: "descendant of",
  uncle_of: "nephew/niece of", king_of: "ruled by", blessed: "blessed by",
  dwelt_in: "dwelt here", king_of_inv: "ruled by",
  anointed: "anointed by", called: "called by", covenant_with: "made covenant with",
  rebuked: "rebuked by", summoned: "summoned by", loved: "loved by",
  guardian_of: "ward of", mother_in_law_of: "child-in-law of", killed: "killed by",
  ruled: "ruled by",
};
export function relationInverseLabel(kind: string): string {
  return REL_INVERSE[kind] ?? relationLabel(kind);
}
