import { registerFeature } from "@/kernel/registry";
import { setState } from "@/kernel/store";
import { Compare } from "./Compare";

registerFeature({
  id: "compare",
  glyph: "⋕",
  title: "Compare",
  surfaces: { main: Compare },
  commands: [
    { phrase: "compare", hint: "this verse in every voice", run: () => setState({ panel: "compare" }) },
  ],
});
