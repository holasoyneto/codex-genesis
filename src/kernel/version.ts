// Release notes for the current version — surfaced through the whisper
// lane (once per update on boot, and on demand from the Trace v-stamp).
// The version NUMBER itself is computed from package.json at build time.

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

export const RELEASE_NOTES: string[] = [
  "NO DARK PAGES — every one of the 101 books now finds a corpus that carries it: the Apocrypha through Charles 1913, Enoch through the Ethiopic, the recovered books through Beyond; the chip always tells you who served.",
  "THE WITNESS — the app keeps a local ledger of its own use (jumps, commands, walls you hit) so it can be made better; nothing leaves your device unless you export it. Silence it in Settings.",
  "A page that fails now offers TRY AGAIN and THE SHELVES — never a dead end.",
];
