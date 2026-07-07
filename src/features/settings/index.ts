import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { Settings } from "./Settings";

registerFeature({
  id: "settings",
  glyph: "⚙",
  title: "Settings",
  purpose: "how the app looks, reads, and thinks",
  surfaces: { main: Settings },
  commands: [
    { phrase: "settings", hint: "theme · size · letters", run: () => openPanel("settings") },
  ],
});
