// The Oracle's food — scripture context built to the depth a mind can
// hold. A 1M-token frontier model receives THE WHOLE CANON; smaller minds
// receive the testament, the book, or the chapter. Every level is honest
// about what it is, and every verse carries its reference so the model
// can cite.

import { BOOKS, bookById, bundleChapters, getChapter } from "./corpus";
import type { Cursor } from "@/kernel/store";

export type ContextLevel = "canon" | "testament" | "book" | "chapter";

export interface OracleContext {
  level: ContextLevel;
  text: string;
  approxTokens: number;
}

// The context corpus is always the baked WEB (public domain, complete).
const CORPUS = "web";

function fmtChapter(bookName: string, ch: number, verses: { n: number; text: string }[]): string {
  return `### ${bookName} ${ch}\n` + verses.map((v) => `${v.n} ${v.text}`).join("\n");
}

async function textFor(bookIds: string[]): Promise<string> {
  const chapters = await bundleChapters(CORPUS);
  const parts: string[] = [];
  for (const id of bookIds) {
    const b = bookById.get(id);
    if (!b) continue;
    parts.push(`\n## ${b.name}`);
    for (let c = 1; c <= b.chapters; c++) {
      const vv = chapters[`${id}.${c}`];
      if (vv) parts.push(fmtChapter(b.name, c, vv));
    }
  }
  return parts.join("\n\n");
}

const CANON66 = BOOKS.filter((b) => b.testament === "OT" || b.testament === "NT");

/** Build the deepest context that fits the given token budget. */
export async function buildContext(cursor: Cursor, budgetTokens: number): Promise<OracleContext> {
  const book = bookById.get(cursor.bookId);
  const fits = (tokens: number) => tokens <= budgetTokens * 0.8;

  // Level sizes are estimated at ~4 chars/token; canon ≈ 990k tokens.
  const attempt = async (level: ContextLevel): Promise<OracleContext | null> => {
    let text = "";
    if (level === "canon") {
      text = "THE WHOLE CANON (World English Bible):\n" + (await textFor(CANON66.map((b) => b.id)));
    } else if (level === "testament" && book && (book.testament === "OT" || book.testament === "NT")) {
      const ids = CANON66.filter((b) => b.testament === book.testament).map((b) => b.id);
      text = `THE ENTIRE ${book.testament === "OT" ? "OLD" : "NEW"} TESTAMENT (World English Bible):\n` + (await textFor(ids));
    } else if (level === "book" && book) {
      text = `THE FULL BOOK the reader has open (World English Bible):\n` + (await textFor([book.id]));
    } else if (level === "chapter") {
      const ch = await getChapter(cursor.translation, cursor.bookId, cursor.chapter);
      text = "The chapter the reader has open:\n" + fmtChapter(book?.name ?? cursor.bookId, cursor.chapter, ch.verses);
    } else {
      return null;
    }
    const approxTokens = Math.round(text.length / 4);
    return fits(approxTokens) || level === "chapter" ? { level, text, approxTokens } : null;
  };

  for (const level of ["canon", "testament", "book", "chapter"] as ContextLevel[]) {
    const out = await attempt(level);
    if (out) return out;
  }
  // Unreachable — chapter always returns — but the compiler deserves truth.
  throw new Error("no context could be built");
}

/** One step down the ladder, for when a model rejects the size we sent. */
export function shallower(level: ContextLevel): ContextLevel | null {
  const ladder: ContextLevel[] = ["canon", "testament", "book", "chapter"];
  const i = ladder.indexOf(level);
  return ladder[i + 1] ?? null;
}
