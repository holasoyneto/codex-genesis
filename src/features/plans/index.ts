import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { Plans } from "./Plans";

registerFeature({
  id: "plans",
  glyph: "⧗",
  title: "Plans",
  purpose: "seven cadences through scripture, a day at a time",
  surfaces: { main: Plans },
  commands: [
    { phrase: "plans", hint: "daily reading plans", run: () => openPanel("plans") },
  ],
});
