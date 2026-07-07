import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { Council } from "./Council";

registerFeature({
  id: "council",
  glyph: "☯",
  title: "Council",
  surfaces: { main: Council },
  commands: [
    { phrase: "council", hint: "ask two minds at once, reconciled honestly", run: () => openPanel("council") },
  ],
  help: "When a local AND a cloud engine are both configured, ask both at once — agreements and disagreements shown honestly.",
});
