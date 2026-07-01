import { registerFeature } from "@/kernel/registry";
import { Omnibar } from "./Omnibar";

registerFeature({
  id: "omnibar",
  glyph: "⌘",
  title: "Omnibar",
  surfaces: { veil: Omnibar },
});
