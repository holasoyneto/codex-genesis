import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { setSeed } from "@/kernel/seeds";
import { Gematria } from "./Gematria";

registerFeature({
  id: "gematria",
  glyph: "Σ",
  title: "Gematria",
  purpose: "Hebrew, Greek, and English letter-values for any word",
  surfaces: { main: Gematria },
  commands: [
    {
      phrase: "gematria",
      hint: "letter-values for the current verse or a word you give it",
      run: () => openPanel("gematria"),
      match: (q: string) => {
        const m = q.match(/^gematria\s+(\S.*)$/i);
        if (!m) return null;
        const term = m[1].trim();
        return {
          label: `GEMATRIA — ${term}`,
          hint: "Hebrew / Greek / English letter-values",
          run: () => { setSeed("gematria", term); openPanel("gematria"); },
        };
      },
    },
  ],
  help: "Gematria — Hebrew, Greek, and English numerology systems for a word or phrase, plus bounded cross-references: gematria love, gematria אהבה.",
});
