import { registerFeature } from "@/kernel/registry";
import { openVeil } from "@/kernel/store";
import { Help } from "./Help";

registerFeature({
  id: "help",
  glyph: "?",
  title: "Help",
  purpose: "every instrument and every key, in one place",
  keybinding: "?",
  help: "everything registered, in one glass overlay",
  surfaces: { veil: Help },
  commands: [
    { phrase: "help", hint: "the instruments and the keys", run: () => openVeil("help") },
  ],
});
