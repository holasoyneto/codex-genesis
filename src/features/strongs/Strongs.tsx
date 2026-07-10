// STRONG'S CONCORDANCE — the numbers become a map. Look up any Strong's
// number (H1–H8674, G1–G5624) or search the glosses in English; where the
// bundled KJV alignment sample covers a chapter, every occurrence is a
// door straight to its verse. Complements the Lexicon (single-entry
// dossier) with browse + occurrence tracing.

import { useEffect, useMemo, useState } from "react";
import { closePanel, goTo } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { takeSeed } from "@/kernel/seeds";
import { BOOKS } from "@/engine/corpus";
import "./strongs.css";

// ── module shapes (data/modules/strongs-*.json, alignment-kjv-sample) ──
interface StrongsEntry {
  word: string;
  translit?: string;
  pron?: string;
  pos?: string;
  gloss?: string;
  def?: string;
  kjv?: string;
  usage?: number;
}
interface LexModule {
  meta: { name?: string; _partial?: boolean };
  entries: Record<string, StrongsEntry>;
}
interface AlignToken { en: string; strongs: string | null; lemma?: string }
interface AlignModule {
  meta: { coverage?: string[]; _partial?: boolean };
  verses: Record<string, AlignToken[]>;
}

// ── module loading — fetched once per session, offline from the bundle ──
const mods = new Map<string, Promise<unknown>>();
function loadModule<T>(id: string): Promise<T> {
  if (!mods.has(id)) {
    mods.set(id, fetch(`${import.meta.env.BASE_URL}data/modules/${id}.json`)
      .then((r) => { if (!r.ok) throw new Error(`module ${id}: ${r.status}`); return r.json(); }));
  }
  return mods.get(id)! as Promise<T>;
}

interface Loaded { hebrew: LexModule; greek: LexModule; alignment: AlignModule }
async function loadAll(): Promise<Loaded> {
  const [hebrew, greek, alignment] = await Promise.all([
    loadModule<LexModule>("strongs-hebrew"),
    loadModule<LexModule>("strongs-greek"),
    loadModule<AlignModule>("alignment-kjv-sample"),
  ]);
  return { hebrew, greek, alignment };
}

// ── verse-ref helpers — alignment keys are "genesis.1.1" (full book
// names); the cursor speaks corpus bookIds ("gen"). Map by book name. ──
const NAME_TO_ID = new Map(BOOKS.map((b) => [b.name.toLowerCase().replace(/\s+/g, ""), b.id]));
const ID_TO_NAME = new Map(BOOKS.map((b) => [b.id, b.name]));

interface Occurrence { ref: string; bookId: string | null; chapter: number; verse: number; en: string; lemma?: string }

function parseAlignRef(ref: string): { bookId: string | null; chapter: number; verse: number; bookName: string } {
  const parts = ref.split(".");
  const verse = Number(parts.pop());
  const chapter = Number(parts.pop());
  const rawBook = parts.join(".");
  const bookId = NAME_TO_ID.get(rawBook.replace(/\s+/g, "")) ?? null;
  const bookName = bookId ? (ID_TO_NAME.get(bookId) ?? rawBook) : rawBook;
  return { bookId, chapter, verse, bookName };
}

function occurrencesOf(alignment: AlignModule, key: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const [ref, tokens] of Object.entries(alignment.verses)) {
    for (const t of tokens) {
      if (t.strongs === key) {
        const p = parseAlignRef(ref);
        out.push({ ref, bookId: p.bookId, chapter: p.chapter, verse: p.verse, en: t.en, lemma: t.lemma });
        break; // one row per verse, even if the lemma repeats within it
      }
    }
  }
  return out;
}

const KEY_RE = /^([HG])0*(\d+)$/;

export function Strongs() {
  const inWindow = useInWindow();
  const [data, setData] = useState<Loaded | "loading" | "failed">("loading");
  const [input, setInput] = useState("");
  const [q, setQ] = useState<string>(() => takeSeed("strongs") ?? "");

  useEffect(() => {
    let live = true;
    loadAll()
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setData("failed"); });
    return () => { live = false; };
  }, []);

  const submit = () => { if (input.trim()) { setQ(input.trim()); setInput(""); } };

  // Resolve the query: an exact Strong's number focuses one entry; any
  // other text browses glosses/transliterations across both lexicons.
  const keyMatch = q.trim().toUpperCase().match(KEY_RE);
  const focusKey = keyMatch ? keyMatch[1] + keyMatch[2] : null;

  const entry: StrongsEntry | null = useMemo(() => {
    if (typeof data === "string" || !focusKey) return null;
    const src = focusKey.startsWith("H") ? data.hebrew : data.greek;
    return src.entries[focusKey] ?? null;
  }, [data, focusKey]);

  const browse = useMemo(() => {
    if (typeof data === "string" || focusKey || !q.trim()) return [];
    const needle = q.trim().toLowerCase();
    const hits: { key: string; entry: StrongsEntry }[] = [];
    for (const src of [data.hebrew, data.greek]) {
      for (const [key, e] of Object.entries(src.entries)) {
        if (
          (e.gloss && e.gloss.toLowerCase().includes(needle)) ||
          (e.translit && e.translit.toLowerCase().includes(needle)) ||
          (e.kjv && e.kjv.toLowerCase().includes(needle))
        ) {
          hits.push({ key, entry: e });
          if (hits.length >= 40) return hits;
        }
      }
    }
    return hits;
  }, [data, q, focusKey]);

  const occurrences = useMemo(() => {
    if (typeof data === "string" || !focusKey) return [];
    return occurrencesOf(data.alignment, focusKey);
  }, [data, focusKey]);

  const coverage = typeof data !== "string" ? data.alignment.meta.coverage ?? [] : [];

  return (
    <div className="gx-strongs" role="region" aria-label="Strong's Concordance">
      <h2 className="gx-strongs-title">STRONG'S CONCORDANCE</h2>

      <div className="gx-strongs-ask">
        <input
          className="gx-strongs-input"
          placeholder="H430 · G26 · or an English word …"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          spellCheck={false}
          aria-label="Strong's number or word"
        />
        <button className="gx-strongs-go" onClick={submit}>FIND</button>
      </div>

      {data === "loading" ? (
        <p className="gx-strongs-wait">Loading the concordance…</p>
      ) : data === "failed" ? (
        <p className="gx-strongs-none">The Strong's modules could not be loaded from the bundle.</p>
      ) : !q.trim() ? (
        <p className="gx-strongs-hint">
          Enter a Strong's number (H1–H8674, G1–G5624) or search the glosses in
          English. Occurrence tracing covers the alignment sample: {coverage.join(", ") || "—"}.
        </p>
      ) : focusKey ? (
        entry === null ? (
          <p className="gx-strongs-none">No entry for “{focusKey}” — Strong's numbers run H1–H8674 and G1–G5624.</p>
        ) : (
          <article className="gx-strongs-entry">
            <header className="gx-strongs-head">
              <span className="gx-strongs-word" dir="auto">{entry.word}</span>
              <span className="gx-strongs-id">{focusKey}</span>
            </header>
            {entry.translit ? (
              <p className="gx-strongs-translit">
                {entry.translit}
                {entry.pron ? <span className="gx-strongs-pron"> · {entry.pron}</span> : null}
                {entry.pos ? <span className="gx-strongs-pos"> · {entry.pos}</span> : null}
              </p>
            ) : null}
            {entry.gloss ? <p className="gx-strongs-gloss">{entry.gloss}</p> : null}
            {entry.def ? <p className="gx-strongs-def">{entry.def}</p> : null}
            {entry.kjv ? <p className="gx-strongs-kjv">KJV renders: {entry.kjv}</p> : null}
            {entry.usage ? <p className="gx-strongs-usage">{entry.usage.toLocaleString()} occurrences in scripture</p> : null}

            <h3 className="gx-strongs-subtitle">OCCURRENCES · ALIGNMENT SAMPLE</h3>
            {occurrences.length ? (
              <ul className="gx-strongs-occ">
                {occurrences.map((o) => {
                  const p = parseAlignRef(o.ref);
                  return (
                    <li key={o.ref}>
                      <button
                        className="gx-strongs-occ-row"
                        disabled={!o.bookId}
                        title={o.bookId ? "open this verse in the reader" : "book not in this corpus"}
                        onClick={() => { if (o.bookId) goTo({ bookId: o.bookId, chapter: o.chapter, verse: o.verse }); }}
                      >
                        <span className="gx-strongs-occ-ref">{p.bookName} {o.chapter}:{o.verse}</span>
                        <span className="gx-strongs-occ-en">“{o.en.trim()}”{o.lemma ? <span className="gx-strongs-occ-lemma" dir="auto"> · {o.lemma}</span> : null}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="gx-strongs-hint">
                No occurrences in the alignment sample — it covers only {coverage.join(", ") || "a few chapters"}.
                The full KJV↔Strong's alignment is future data work.
              </p>
            )}
          </article>
        )
      ) : browse.length ? (
        <ul className="gx-strongs-browse">
          {browse.map(({ key, entry: e }) => (
            <li key={key}>
              <button className="gx-strongs-browse-row" onClick={() => setQ(key)}>
                <span className="gx-strongs-browse-id">{key}</span>
                <span className="gx-strongs-browse-word" dir="auto">{e.word}</span>
                <span className="gx-strongs-browse-gloss">{e.gloss ?? e.kjv ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="gx-strongs-none">No gloss matches “{q}” in either lexicon.</p>
      )}

      {inWindow ? null : (
        <button className="gx-strongs-close" aria-label="Close Strong's" onClick={() => closePanel()}>×</button>
      )}
    </div>
  );
}
