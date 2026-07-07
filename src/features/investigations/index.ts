import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { Investigations } from "./Investigations";

registerFeature({
  id: "investigations",
  glyph: "🗂",
  title: "Investigations",
  surfaces: { main: Investigations },
  commands: [
    { phrase: "investigations", hint: "your case files — evidence, notes, export", run: () => openPanel("investigations") },
    { phrase: "cases", hint: "your case files", run: () => openPanel("investigations") },
  ],
  help: "Case files: evidence gathered from anywhere in the app, notes, and a clean exportable brief.",
});
