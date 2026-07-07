import { registerFeature } from "@/kernel/registry";
import { Omnibar } from "./Omnibar";

registerFeature({
  id: "omnibar",
  glyph: "⌘",
  title: "Omnibar",
  keybinding: "⌘K",
  help: "the one door — a verse, a book, a command",
  surfaces: { veil: Omnibar },
});
