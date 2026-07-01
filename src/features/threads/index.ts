import { registerFeature } from "@/kernel/registry";
import { setState } from "@/kernel/store";
import { Threads } from "./Threads";

registerFeature({
  id: "threads",
  glyph: "⛬",
  title: "Threads",
  surfaces: { main: Threads },
  commands: [
    { phrase: "threads", hint: "cross-references for this verse", run: () => setState({ panel: "threads" }) },
  ],
});
