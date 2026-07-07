// The shell's ONE keymap — compiled from the feature registry. A command
// that declares `keys`/`keyMatch` is reachable here; nothing else listens.

import { allFeatures } from "@/kernel/registry";
import { openNth } from "@/features/desk";

// Parse a display spec like "⇧esc" / "⌥T" / "⌘`" into a predicate.
function matches(spec: string, e: KeyboardEvent): boolean {
  const first = spec.split("·")[0].trim(); // "esc · ⌘W" — first form parses; the rest use keyMatch
  const meta = first.includes("⌘"), shift = first.includes("⇧"), alt = first.includes("⌥");
  const key = first.replace(/[⌘⇧⌥]/g, "").trim().toLowerCase();
  if (meta !== (e.metaKey || e.ctrlKey) || shift !== e.shiftKey || alt !== e.altKey) return false;
  if (key === "esc") return e.key === "Escape";
  return e.key.toLowerCase() === key;
}

/** Try the registry's declared keybindings; true when one ran. */
export function dispatchKey(e: KeyboardEvent): boolean {
  for (const f of allFeatures()) {
    for (const c of f.commands ?? []) {
      if (!c.keys && !c.keyMatch) continue;
      const hit = c.keyMatch ? c.keyMatch(e) : matches(c.keys!, e);
      if (!hit) continue;
      // ⌘1–9 carries its argument in the key itself.
      if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) openNth(Number(e.key));
      else c.run();
      return true;
    }
  }
  return false;
}
