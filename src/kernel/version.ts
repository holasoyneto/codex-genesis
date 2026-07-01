// Release notes for the current version — surfaced through the whisper
// lane (once per update on boot, and on demand from the Trace v-stamp).
// The version NUMBER itself is computed from package.json at build time.

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

export const RELEASE_NOTES: string[] = [
  "THE THREADS — Torrey's 432,898 cross-references, local and instant: open any verse and walk everywhere Scripture answers it.",
  "SEARCH the whole of Scripture from the omnibar — type any words; MARKS — press B to keep a verse forever; COMPARE — one verse in every voice, Hebrew and Greek beside the English.",
  "CODEX is now installable and works offline — add it to your home screen or dock.",
];
