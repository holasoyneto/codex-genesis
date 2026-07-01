// The ONE store. All app state that survives a frame lives here, typed;
// all state that survives a session persists under a single versioned key
// with explicit migrations. There is no other bus: features subscribe.

export interface Cursor {
  bookId: string;      // canonical id, e.g. "jhn"
  chapter: number;     // 1-based
  verse: number | null;
  translation: string; // corpus id, e.g. "kjv"
}

export interface OracleSettings {
  engine: "local" | "cloud" | null;
  localUrl: string;        // OpenAI-compatible server (default: Ollama)
  anthropicKey: string;    // the USER'S OWN key — stored on this device only
}

export interface Settings {
  theme: "auto" | "dark" | "light";
  scriptureScale: number;   // px
  redLetter: boolean;
  divineName: boolean;      // golden יהוה treatment
  witness: boolean;         // the app records its own use, locally
  oracle: OracleSettings;
}

export interface Mark {
  id: string;
  bookId: string;
  chapter: number;
  verse: number | null;
  text: string;   // first words of the kept verse, for the panel
  at: number;     // epoch ms
}

export interface AppState {
  cursor: Cursor;
  settings: Settings;
  veil: null | { feature: string; seed?: string }; // one modal surface at a time
  panel: string | null; // the open instrument (desk: side panel · palm: sheet)
  whispers: Whisper[]; // the single notification lane (queued, never stacked chrome)
  lastVersion: string | null; // last version whose notes the user has seen
  marks: Mark[]; // kept verses — the reader's own gold
}

export interface Whisper {
  id: string;
  kind: "briefing" | "toast" | "update";
  title: string;
  body?: string;
  actions?: { label: string; command: string }[];
}

const VERSION = 1;
const KEY = "codex-genesis.v" + VERSION;

const DEFAULTS: AppState = {
  cursor: { bookId: "jhn", chapter: 1, verse: null, translation: "kjv" },
  settings: {
    theme: "auto", scriptureScale: 19, redLetter: true, divineName: true, witness: true,
    oracle: { engine: null, localUrl: "http://localhost:11434/v1", anthropicKey: "" },
  },
  veil: null,
  panel: null,
  whispers: [],
  lastVersion: null,
  marks: [],
};

type Listener = () => void;

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw) as Partial<AppState>;
    // Shallow-merge per top-level slice so new fields get defaults.
    return {
      ...DEFAULTS,
      ...saved,
      cursor: { ...DEFAULTS.cursor, ...saved.cursor },
      settings: {
        ...DEFAULTS.settings,
        ...saved.settings,
        // Nested blocks merge deep so a save from an older version can
        // never clobber new fields — the Oracle key must survive forever.
        oracle: { ...DEFAULTS.settings.oracle, ...saved.settings?.oracle },
      },
      veil: null,      // ephemeral — never persisted open
      whispers: [],    // ephemeral
    };
  } catch {
    return DEFAULTS;
  }
}

let state: AppState = load();
const listeners = new Set<Listener>();
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const { veil: _v, whispers: _w, ...durable } = state;
      localStorage.setItem(KEY, JSON.stringify(durable));
    } catch { /* private mode */ }
  }, 150);
}

export function getState(): AppState { return state; }

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

// ── conveniences ───────────────────────────────────────────────────────
export function goTo(cursor: Partial<Cursor>): void {
  setState((s) => ({ cursor: { ...s.cursor, ...cursor } }));
}

export function whisper(w: Omit<Whisper, "id">): string {
  const id = "w" + Math.random().toString(36).slice(2, 9);
  setState((s) => ({ whispers: [...s.whispers, { ...w, id }] }));
  return id;
}

export function dismissWhisper(id: string): void {
  setState((s) => ({ whispers: s.whispers.filter((w) => w.id !== id) }));
}

export function openVeil(feature: string, seed?: string): void {
  setState({ veil: { feature, seed } });
}
export function closeVeil(): void { setState({ veil: null }); }

// React binding (no dependency): useSyncExternalStore against the store.
import { useSyncExternalStore } from "react";
export function useApp<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}
