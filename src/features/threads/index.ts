import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { Threads } from "./Threads";

registerFeature({
  id: "threads",
  glyph: "⛬",
  title: "Threads",
  purpose: "what other verses say about this one",
  surfaces: { main: Threads },
  commands: [
    { phrase: "threads", hint: "cross-references for this verse", run: () => openPanel("threads") },
  ],
});
