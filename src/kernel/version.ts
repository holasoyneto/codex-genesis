// Release notes for the current version — surfaced through the whisper
// lane (once per update on boot, and on demand from the Trace v-stamp).
// The version NUMBER itself is computed from package.json at build time.

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

export const RELEASE_NOTES: string[] = [
  "THE ORACLE — ask anything about the open passage. Two minds: ON YOUR MACHINE (Ollama — install, open, done; nothing leaves your device) or IN THE CLOUD (your own Anthropic key, stored only here). Every answer names the engine that gave it.",
  "THE THREADS — Torrey's 432,898 cross-references, local and instant; SEARCH, MARKS (press B), COMPARE, offline install — all landed in the last release and are yours.",
];
