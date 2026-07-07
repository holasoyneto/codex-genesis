// Omnibar pipes (PALANTIR §8) — `threads jhn 1:1 | compare | mark` reads
// left to right: the first stage resolves a SUBJECT (a verse or entity);
// every following stage is a verb from the same command surface the
// kernel already exposes, applied to that subject in turn. This is not a
// new engine — it is composition over the existing registry/kernel
// tools (EXOGRAMMAR law 5: the interface is thin; the capabilities are
// the app's own).

import { goTo, openPanel, addToInvestigation, setState, getState } from "@/kernel/store";
import { parseRef } from "./refparse";
import { setSearchSeed } from "@/features/search";
import { record } from "@/kernel/witness";

export interface PipeSubject {
  bookId: string;
  chapter: number;
  verse: number | null;
}

export interface PipeResult {
  ok: boolean;
  steps: string[];   // human-readable log, one line per stage — the receipt
  error?: string;
}

const VERBS = ["threads", "compare", "mark", "search", "path", "near", "families", "dossier", "oracle", "investigation"];

function toSubject(token: string): PipeSubject | null {
  const t = token.trim();
  if (!t) return null;
  const dotted = t.match(/^([\w-]+)\.(\d+)\.(\d+)$/i);
  if (dotted) return { bookId: dotted[1].toLowerCase(), chapter: +dotted[2], verse: +dotted[3] };
  const p = parseRef(t);
  if (p && !p.fuzzy) return { bookId: p.book.id, chapter: p.chapter, verse: p.verse ?? 1 };
  return null;
}

/** Is this omnibar text shaped like a pipe (contains a bare `|`)? Kept
    separate from the parser so the omnibar can decide row priority
    without fully parsing on every keystroke. */
export function looksLikePipe(q: string): boolean {
  return q.includes("|") && q.split("|").length >= 2;
}

/** Execute a pipe left to right. The first segment must resolve (or
    already carry) a subject — a verse reference; subsequent segments are
    single verbs (no argument needed — they act on the running subject).
    Unknown or argument-bearing later stages are reported, not silently
    dropped — honesty over cleverness. */
export function runPipe(q: string): PipeResult {
  const segs = q.split("|").map((s) => s.trim()).filter(Boolean);
  if (segs.length < 2) return { ok: false, steps: [], error: "not a pipe — needs at least one `|`" };

  const steps: string[] = [];
  // First segment: "<verb> <ref>" or a bare ref ("jhn 1:1 | compare").
  const first = segs[0];
  const firstVerbMatch = VERBS.find((v) => first.toLowerCase().startsWith(v + " "));
  const subjectText = firstVerbMatch ? first.slice(firstVerbMatch.length).trim() : first;
  let subject = toSubject(subjectText);
  if (!subject) {
    // fall back to the current cursor — "threads | compare | mark" acts
    // on wherever the reader already is.
    const { cursor } = getState();
    subject = { bookId: cursor.bookId, chapter: cursor.chapter, verse: cursor.verse ?? 1 };
    steps.push(`(no ref in "${first}" — using the open passage)`);
  }
  goTo({ ...subject });
  steps.push(`open ${subject.bookId}.${subject.chapter}.${subject.verse}`);
  if (firstVerbMatch) runVerb(firstVerbMatch, subject, steps);

  for (let i = 1; i < segs.length; i++) {
    const seg = segs[i].toLowerCase();
    const verb = VERBS.find((v) => seg === v || seg.startsWith(v + " "));
    if (!verb) { steps.push(`⚠ unknown stage "${segs[i]}" — skipped`); continue; }
    runVerb(verb, subject, steps);
  }

  record("pipe", q);
  return { ok: true, steps };
}

function runVerb(verb: string, subject: PipeSubject, steps: string[]): void {
  const ref = `${subject.bookId}.${subject.chapter}.${subject.verse ?? 1}`;
  switch (verb) {
    case "threads":
      openPanel("threads"); steps.push("→ threads"); break;
    case "compare":
      openPanel("compare"); steps.push("→ compare"); break;
    case "mark":
      setState((s) => ({
        marks: [...s.marks, {
          id: "m" + Math.random().toString(36).slice(2, 9),
          bookId: subject.bookId, chapter: subject.chapter, verse: subject.verse, text: "", at: Date.now(),
        }],
      }));
      steps.push("→ marked"); break;
    case "search":
      setSearchSeed(ref); openPanel("search"); steps.push("→ search"); break;
    case "dossier":
      openPanel("dossier"); steps.push("→ dossier"); break;
    case "oracle":
      openPanel("oracle"); steps.push("→ oracle"); break;
    case "investigation":
      addToInvestigation("verse", { ref }, "from an omnibar pipe");
      steps.push("→ added to investigation"); break;
    case "path": case "near": case "families":
      // These need a second argument (a target); without one they open
      // the Galaxy honestly unresolved rather than guessing a target.
      openPanel("galaxy");
      steps.push(`→ galaxy (${verb} needs a second ref — opened plain)`);
      break;
    default:
      steps.push(`⚠ "${verb}" not yet pipeable`);
  }
}
