// Release notes for the current version — surfaced through the whisper
// lane (once per update on boot, and on demand from the Trace v-stamp).
// The version NUMBER itself is computed from package.json at build time.

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

export const RELEASE_NOTES: string[] = [
  "GENESIS — CODEX reborn on a foundation where chrome cannot clash and dead panels cannot hide.",
  "The Reader: red letters from a true red-letter edition, the golden Name, honest served-from.",
  "⌘K — one door: verses, typo-forgiving, commands. The shelves: seven corpora, two baked for offline.",
];
