// Feature manifests — the single source of truth the dock, omnibar index,
// settings panel, and help are generated from. A feature that isn't
// registered doesn't exist; docs cannot promise vapor.

import type { ComponentType } from "react";

export interface FeatureManifest {
  id: string;
  glyph: string;          // one character, the feature's mark
  title: string;
  /** DESIGN §I.3 — one plain-words line, ≤60 chars, written ONCE here and
      reused verbatim by the dock, window title bar, help overlay, and the
      omnibar index. Required; a build-time throw catches an empty one. */
  purpose: string;
  /** Surfaces this feature can render into. The SHELL decides posture:
      desk mounts `main` as a window, palm mounts it as a sheet. */
  surfaces: {
    main?: ComponentType;          // primary surface (window / sheet)
    veil?: ComponentType<{ seed?: string }>; // modal surface (omnibar etc.)
  };
  /** Omnibar commands, generated into the index. A command may also carry
      `match` — a parser for parametrized phrases ("path gen.1.1 rev.21.1",
      "lemma H430"); when it returns a row the omnibar offers it directly. */
  commands?: {
    phrase: string;
    hint: string;
    run: () => void;
    match?: (q: string) => { label: string; hint: string; run: () => void } | null;
    /** Keybinding, declared here so the shell's ONE key listener and the
        generated Help both read the same truth (no scattered listeners).
        `keys` is the display form ("⇧esc", "⌘\`", "⌥T", "Z"); `keyMatch`
        overrides parsing for ranges like ⌘1–9. */
    keys?: string;
    keyMatch?: (e: KeyboardEvent) => boolean;
  }[];
  /** Keybinding shown in generated Help (display only, e.g. "⌘K" or "?"). */
  keybinding?: string;
  /** One-line description for the generated Help overlay. */
  help?: string;
}

const features = new Map<string, FeatureManifest>();
// DESIGN §II.7 — no two features may share a glyph. Tracked alongside the
// map so the check is O(1) per registration, not a full-scan build step.
const glyphOwners = new Map<string, string>();

export function registerFeature(m: FeatureManifest): void {
  if (features.has(m.id)) throw new Error(`feature ${m.id} registered twice`);
  // DESIGN §VI — purpose is required, plain words, ≤60 chars. A feature
  // without one does not ship; this throw IS the enforcement.
  if (!m.purpose || !m.purpose.trim()) {
    throw new Error(`feature ${m.id} has no purpose — DESIGN §I.3 requires one`);
  }
  if (m.purpose.length > 60) {
    throw new Error(`feature ${m.id} purpose exceeds 60 chars: "${m.purpose}"`);
  }
  const prior = glyphOwners.get(m.glyph);
  if (prior) {
    throw new Error(`glyph "${m.glyph}" claimed by both ${prior} and ${m.id} — DESIGN §II.7 forbids sharing`);
  }
  glyphOwners.set(m.glyph, m.id);
  features.set(m.id, m);
}

export function getFeature(id: string): FeatureManifest | undefined {
  return features.get(id);
}

export function allFeatures(): FeatureManifest[] {
  return [...features.values()];
}
