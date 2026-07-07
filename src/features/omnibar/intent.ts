// Intent detection for free-text omnibar input — a natural-language QUESTION
// (route to the Oracle or a Mission) reads differently from a keyword the
// user wants to find in the text (route to search). Mirrors pipes.ts.
const INTERROGATIVE = /^(what|whats|what's|why|who|whos|who's|whom|how|when|where|which|is|are|was|were|do|does|did|can|could|should|would|will|explain|tell|trace|find|summari[sz]e|compare|describe|list|give)\b/i;

export function looksLikeQuestion(q: string): boolean {
  const t = q.trim();
  if (t.length < 4) return false;
  if (/\?\s*$/.test(t)) return true;
  if (INTERROGATIVE.test(t)) return true;
  // A multi-word phrase that named no verse and no command reads as a
  // research goal, not a single lexical search term.
  return t.split(/\s+/).filter(Boolean).length >= 4;
}
