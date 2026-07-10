import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { setSeed } from "@/kernel/seeds";
import { WordStudy } from "./WordStudy";

registerFeature({
  id: "wordstudy",
  glyph: "¶",
  title: "Word Study",
  purpose: "one word, weighed across the whole corpus",
  surfaces: { main: WordStudy },
  commands: [
    {
      phrase: "word study",
      hint: "deep-dive a word — frequency, first uses, every verse",
      run: () => openPanel("wordstudy"),
      match: (q: string) => {
        const m = q.match(/^word(?:\s+study)?\s+(\S.*)$/i);
        if (!m) return null;
        const term = m[1].trim();
        return {
          label: `WORD STUDY — ${term}`,
          hint: "frequency, first occurrences, every verse",
          run: () => { setSeed("wordstudy", term); openPanel("wordstudy"); },
        };
      },
    },
  ],
  help: "Deep-dive a single word over the bundled KJV: frequency by book, first occurrences, and every verse — word love, word grace.",
});
