import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { setSeed } from "@/kernel/seeds";
import { Strongs } from "./Strongs";

registerFeature({
  id: "strongs",
  glyph: "ℵ",
  title: "Strong's",
  purpose: "the concordance — numbers, lemmas, occurrences",
  surfaces: { main: Strongs },
  commands: [
    {
      phrase: "strongs",
      hint: "Strong's concordance — browse and trace occurrences",
      run: () => openPanel("strongs"),
      match: (q: string) => {
        const m = q.match(/^strongs?\s+([hg]0*\d+)$/i);
        if (!m) return null;
        const id = m[1].toUpperCase().replace(/^([HG])0+/, "$1");
        return {
          label: `STRONG'S ${id}`,
          hint: "open in the concordance",
          run: () => { setSeed("strongs", id); openPanel("strongs"); },
        };
      },
    },
  ],
  help: "Strong's Hebrew & Greek concordance — strongs H430, strongs G26. Traces occurrences through the KJV alignment sample.",
});
