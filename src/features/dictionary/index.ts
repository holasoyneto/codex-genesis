import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { setSeed } from "@/kernel/seeds";
import { Dictionary } from "./Dictionary";

registerFeature({
  id: "dictionary",
  glyph: "ℬ",
  title: "Dictionary",
  purpose: "Easton's Bible dictionary — a sample, searchable by term",
  surfaces: { main: Dictionary },
  commands: [
    {
      phrase: "dictionary",
      hint: "look up names, places, and terms",
      run: () => openPanel("dictionary"),
      match: (q: string) => {
        const m = q.match(/^define\s+(\S.*)$/i);
        if (!m) return null;
        const term = m[1].trim();
        return {
          label: `DEFINE — ${term}`,
          hint: "Easton's Bible dictionary",
          run: () => { setSeed("dictionary", term); openPanel("dictionary"); },
        };
      },
    },
  ],
  help: "Bible Dictionary — a bundled sample of Easton's & Smith's entries: define Bethlehem, define covenant.",
});
