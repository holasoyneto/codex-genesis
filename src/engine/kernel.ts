// THE KERNEL (PALANTIR §4) — the typed tool registry the Oracle drives.
// Every capability exists as a kernel tool callable without any DOM
// (EXOGRAMMAR law 5: the interface dies; the code lives forever). All
// execution is local, against the app's own engines — the model only
// chooses; the analyst sees the work.

import { goTo } from "@/kernel/store";
import { bookById, bundleChapters, getChapter, TRANSLATIONS, covers } from "./corpus";
import { searchScripture } from "./search";
import { threadsFor } from "./threads";
import { loadOntology, entityMentions, entityRelations, searchEntities, relationLabel } from "./ontology";
import { loadGraph, path as graphPath } from "./graph";
import { parseRef } from "@/features/omnibar/refparse";

export interface KernelTool {
  name: string;
  description: string;
  /** JSON Schema for the arguments — the same shape both engine families eat. */
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  run: (args: Record<string, unknown>) => Promise<string>;
}

const str = (description: string) => ({ type: "string", description });

// A forgiving ref argument: "gen.1.1" or "John 3:16".
function toKey(raw: string): string | null {
  const t = String(raw).trim();
  const m = t.toLowerCase().match(/^([\w-]+)\.(\d+)\.(\d+)$/);
  if (m) return bookById.has(m[1]) ? t.toLowerCase() : null;
  const p = parseRef(t);
  return p ? `${p.book.id}.${p.chapter}.${p.verse ?? 1}` : null;
}
const keyLabel = (key: string) => {
  const [b, c, v] = key.split(".");
  return `${bookById.get(b)?.name ?? b} ${c}:${v}`;
};

export const KERNEL_TOOLS: KernelTool[] = [
  {
    name: "search_scripture",
    description: "Search the whole of Scripture for a word or phrase. Returns verse references with text.",
    input_schema: { type: "object", properties: { query: str("the word or phrase to find") }, required: ["query"] },
    run: async (a) => {
      const hits = await searchScripture("web", String(a.query ?? ""), 12);
      return JSON.stringify(hits.map((h) => ({
        ref: `${h.bookId}.${h.chapter}.${h.verse}`,
        label: `${h.bookName} ${h.chapter}:${h.verse}`,
        text: h.text.replace(/<\/?mark>/g, ""),
      })));
    },
  },
  {
    name: "threads_for",
    description: "Cross-references (Treasury of Scripture Knowledge, Torrey 1880) for a verse like 'John 3:16' or 'jhn.3.16'.",
    input_schema: { type: "object", properties: { ref: str("the verse") }, required: ["ref"] },
    run: async (a) => {
      const key = toKey(String(a.ref ?? ""));
      if (!key) return JSON.stringify({ error: "unparseable reference" });
      const [b, c, v] = key.split(".");
      const refs = await threadsFor(b, +c, +v);
      return JSON.stringify({
        source: "TSK · Torrey 1880 · public domain",
        threads: refs.slice(0, 40).map((r) => `${r.bookId}.${r.chapter}.${r.verse}`),
      });
    },
  },
  {
    name: "compare_verse",
    description: "One verse across every translation that carries it (KJV, WEB, ASV, YLT, Hebrew, Greek…).",
    input_schema: { type: "object", properties: { ref: str("the verse") }, required: ["ref"] },
    run: async (a) => {
      const key = toKey(String(a.ref ?? ""));
      if (!key) return JSON.stringify({ error: "unparseable reference" });
      const [b, c, v] = key.split(".");
      const able = TRANSLATIONS.filter((t) => covers(t, b));
      const lanes = await Promise.all(able.map(async (t) => {
        try {
          const ch = await getChapter(t.id, b, +c);
          if (ch.translation !== t.id) return null;
          const text = ch.verses.find((x) => x.n === +v)?.text;
          return text ? { translation: t.name, text } : null;
        } catch { return null; }
      }));
      return JSON.stringify({ ref: keyLabel(key), lanes: lanes.filter(Boolean) });
    },
  },
  {
    name: "entity_dossier",
    description: "The dossier of a named person or place: summary, relations, mentions, contested views, provenance.",
    input_schema: { type: "object", properties: { name: str("the entity's name, e.g. 'Melchizedek'") }, required: ["name"] },
    run: async (a) => {
      const ont = await loadOntology();
      const e = searchEntities(ont, String(a.name ?? ""), 1)[0];
      if (!e) return JSON.stringify({ error: "no such entity in the ontology" });
      const rels = entityRelations(ont, e.id);
      return JSON.stringify({
        id: e.id, kind: e.kind, names: e.names, summary: e.summary,
        contested: e.contested ?? null,
        relations: [...rels.out.map((r) => `${relationLabel(r.kind)} ${r.to}${r.ref ? ` (${r.ref})` : ""}`),
                    ...rels.in.map((r) => `${r.from} ${relationLabel(r.kind)} this${r.ref ? ` (${r.ref})` : ""}`)],
        mentions: entityMentions(ont, e.id).slice(0, 50).map((m) => m.ref),
        provenance: ont.meta.extracted_by,
      });
    },
  },
  {
    name: "graph_path",
    description: "Shortest route through the fused graph (TSK threads + ontology relations + mentions) between two verses or entities.",
    input_schema: {
      type: "object",
      properties: { from: str("verse ref or entity id"), to: str("verse ref or entity id") },
      required: ["from", "to"],
    },
    run: async (a) => {
      const g = await loadGraph();
      const from = toKey(String(a.from ?? "")) ?? String(a.from ?? "").trim().toLowerCase();
      const to = toKey(String(a.to ?? "")) ?? String(a.to ?? "").trim().toLowerCase();
      const hops = graphPath(g, from, to);
      if (!hops) return JSON.stringify({ error: "no route", from, to });
      return JSON.stringify({ hops: hops.map((h) => ({ node: h.id, via: h.via })) });
    },
  },
  {
    name: "open_passage",
    description: "Turn the reader to a passage — and return its text. Use when the user should SEE a passage.",
    input_schema: { type: "object", properties: { ref: str("the passage, e.g. 'Isaiah 53' or 'jhn.1.1'") }, required: ["ref"] },
    run: async (a) => {
      const key = toKey(String(a.ref ?? ""));
      if (!key) return JSON.stringify({ error: "unparseable reference" });
      const [b, c, v] = key.split(".");
      goTo({ bookId: b, chapter: +c, verse: +v || null });
      try {
        const chapters = await bundleChapters("web");
        const vv = chapters[`${b}.${c}`] ?? [];
        return JSON.stringify({ opened: keyLabel(key), text: vv.map((x) => `${x.n} ${x.text}`).join("\n").slice(0, 4000) });
      } catch {
        return JSON.stringify({ opened: keyLabel(key) });
      }
    },
  },
];

export const toolByName = new Map(KERNEL_TOOLS.map((t) => [t.name, t]));

/** Execute one tool call, never throwing — the model gets JSON either way. */
export async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const tool = toolByName.get(name);
  if (!tool) return JSON.stringify({ error: `unknown tool ${name}` });
  try {
    return await tool.run(args ?? {});
  } catch (e) {
    return JSON.stringify({ error: String(e).slice(0, 200) });
  }
}
