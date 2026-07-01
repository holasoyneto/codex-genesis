// THE WITNESS — the app records its own use, honestly and locally.
// Purpose: the ledger is read back during development to learn what
// works and what dead-ends. It never leaves the device unless the user
// exports it; there is no wire, no beacon, no third party. A settings
// switch silences it entirely.
//
// What it hears:
//   · session start (version, viewport posture)
//   · every passage jump and translation switch (from store diffs)
//   · panels and veils opening/closing
//   · settings changes
//   · omnibar queries that found NOTHING actionable — the purest signal
//     of what the user wanted and the app couldn't do
//   · uncaught errors and unhandled rejections

import { subscribe, getState, type AppState } from "./store";
import { APP_VERSION } from "./version";

export interface WitnessEvent {
  t: number;          // epoch ms
  kind: string;       // "session" | "jump" | "translation" | "panel" | ...
  detail: string;
}

const KEY = "codex-genesis.witness.v1";
const CAP = 2000;

let events: WitnessEvent[] = [];
try { events = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { /* fresh */ }

let writeTimer: ReturnType<typeof setTimeout> | undefined;
function flush() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(events.slice(-CAP))); } catch { /* full/private */ }
  }, 400);
}

export function record(kind: string, detail: string): void {
  if (!getState().settings.witness) return;
  events.push({ t: Date.now(), kind, detail });
  if (events.length > CAP) events = events.slice(-CAP);
  flush();
}

export function ledger(): WitnessEvent[] { return [...events]; }

export function summary(): { kind: string; n: number; last: string }[] {
  const by = new Map<string, { n: number; last: string }>();
  for (const e of events) {
    const s = by.get(e.kind) ?? { n: 0, last: "" };
    s.n++; s.last = e.detail;
    by.set(e.kind, s);
  }
  return [...by.entries()]
    .map(([kind, s]) => ({ kind, ...s }))
    .sort((a, b) => b.n - a.n);
}

export function exportLedger(): void {
  const blob = new Blob(
    [JSON.stringify({ version: APP_VERSION, exported: new Date().toISOString(), events }, null, 1)],
    { type: "application/json" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `codex-witness-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  record("witness", "ledger exported");
}

export function clearLedger(): void {
  events = [];
  try { localStorage.removeItem(KEY); } catch { /* ok */ }
}

// ── the ear ────────────────────────────────────────────────────────────
export function startWitness(): void {
  record("session", `v${APP_VERSION} · ${innerWidth}×${innerHeight} · ${innerWidth > 880 ? "desk" : "palm"}`);

  let prev: AppState = getState();
  subscribe(() => {
    const s = getState();
    const c = s.cursor, p = prev.cursor;
    if (c.bookId !== p.bookId || c.chapter !== p.chapter) {
      record("jump", `${c.bookId} ${c.chapter}${c.verse ? ":" + c.verse : ""}`);
    }
    if (c.translation !== p.translation) record("translation", `${p.translation} → ${c.translation}`);
    if (s.panel !== prev.panel && s.panel) record("panel", s.panel);
    if (s.veil?.feature !== prev.veil?.feature && s.veil) record("veil", s.veil.feature);
    if (s.settings !== prev.settings) {
      for (const k of Object.keys(s.settings) as (keyof typeof s.settings)[]) {
        if (s.settings[k] === prev.settings[k]) continue;
        // Objects (oracle config) are recorded by name only — never their
        // contents; a key must not reach the ledger even obfuscated.
        const v = s.settings[k];
        record("setting", typeof v === "object" ? `${k} changed` : `${k} = ${String(v)}`);
      }
    }
    prev = s;
  });

  window.addEventListener("error", (e) => record("error", String(e.message).slice(0, 200)));
  window.addEventListener("unhandledrejection", (e) =>
    record("error", "unhandled: " + String((e as PromiseRejectionEvent).reason).slice(0, 200)));
}
