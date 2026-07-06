import { registerFeature } from "@/kernel/registry";
import { goTo, openPanel } from "@/kernel/store";
import { Library } from "./Library";

registerFeature({
  id: "library",
  glyph: "❖",
  title: "Library",
  surfaces: { main: Library },
  commands: [
    { phrase: "library", hint: "the shelves", run: () => openPanel("library") },
    { phrase: "translation kjv", hint: "King James", run: () => goTo({ translation: "kjv" }) },
    { phrase: "translation web", hint: "World English", run: () => goTo({ translation: "web" }) },
    { phrase: "translation hebrew", hint: "WLC Tanakh", run: () => goTo({ translation: "wlc" }) },
    { phrase: "translation greek", hint: "SBLGNT", run: () => goTo({ translation: "sblgnt" }) },
  ],
});
