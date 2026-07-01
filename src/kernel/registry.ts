// Feature manifests — the single source of truth the dock, omnibar index,
// settings panel, and help are generated from. A feature that isn't
// registered doesn't exist; docs cannot promise vapor.

import type { ComponentType } from "react";

export interface FeatureManifest {
  id: string;
  glyph: string;          // one character, the feature's mark
  title: string;
  /** Surfaces this feature can render into. The SHELL decides posture:
      desk mounts `main` as a window, palm mounts it as a sheet. */
  surfaces: {
    main?: ComponentType;          // primary surface (window / sheet)
    veil?: ComponentType<{ seed?: string }>; // modal surface (omnibar etc.)
  };
  /** Omnibar commands, generated into the index. */
  commands?: { phrase: string; hint: string; run: () => void }[];
}

const features = new Map<string, FeatureManifest>();

export function registerFeature(m: FeatureManifest): void {
  if (features.has(m.id)) throw new Error(`feature ${m.id} registered twice`);
  features.set(m.id, m);
}

export function getFeature(id: string): FeatureManifest | undefined {
  return features.get(id);
}

export function allFeatures(): FeatureManifest[] {
  return [...features.values()];
}
