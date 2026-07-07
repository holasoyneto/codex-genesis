import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { Missions } from "./Missions";

registerFeature({
  id: "missions",
  glyph: "☄",
  title: "Missions",
  purpose: "a multi-step research goal, worked and reported",
  surfaces: { main: Missions },
  commands: [
    { phrase: "missions", hint: "give the Oracle a multi-step research goal", run: () => openPanel("missions") },
    { phrase: "mission", hint: "give the Oracle a multi-step research goal", run: () => openPanel("missions") },
  ],
  help: "The Oracle plans and works the kernel's tools step by step, returning a structured brief you can save.",
});
