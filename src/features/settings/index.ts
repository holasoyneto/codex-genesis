import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { Settings } from "./Settings";

registerFeature({
  id: "settings",
  glyph: "⚙",
  title: "Settings",
  surfaces: { main: Settings },
  commands: [
    { phrase: "settings", hint: "theme · size · letters", run: () => openPanel("settings") },
  ],
});
