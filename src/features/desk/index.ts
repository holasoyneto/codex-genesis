// THE DESK — the shell's own verbs, declared as a manifest like everything
// else, so the omnibar and the generated Help read the same truth and the
// shell keeps exactly ONE key listener.

import { registerFeature, allFeatures } from "@/kernel/registry";
import {
  getState, setState, openPanel, closePanel, closeAllPanels, cyclePanels, resetLayout,
} from "@/kernel/store";

const toggleTheme = () => {
  const { theme } = getState().settings;
  const dark = theme === "auto"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : theme === "dark";
  setState((s) => ({ settings: { ...s.settings, theme: dark ? "light" : "dark" } }));
};

const dockables = () => allFeatures().filter((f) => f.surfaces.main);

registerFeature({
  id: "desk",
  glyph: "❖",
  title: "Desk",
  help: "the shell's own verbs — windows, theme, zen",
  surfaces: {},
  commands: [
    {
      phrase: "close all",
      hint: "clear the desk in one stroke",
      keys: "⇧esc",
      run: () => closeAllPanels(),
    },
    {
      phrase: "close window",
      hint: "close the focused instrument",
      keys: "esc · ⌘W",
      keyMatch: (e) =>
        (e.key === "Escape" && !e.shiftKey && !e.metaKey && !e.ctrlKey) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w" && !e.shiftKey && !e.altKey),
      run: () => closePanel(),
    },
    {
      phrase: "cycle windows",
      hint: "bring the back window forward",
      keys: "⌘`",
      keyMatch: (e) => (e.metaKey || e.ctrlKey) && (e.key === "`" || e.code === "Backquote"),
      run: () => cyclePanels(),
    },
    {
      phrase: "theme",
      hint: "flip dark / light",
      keys: "⌥T",
      keyMatch: (e) => e.altKey && !e.metaKey && !e.ctrlKey && e.code === "KeyT",
      run: toggleTheme,
    },
    {
      phrase: "reset layout",
      hint: "windows return to their default places",
      run: () => resetLayout(),
    },
    {
      phrase: "zen",
      hint: "only the Word — any key returns the desk",
      keys: "Z",
      keyMatch: (e) => !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "z",
      run: () => setState((s) => ({ zen: !s.zen })),
    },
    {
      phrase: "open instrument 1–9",
      hint: "the dock by number",
      keys: "⌘1–9",
      keyMatch: (e) => (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key),
      run: () => { const f = dockables()[0]; if (f) openPanel(f.id); },
    },
  ],
});

/** ⌘n resolved against the live registry (the dock's own order). */
export function openNth(n: number): void {
  const f = dockables()[n - 1];
  if (f) openPanel(f.id);
}
