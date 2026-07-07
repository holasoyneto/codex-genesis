// A tiny command registry for whisper action buttons — the Whisper type
// already carried `{label, command}` pairs (PALANTIR-era plan) with no
// dispatcher; this is that dispatcher, kept intentionally small: a
// command is a string key registered once by whichever feature needs an
// actionable whisper (share rehydration, onboarding, etc.).

const commands = new Map<string, () => void>();

export function registerWhisperCommand(key: string, fn: () => void): void {
  commands.set(key, fn);
}

export function runWhisperCommand(key: string): void {
  commands.get(key)?.();
}
