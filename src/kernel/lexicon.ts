// The verb lexicon — DESIGN §II.6. Exactly these words for these acts,
// everywhere: one glyph per verb, imported by every surface that offers
// the act. The same act never has two names; two acts never share a glyph.
// This is the ONE place spelling/glyph for a verb may be decided.

export type Verb =
  | "read" | "threads" | "compare" | "mark" | "ask" | "case"
  | "copy" | "share" | "export" | "settings" | "dossier" | "openReader";

export interface VerbEntry {
  glyph: string;
  word: string;   // small-caps display word
  hint: string;   // one-line dim explanation, used by every menu row
}

export const LEXICON: Record<Verb, VerbEntry> = {
  read:      { glyph: "☰", word: "Read",     hint: "open this passage in the reader" },
  threads:   { glyph: "⛬", word: "Threads",  hint: "what other verses say about this one" },
  compare:   { glyph: "⋕", word: "Compare",  hint: "this verse, side by side in every voice" },
  mark:      { glyph: "✦", word: "Mark",     hint: "keep this verse in Marks" },
  ask:       { glyph: "☲", word: "Ask",      hint: "ask the Oracle about this" },
  case:      { glyph: "🗂", word: "Case",     hint: "add to the active investigation" },
  copy:      { glyph: "⧉", word: "Copy",     hint: "copy the verse text and reference" },
  share:     { glyph: "⇪", word: "Share",    hint: "a permalink anyone can open" },
  export:    { glyph: "⇩", word: "Export",   hint: "save as a file" },
  settings:  { glyph: "⚙", word: "Settings", hint: "how the app looks, reads, and thinks" },
  dossier:   { glyph: "☖", word: "Dossier",  hint: "everything about this person or place" },
  openReader:{ glyph: "☰", word: "New reader", hint: "a second reader pinned to a voice" },
};

export function verb(v: Verb): VerbEntry { return LEXICON[v]; }
