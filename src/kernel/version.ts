// Release notes for the current version — surfaced through the whisper
// lane (once per update on boot, and on demand from the Trace v-stamp).
// The version NUMBER itself is computed from package.json at build time.

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

export const RELEASE_NOTES: string[] = [
  "THE WHOLE CANON IN ONE MIND — a frontier model now receives the entire Bible (~990k tokens) with your question; smaller minds get the testament, the book, or the chapter, and every answer says exactly how much scripture it held.",
  "The full World English Bible is now baked in — the complete canon reads offline, and repeat questions to Claude reuse the cached canon at a tenth of the price.",
];
