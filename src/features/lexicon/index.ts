import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { setLemma } from "./query";
import { Lexicon } from "./Lexicon";

registerFeature({
  id: "lexicon",
  glyph: "אָ",
  title: "Lexicon",
  purpose: "the original word, and its family",
  help: "Strong's Hebrew & Greek — lemma H430, lemma G26",
  surfaces: { main: Lexicon },
  commands: [
    {
      phrase: "lexicon",
      hint: "Strong's Hebrew & Greek dictionaries",
      run: () => openPanel("lexicon"),
      match: (q) => {
        const m = q.match(/^lemma\s+([hg]0*\d+)$/i);
        if (!m) return null;
        const id = m[1].toUpperCase().replace(/^([HG])0+/, "$1");
        return {
          label: `LEMMA ${id}`,
          hint: "open in the Lexicon",
          run: () => { setLemma(id); openPanel("lexicon"); },
        };
      },
    },
  ],
});
