import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { VerseArt } from "./VerseArt";

registerFeature({
  id: "verseart",
  glyph: "❦",
  title: "Verse Art",
  purpose: "depictions of this passage",
  surfaces: { main: VerseArt },
  commands: [
    { phrase: "art", hint: "depictions of this passage", run: () => openPanel("verseart") },
  ],
});
