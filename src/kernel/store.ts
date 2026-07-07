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
  model: string;           // "" = the strongest the key can see (auto)
  effort: "low" | "medium" | "high"; // Anthropic thinking budget
}

export interface Settings {
  theme: "auto" | "dark" | "light";
  scriptureScale: number;   // px
  redLetter: boolean;
  divineName: boolean;      // golden יהוה treatment
  entities: boolean;        // quiet entity underlines in the sacred column
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

/** One instrument window's geometry on the desk. */
export interface WinGeo { x: number; y: number; w: number; h: number }

/** The desk's window manager slice — versioned with the store itself. */
export interface WM {
  open: string[];                 // open instruments, back-to-front (last = focus)
  geo: Record<string, WinGeo>;    // persisted geometry per feature id
}

export interface AppState {
  cursor: Cursor;
  settings: Settings;
  veil: null | { feature: string; seed?: string }; // one modal surface at a time
  panel: string | null; // the focused instrument (palm renders it as THE sheet)
  wm: WM;               // desk posture: several instruments at once, as windows
  entity: string | null; // the entity the Dossier is looking at (an ontology id)
  whispers: Whisper[]; // the single notification lane (queued, never stacked chrome)
  lastVersion: string | null; // last version whose notes the user has seen
  marks: Mark[]; // kept verses — the reader's own gold
  history: Cursor[];    // the reader's jump ledger (⌘[ back · ⌘] forward)
  historyAt: number;    // index into history of "now"
  onboarded: boolean;   // the three first-boot invitations were given
  zen: boolean;         // chrome hidden, scripture alone (ephemeral)
  hideReader: boolean;  // the sacred center yields the desk to the windows
  /** Windowed readers pinned to a translation ("reader@wlc"). Linked ones
      follow the global cursor; unlinked ones keep their own place. */
  readers: Record<string, { translation: string; linked: boolean; bookId: string; chapter: number }>;
}

export interface Whisper {
  id: string;
  kind: "briefing" | "toast" | "update";
  title: string;
  body?: string;
  actions?: { label: string; command: string }[];
}

const VERSION = 2;
const KEY = "codex-genesis.v" + VERSION;

const DEFAULTS: AppState = {
  cursor: { bookId: "jhn", chapter: 1, verse: null, translation: "kjv" },
  settings: {
    theme: "auto", scriptureScale: 19, redLetter: true, divineName: true, entities: true, witness: true,
    oracle: { engine: null, localUrl: "http://localhost:11434/v1", anthropicKey: "", model: "", effort: "low" },
  },
  veil: null,
  panel: null,
  wm: { open: [], geo: {} },
  entity: null,
  whispers: [],
  lastVersion: null,
  marks: [],
  history: [],
  historyAt: -1,
  onboarded: false,
  zen: false,
  hideReader: false,
  readers: {},
};

type Listener = () => void;

// Explicit migrations, oldest first. A v1 save is a strict subset of v2 —
// the new slices (wm, history, onboarded) take their defaults.
function migrate(): string | null {
  const v1 = localStorage.getItem("codex-genesis.v1");
  if (v1) {
    localStorage.removeItem("codex-genesis.v1");
    return v1;
  }
  return null;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY) ?? migrate();
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
      wm: { open: saved.wm?.open ?? [], geo: saved.wm?.geo ?? {} },
      history: saved.history ?? [],
      historyAt: saved.historyAt ?? (saved.history?.length ?? 0) - 1,
      veil: null,      // ephemeral — never persisted open
      whispers: [],    // ephemeral
      zen: false,      // ephemeral
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
      const { veil: _v, whispers: _w, zen: _z, ...durable } = state;
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
const HISTORY_MAX = 100;

export function goTo(cursor: Partial<Cursor>): void {
  setState((s) => {
    const next = { ...s.cursor, ...cursor };
    // The ledger records PLACE changes, not verse focus within a chapter.
    const moved = next.bookId !== s.cursor.bookId || next.chapter !== s.cursor.chapter;
    if (!moved) return { cursor: next };
    const history = [...s.history.slice(0, s.historyAt + 1), next].slice(-HISTORY_MAX);
    return { cursor: next, history, historyAt: history.length - 1 };
  });
}

/** ⌘[ — walk the jump ledger backward. */
export function historyBack(): void {
  setState((s) => {
    // First step back from an unrecorded start seeds the ledger with "here".
    const at = s.historyAt;
    if (at <= 0) return {};
    return { cursor: s.history[at - 1], historyAt: at - 1 };
  });
}

/** ⌘] — walk it forward again. */
export function historyForward(): void {
  setState((s) => {
    if (s.historyAt >= s.history.length - 1) return {};
    return { cursor: s.history[s.historyAt + 1], historyAt: s.historyAt + 1 };
  });
}

export function whisper(w: Omit<Whisper, "id">): string {
  const id = "w" + Math.random().toString(36).slice(2, 9);
  setState((s) => ({ whispers: [...s.whispers, { ...w, id }] }));
  return id;
}

export function dismissWhisper(id: string): void {
  setState((s) => ({ whispers: s.whispers.filter((w) => w.id !== id) }));
}

// Panel doors — features open and close through these, never by writing
// `panel` directly. Desk: several instruments at once as windows (wm.open,
// back-to-front). Palm: `panel` is THE sheet. One tree, two postures.
export function openPanel(id: string): void {
  setState((s) => ({
    panel: id,
    wm: { ...s.wm, open: [...s.wm.open.filter((x) => x !== id), id] },
  }));
}

export function closePanel(id?: string): void {
  setState((s) => {
    const gone = id ?? s.panel;
    const open = s.wm.open.filter((x) => x !== gone);
    return {
      wm: { ...s.wm, open },
      panel: s.panel === gone ? (open[open.length - 1] ?? null) : s.panel,
    };
  });
}

/** Raise a window to the front (desk focus). */
export function focusPanel(id: string): void {
  setState((s) => ({
    panel: id,
    wm: { ...s.wm, open: [...s.wm.open.filter((x) => x !== id), id] },
  }));
}

export function setPanelGeo(id: string, geo: WinGeo): void {
  setState((s) => ({ wm: { ...s.wm, geo: { ...s.wm.geo, [id]: geo } } }));
}

/** ⇧esc — the desk clears in one stroke. */
export function closeAllPanels(): void {
  setState((s) => ({ panel: null, wm: { ...s.wm, open: [] } }));
}

/** ⌘\` — cycle focus through the open windows (back window comes forward). */
export function cyclePanels(): void {
  setState((s) => {
    if (s.wm.open.length < 2) return {};
    const [back, ...rest] = s.wm.open;
    return { panel: back, wm: { ...s.wm, open: [...rest, back] } };
  });
}

/** "reset layout" — geometry forgotten; windows re-derive their defaults. */
export function resetLayout(): void {
  setState((s) => ({ wm: { ...s.wm, geo: {} } }));
}

/** Spawn (or focus) a reader window pinned to a translation. */
export function openReader(translation: string): void {
  const id = `reader@${translation}`;
  setState((s) => ({
    panel: id,
    readers: {
      ...s.readers,
      [id]: s.readers[id] ?? {
        translation, linked: true,
        bookId: s.cursor.bookId, chapter: s.cursor.chapter,
      },
    },
    wm: { ...s.wm, open: [...s.wm.open.filter((x) => x !== id), id] },
  }));
}

export function toggleReaderLink(id: string): void {
  setState((s) => {
    const r = s.readers[id];
    if (!r) return {};
    // Re-linking snaps the window back onto the global cursor.
    return {
      readers: {
        ...s.readers,
        [id]: r.linked
          ? { ...r, linked: false }
          : { ...r, linked: true, bookId: s.cursor.bookId, chapter: s.cursor.chapter },
      },
    };
  });
}

export function openVeil(feature: string, seed?: string): void {
  setState({ veil: { feature, seed } });
}
export function closeVeil(): void { setState({ veil: null }); }

// Open the Dossier on an entity — the one gesture that makes a name a door.
// The veil (omnibar) yields; an instrument takes the floor.
export function openDossier(entityId: string): void {
  setState((s) => ({
    entity: entityId,
    veil: null,
    panel: "dossier",
    wm: { ...s.wm, open: [...s.wm.open.filter((x) => x !== "dossier"), "dossier"] },
  }));
}

// React binding (no dependency): useSyncExternalStore against the store.
import { useSyncExternalStore } from "react";
export function useApp<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}
