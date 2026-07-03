// Release notes for the current version — surfaced through the whisper
// lane (once per update on boot, and on demand from the Trace v-stamp).
// The version NUMBER itself is computed from package.json at build time.

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

export const RELEASE_NOTES: string[] = [
  "THE ONTOLOGY — the keystone. Named persons and places in the Torah are now first-class objects: a name in the sacred column becomes a quiet gold underline, and tapping it opens its Dossier — summary, walkable relations, every mention, and honest provenance. Melchizedek's disputed identity is rendered as three sourced views, not flattened to fact.",
  "The omnibar learns entities — type “melchizedek” and the priest-king ranks above any fuzzy book guess.",
  "Every one of the seed's ~3,000 mentions is verified against real scripture by the harness; the full frontier sweep of all 66 books lands next.",
];
