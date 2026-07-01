import { registerFeature } from "@/kernel/registry";
import { setState } from "@/kernel/store";
import { Marks } from "./Marks";

registerFeature({
  id: "marks",
  glyph: "✦",
  title: "Marks",
  surfaces: { main: Marks },
  commands: [
    { phrase: "marks", hint: "kept verses", run: () => setState({ panel: "marks" }) },
  ],
});
