// Release notes for the current version — surfaced through the whisper
// lane (once per update on boot, and on demand from the Trace v-stamp).
// The version NUMBER itself is computed from package.json at build time.

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

export const RELEASE_NOTES: string[] = [
  "THE ORACLE speaks to frontier minds — paste one key from Anthropic, xAI, Gemini, Groq or OpenRouter and CODEX asks the STRONGEST model your key can see, today and whenever the next one ships. Gemini and Groq keys are free.",
  "Or keep it entirely on your machine with Ollama — private, free, no key. Your key persists on this device and nowhere else.",
];
