// PALANTIR §8 — the work leaves the app. Two mechanisms, both offline,
// no server, no accounts:
//   1. Share permalinks: an investigation encoded into a URL fragment.
//      Receiver's app rehydrates it read-only with a "save a copy" action.
//   2. Store export/import: the WHOLE store to/from a JSON file — the
//      honest first step toward sync (#72), stated as exactly that.
//
// The URL fragment uses a tiny hand-rolled compression pass (a simple
// LZ-style back-reference scheme) before base64url — investigations are
// mostly repeated short tokens (ref keys, book ids), so even a small
// dictionary pass keeps permalinks well under browser URL limits without
// pulling in a dependency for what EXOGRAMMAR law 2 would call a few
// dozen lines of honest logic.

import { getState, setState, type Investigation } from "./store";
import { APP_VERSION } from "./version";

// ── a tiny LZ-style compressor (byte-oriented, dependency-free) ────────
// Not general-purpose — tuned for short, repetitive JSON. Falls back to
// storing literals when no repeat is found; always round-trips exactly.
// Marker byte 255 always introduces a 4-byte back-reference token
// (marker, distLo, distHi, len). Any literal byte — including a literal
// 255 — is instead emitted through the marker 254 followed by the real
// byte, so 255 and 254 never appear ambiguously as literals themselves.
const MATCH = 255, ESCAPE = 254;

function lzCompress(input: string): number[] {
  const bytes = new TextEncoder().encode(input);
  const out: number[] = [];
  const WINDOW = 4096, MIN_MATCH = 4, MAX_MATCH = 255;
  let i = 0;
  while (i < bytes.length) {
    let bestLen = 0, bestDist = 0;
    const start = Math.max(0, i - WINDOW);
    for (let j = start; j < i; j++) {
      let len = 0;
      while (len < MAX_MATCH && i + len < bytes.length && bytes[j + len] === bytes[i + len]) len++;
      if (len > bestLen) { bestLen = len; bestDist = i - j; }
    }
    if (bestLen >= MIN_MATCH) {
      out.push(MATCH, bestDist & 0xff, (bestDist >> 8) & 0xff, bestLen);
      i += bestLen;
    } else {
      const b = bytes[i];
      if (b === MATCH || b === ESCAPE) out.push(ESCAPE, b);
      else out.push(b);
      i++;
    }
  }
  return out;
}

function lzDecompress(tokens: number[]): string {
  const out: number[] = [];
  let i = 0;
  while (i < tokens.length) {
    const b = tokens[i];
    if (b === MATCH) {
      const dist = tokens[i + 1] | (tokens[i + 2] << 8);
      const len = tokens[i + 3];
      const start = out.length - dist;
      for (let k = 0; k < len; k++) out.push(out[start + k]);
      i += 4;
    } else if (b === ESCAPE) {
      out.push(tokens[i + 1]);
      i += 2;
    } else {
      out.push(b);
      i += 1;
    }
  }
  return new TextDecoder().decode(new Uint8Array(out));
}

function bytesToBase64Url(bytes: number[]): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlToBytes(s: string): number[] {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  return [...bin].map((c) => c.charCodeAt(0));
}

export interface SharePayload {
  v: string;          // app version at export time — honesty about provenance
  case: Investigation;
}

/** Encode an investigation into a compact, URL-safe fragment. */
export function encodeShare(c: Investigation): string {
  const payload: SharePayload = { v: APP_VERSION, case: c };
  const json = JSON.stringify(payload);
  return bytesToBase64Url(lzCompress(json));
}

/** Decode a shared fragment back into its investigation, or null if the
    fragment is corrupt/foreign — never throws into the caller. */
export function decodeShare(fragment: string): SharePayload | null {
  try {
    const json = lzDecompress(base64UrlToBytes(fragment));
    const payload = JSON.parse(json) as SharePayload;
    if (!payload?.case?.id || !Array.isArray(payload.case.items)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Build a full permalink for the current origin. */
export function shareUrl(c: Investigation): string {
  return `${location.origin}${location.pathname}#share=${encodeShare(c)}`;
}

/** Read a `#share=...` fragment from the current URL, if present. */
export function readShareFromLocation(): SharePayload | null {
  const m = location.hash.match(/#share=(.+)$/);
  return m ? decodeShare(decodeURIComponent(m[1])) : null;
}

/** "save a copy" — the read-only shared case becomes the receiver's own,
    with a fresh id so it never collides with a case of the same name. */
export function saveSharedCopy(payload: SharePayload): string {
  const copy: Investigation = {
    ...payload.case,
    id: "case" + Math.random().toString(36).slice(2, 9),
    title: `${payload.case.title} (shared)`,
  };
  setState((s) => ({ investigations: [...s.investigations, copy], activeInvestigation: copy.id }));
  history.replaceState(null, "", location.pathname + location.search); // clear the fragment
  return copy.id;
}

// ── whole-store export/import (#72 — sync's honest first step) ────────
const DURABLE_KEYS = [
  "cursor", "settings", "marks", "history", "historyAt", "onboarded",
  "readers", "investigations", "activeInvestigation", "trail", "lastVersion",
] as const;

export function exportStore(): void {
  const s = getState();
  const durable: Record<string, unknown> = {};
  for (const k of DURABLE_KEYS) durable[k] = s[k];
  const blob = new Blob(
    [JSON.stringify({ version: APP_VERSION, exported: new Date().toISOString(), store: durable }, null, 1)],
    { type: "application/json" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `codex-store-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export interface ImportResult { ok: boolean; error?: string }

/** Import a whole-store file. Merges rather than replaces wholesale for
    the append-only slices (marks, investigations) so importing never
    silently destroys what's already here; scalar slices (settings,
    cursor) are taken from the file since that's the point of a restore. */
export async function importStore(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as { store?: Record<string, unknown> };
    const incoming = parsed.store;
    if (!incoming || typeof incoming !== "object") return { ok: false, error: "not a CODEX store file" };
    setState((s) => {
      const patch: Record<string, unknown> = { ...incoming };
      if (Array.isArray(incoming.marks)) {
        const known = new Set(s.marks.map((m) => m.id));
        patch.marks = [...s.marks, ...(incoming.marks as typeof s.marks).filter((m) => !known.has(m.id))];
      }
      if (Array.isArray(incoming.investigations)) {
        const known = new Set(s.investigations.map((c) => c.id));
        patch.investigations = [...s.investigations, ...(incoming.investigations as typeof s.investigations).filter((c) => !known.has(c.id))];
      }
      return patch;
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}
