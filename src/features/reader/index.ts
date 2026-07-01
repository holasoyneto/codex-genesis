import { registerFeature } from "@/kernel/registry";
import { Reader } from "./Reader";

registerFeature({
  id: "reader",
  glyph: "☰",
  title: "Reader",
  surfaces: { main: Reader },
});

export { Reader };
