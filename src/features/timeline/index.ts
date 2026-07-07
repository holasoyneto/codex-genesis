import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { Timeline } from "./Timeline";

registerFeature({
  id: "timeline",
  glyph: "𝍫",
  title: "Timeline",
  purpose: "the eras, in order, honestly dated",
  help: "eras and events — a scholarly survey, honestly dated",
  surfaces: { main: Timeline },
  commands: [
    { phrase: "timeline", hint: "the eras, walkable", run: () => openPanel("timeline") },
  ],
});
