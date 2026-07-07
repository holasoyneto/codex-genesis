import { registerFeature } from "@/kernel/registry";
import { Omnibar } from "./Omnibar";

registerFeature({
  id: "omnibar",
  glyph: "⌘",
  title: "Omnibar",
  purpose: "the one door — a verse, a book, a command",
  keybinding: "⌘K",
  help: "the one door — a verse, a book, a command",
  surfaces: { veil: Omnibar },
});
