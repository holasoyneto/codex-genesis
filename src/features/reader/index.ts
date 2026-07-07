import { registerFeature } from "@/kernel/registry";
import { getState, goTo, setState, openReader } from "@/kernel/store";
import { allTranslations } from "@/engine/corpus";
import { Reader } from "./Reader";
import { NavSheet } from "./NavSheet";

// T — cycle the main reader through the registry's voices.
const cycleTranslation = () => {
  const { cursor } = getState();
  const ids = allTranslations().map((t) => t.id);
  const next = ids[(ids.indexOf(cursor.translation) + 1) % ids.length];
  goTo({ translation: next });
};

registerFeature({
  id: "reader",
  glyph: "☰",
  title: "Reader",
  purpose: "the text itself",
  keybinding: "← → · B · ⌘[ ⌘]",
  help: "the sacred center — arrows turn chapters, B keeps a verse, ⌘[ ⌘] walk the ledger",
  surfaces: { main: Reader, veil: NavSheet },
  commands: [
    {
      phrase: "translation",
      hint: "cycle the reader's voice",
      keys: "T",
      keyMatch: (e) => !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "t",
      run: cycleTranslation,
    },
    {
      phrase: "reader",
      hint: "reader wlc — a second reader pinned to a voice",
      run: () => openReader(getState().cursor.translation),
      match: (q) => {
        const m = q.match(/^reader\s+(\w+)$/i);
        if (!m) return null;
        const t = allTranslations().find((x) => x.id === m[1].toLowerCase());
        if (!t) return null;
        return {
          label: `READER · ${t.name}`,
          hint: "a window pinned to this voice",
          run: () => openReader(t.id),
        };
      },
    },
    {
      phrase: "hide reader",
      hint: "the sacred center yields the desk (again to restore)",
      run: () => setState((s) => ({ hideReader: !s.hideReader })),
    },
  ],
});

export { Reader };
