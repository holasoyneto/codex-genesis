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

// ── PALANTIR §3 — Investigations, evidence, the Trail ──────────────────
// A case file: named, with a walkable list of evidence gathered from
// anywhere in the app (a verse, a range, an entity, a search hit, an
// Oracle answer) plus the analyst's own edges between entities (#24).
export type EvidenceKind = "verse" | "range" | "entity" | "search" | "oracle";

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  /** Free-form payload, kind-specific: a ref string, a range, an entity id,
      a search query + hit count, an Oracle question+answer excerpt. */
  payload: Record<string, unknown>;
  note: string;       // the analyst's own words, editable inline
  addedAt: number;
}

export interface UserEdge {
  id: string;
  from: string;  // entity id or ref
  to: string;
  kind: string;  // free-form relation label the analyst names
  note: string;
  addedAt: number;
}

export interface Investigation {
  id: string;
  title: string;
  created: number;
  items: Evidence[];
  userEdges: UserEdge[];
}

export interface TrailStep {
  cursor: Cursor;
  at: number;
}

/** One instrument window's geometry on the desk. */
export interface WinGeo { x: number; y: number; w: number; h: number }

/** The desk's window manager slice — versioned with the store itself. */
export interface WM {
  open: string[];                 // open instruments, back-to-front (last = focus)
  geo: Record<string, WinGeo>;    // persisted geometry per feature id
}

/** v1.2.0 — a translation the reader added from the world catalog.
    `id` is the app-level translation id ("bolls:NVI"); `bolls` is the
    upstream code the corpus engine's mirror chain already speaks. */
export interface UserVoice {
  id: string;
  bolls: string;
  name: string;
  lang: string; // display lane, e.g. "Español"
  addedAt: number;
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
  /** DESIGN §IV.11 — the palm's back stack: sheets the analyst opened
      before the current one, walkable by the universal back affordance.
      Desk ignores this entirely (it has real windows instead). */
  panelStack: string[];
  /** v1.2.0 — voices the reader added from the world catalog. Built-ins
      live in the corpus registry; this slice is only the user's own
      additions, persisted with the store. */
  voices: UserVoice[];
  /** PALANTIR §3 — every case file the analyst has opened. */
  investigations: Investigation[];
  /** The investigation new evidence lands in ("add to investigation"
      always has a destination — the newest case, or one the analyst
      pinned as active). null only when no case exists yet. */
  activeInvestigation: string | null;
  /** The Witness's jump ledger, rendered as a walkable breadcrumb ribbon
      (the Trail) — distinct from `history` (which drives ⌘[/⌘]): the
      Trail is a longer, savable record of EVERY place visited, not just
      "place changes" eligible for back/forward. */
  trail: TrailStep[];
}

export interface Whisper {
  id: string;
  kind: "briefing" | "toast" | "update";
  title: string;
  body?: string;
  actions?: { label: string; command: string }[];
}

const VERSION = 3;
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
  panelStack: [],
  voices: [],
  investigations: [],
  activeInvestigation: null,
  trail: [],
};

type Listener = () => void;

// Explicit migrations, oldest first. Each version's save is a strict
// subset of the next — new slices (wm, history, onboarded, investigations,
// trail…) take their defaults on first load under the new key.
function migrate(): string | null {
  const v2 = localStorage.getItem("codex-genesis.v2");
  if (v2) {
    localStorage.removeItem("codex-genesis.v2");
    return v2;
  }
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
      panelStack: [], // ephemeral — a fresh boot starts with no back-history
      voices: saved.voices ?? [],
      history: saved.history ?? [],
      historyAt: saved.historyAt ?? (saved.history?.length ?? 0) - 1,
      investigations: saved.investigations ?? [],
      activeInvestigation: saved.activeInvestigation ?? null,
      trail: saved.trail ?? [],
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

function writeNow() {
  try {
    const { veil: _v, whispers: _w, zen: _z, ...durable } = state;
    localStorage.setItem(KEY, JSON.stringify(durable));
  } catch { /* private mode */ }
}

function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(writeNow, 150);
}

/** Force any pending state to disk NOW, cancelling the debounce. Called
    when the page is hidden or torn down so a value entered a moment ago —
    an API key above all — is never lost to the 150ms window when the app
    is closed or backgrounded (a PWA / mobile webview can freeze or kill the
    page before a debounced write ever fires). */
export function flushPersist() {
  clearTimeout(persistTimer);
  writeNow();
}

if (typeof window !== "undefined") {
  // pagehide/beforeunload cover close, navigation and bfcache; the hidden
  // visibility state is the only reliable signal when a mobile OS or an app
  // wrapper backgrounds us — so the key survives "enter it, then quit."
  window.addEventListener("pagehide", flushPersist);
  window.addEventListener("beforeunload", flushPersist);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPersist();
  });
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

const TRAIL_MAX = 300;

export function goTo(cursor: Partial<Cursor>): void {
  setState((s) => {
    const next = { ...s.cursor, ...cursor };
    // The ledger records PLACE changes, not verse focus within a chapter.
    const moved = next.bookId !== s.cursor.bookId || next.chapter !== s.cursor.chapter;
    if (!moved) return { cursor: next };
    const history = [...s.history.slice(0, s.historyAt + 1), next].slice(-HISTORY_MAX);
    // The Trail — every place visited, walkable, longer-lived than the
    // ⌘[/⌘] ledger and independently savable to an investigation.
    const trail = [...s.trail, { cursor: next, at: Date.now() }].slice(-TRAIL_MAX);
    return { cursor: next, history, historyAt: history.length - 1, trail };
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
// back-to-front). Palm: `panel` is THE sheet, monotasking (DESIGN §IV.11)
// — opening B pushes A onto panelStack and replaces it; back() pops the
// stack. Desk ignores panelStack (it has real windows instead).
export function openPanel(id: string): void {
  setState((s) => ({
    panel: id,
    panelStack: s.panel && s.panel !== id ? [...s.panelStack, s.panel] : s.panelStack,
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
      panelStack: s.panel === gone ? s.panelStack.filter((x) => x !== gone) : s.panelStack,
    };
  });
}

/** DESIGN §IV.11 — the palm's universal back affordance: return to the
    sheet that was open before this one (or close entirely, at the root). */
export function panelBack(): void {
  setState((s) => {
    if (!s.panelStack.length) return { panel: null, wm: { ...s.wm, open: [] } };
    const stack = [...s.panelStack];
    const prev = stack.pop()!;
    return {
      panel: prev,
      panelStack: stack,
      wm: { ...s.wm, open: [...s.wm.open.filter((x) => x !== prev), prev] },
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

/** Spawn (or focus) a reader window pinned to a translation. DESIGN §IV.11
    — this is still just "open a panel," so it must go through the SAME
    back-stack bookkeeping as openPanel(), or palm ends up with two sheets
    alive and no way back to the first (the exact bug class this law
    exists to prevent). */
export function openReader(translation: string): void {
  const id = `reader@${translation}`;
  setState((s) => ({
    panel: id,
    panelStack: s.panel && s.panel !== id ? [...s.panelStack, s.panel] : s.panelStack,
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

// ── v1.2.0 — the world's voices ─────────────────────────────────────────
/** Add a catalog voice to MY SHELF (idempotent) and switch the reader to
    it. The corpus engine serves it through the existing mirror chain +
    IndexedDB cache — no new fetch machinery. */
export function addVoice(v: Omit<UserVoice, "id" | "addedAt">): string {
  const id = `bolls:${v.bolls}`;
  setState((s) => ({
    voices: s.voices.some((x) => x.id === id)
      ? s.voices
      : [...s.voices, { ...v, id, addedAt: Date.now() }],
  }));
  return id;
}

/** Remove a user-added voice. The ACTIVE voice cannot be removed (the UI
    hides the control, and the door double-checks). */
export function removeVoice(id: string): void {
  setState((s) => {
    if (s.cursor.translation === id) return {};
    return { voices: s.voices.filter((v) => v.id !== id) };
  });
}

export function openVeil(feature: string, seed?: string): void {
  setState({ veil: { feature, seed } });
}
export function closeVeil(): void { setState({ veil: null }); }

// Open the Dossier on an entity — the one gesture that makes a name a door.
// The veil (omnibar) yields; an instrument takes the floor. Same back-stack
// bookkeeping as openPanel() — DESIGN §IV.11 (see openReader's note above).
export function openDossier(entityId: string): void {
  setState((s) => ({
    entity: entityId,
    veil: null,
    panel: "dossier",
    panelStack: s.panel && s.panel !== "dossier" ? [...s.panelStack, s.panel] : s.panelStack,
    wm: { ...s.wm, open: [...s.wm.open.filter((x) => x !== "dossier"), "dossier"] },
  }));
}

// ── PALANTIR §3 — investigations, evidence, the Trail ───────────────────
function genId(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 9);
}

/** New case file; becomes the active investigation immediately. */
export function createInvestigation(title: string): string {
  const id = genId("case");
  setState((s) => ({
    investigations: [...s.investigations, { id, title: title || "Untitled case", created: Date.now(), items: [], userEdges: [] }],
    activeInvestigation: id,
  }));
  return id;
}

export function deleteInvestigation(id: string): void {
  setState((s) => ({
    investigations: s.investigations.filter((c) => c.id !== id),
    activeInvestigation: s.activeInvestigation === id ? null : s.activeInvestigation,
  }));
}

export function setActiveInvestigation(id: string | null): void {
  setState({ activeInvestigation: id });
}

export function renameInvestigation(id: string, title: string): void {
  setState((s) => ({
    investigations: s.investigations.map((c) => (c.id === id ? { ...c, title } : c)),
  }));
}

/** "add to investigation" — the one action every <Ref>, verse menu,
    dossier, search hit and Oracle answer can carry. Lands in the active
    case, creating "Untitled case" the first time there is none. Returns
    the evidence id (harness-checkable). */
export function addToInvestigation(kind: EvidenceKind, payload: Record<string, unknown>, note = ""): string {
  const evId = genId("ev");
  setState((s) => {
    let caseId = s.activeInvestigation;
    let investigations = s.investigations;
    if (!caseId || !investigations.some((c) => c.id === caseId)) {
      caseId = genId("case");
      investigations = [...investigations, { id: caseId, title: "Untitled case", created: Date.now(), items: [], userEdges: [] }];
    }
    const item: Evidence = { id: evId, kind, payload, note, addedAt: Date.now() };
    investigations = investigations.map((c) => (c.id === caseId ? { ...c, items: [...c.items, item] } : c));
    return { investigations, activeInvestigation: caseId };
  });
  return evId;
}

export function removeEvidence(caseId: string, evId: string): void {
  setState((s) => ({
    investigations: s.investigations.map((c) =>
      c.id === caseId ? { ...c, items: c.items.filter((i) => i.id !== evId) } : c
    ),
  }));
}

export function updateEvidenceNote(caseId: string, evId: string, note: string): void {
  setState((s) => ({
    investigations: s.investigations.map((c) =>
      c.id === caseId
        ? { ...c, items: c.items.map((i) => (i.id === evId ? { ...i, note } : i)) }
        : c
    ),
  }));
}

export function addUserEdge(caseId: string, from: string, to: string, kind: string, note = ""): void {
  setState((s) => ({
    investigations: s.investigations.map((c) =>
      c.id === caseId
        ? { ...c, userEdges: [...c.userEdges, { id: genId("edge"), from, to, kind, note, addedAt: Date.now() }] }
        : c
    ),
  }));
}

export function removeUserEdge(caseId: string, edgeId: string): void {
  setState((s) => ({
    investigations: s.investigations.map((c) =>
      c.id === caseId ? { ...c, userEdges: c.userEdges.filter((e) => e.id !== edgeId) } : c
    ),
  }));
}

/** "save trail to investigation" — the last N jumps become evidence rows
    in one stroke. */
export function saveTrailToInvestigation(n = 20): string {
  const { trail } = getState();
  const recent = trail.slice(-n);
  let last = "";
  for (const step of recent) {
    const ref = `${step.cursor.bookId}.${step.cursor.chapter}.${step.cursor.verse ?? 1}`;
    if (ref === last) continue; // collapse consecutive repeats
    last = ref;
    addToInvestigation("verse", { ref }, "from the Trail");
  }
  return getState().activeInvestigation ?? "";
}

// React binding (no dependency): useSyncExternalStore against the store.
import { useSyncExternalStore } from "react";
export function useApp<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}
