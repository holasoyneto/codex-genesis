import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { Compare } from "./Compare";

registerFeature({
  id: "compare",
  glyph: "⋕",
  title: "Compare",
  purpose: "this verse, side by side in every voice",
  surfaces: { main: Compare },
  commands: [
    { phrase: "compare", hint: "this verse in every voice", run: () => openPanel("compare") },
  ],
});
