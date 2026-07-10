// LOCAL MODEL DISCOVERY — find, list, and pick the models already on this
// machine. Two paths, both honest:
//   • AUTOFIND — probe the OpenAI-compatible servers people actually run
//     (Ollama, Apple MLX via mlx_lm.server, LM Studio, llama.cpp) and read
//     back the models each one is serving right now. This is the path that
//     yields a model you can *use* immediately.
//   • FOLDER — point at a directory and scan it for model files on disk
//     (.gguf, or an MLX/HF folder = config.json + *.safetensors). This finds
//     what's installed even when no server is up — a hint to go start one.
//
// In the packaged Mac app the window runs with webSecurity off, so these
// localhost probes are never blocked. In a plain browser tab a server may
// refuse cross-origin (see the Ollama origins hint in the Oracle setup).

export interface LocalServer {
  provider: string;   // "Ollama", "Apple MLX", …
  base: string;       // OpenAI-compatible base URL, e.g. http://localhost:11434/v1
  models: string[];   // model ids the server is serving
}

// The well-known local endpoints, in the order people are likeliest to run
// them. Apple MLX's `mlx_lm.server` defaults to :8080; we also try :8081.
const CANDIDATES: { provider: string; base: string }[] = [
  { provider: "Ollama",     base: "http://localhost:11434/v1" },
  { provider: "Apple MLX",  base: "http://localhost:8080/v1" },
  { provider: "Apple MLX",  base: "http://127.0.0.1:8081/v1" },
  { provider: "LM Studio",  base: "http://localhost:1234/v1" },
  { provider: "llama.cpp",  base: "http://localhost:8000/v1" },
];

async function probeModels(base: string): Promise<string[]> {
  const r = await fetch(`${base.replace(/\/$/, "")}/models`, { signal: AbortSignal.timeout(1500) });
  if (!r.ok) return [];
  const j = (await r.json()) as { data?: { id?: string }[] };
  return (j.data ?? []).map((m) => m?.id).filter((x): x is string => !!x);
}

/** Probe every known local server in parallel; return the ones that answered
    with at least one model. Never throws — an unreachable server is just
    absent from the list. */
export async function autofindLocal(): Promise<LocalServer[]> {
  const found = await Promise.all(
    CANDIDATES.map(async (c) => {
      try {
        const models = await probeModels(c.base);
        return models.length ? { provider: c.provider, base: c.base, models } : null;
      } catch { return null; }
    })
  );
  // dedupe by base (MLX + llama.cpp can share :8080) — first hit wins
  const seen = new Set<string>();
  const out: LocalServer[] = [];
  for (const s of found) {
    if (s && !seen.has(s.base)) { seen.add(s.base); out.push(s); }
  }
  return out;
}

// ── Native MLX bridge (Electron only) ───────────────────────────────────
// In the packaged Mac app, preload.js exposes window.codexNative — the only
// way the renderer can start/stop a real process. Absent in a plain browser
// tab, where the Oracle falls back to AUTOFIND/SELECT FOLDER only.

export interface MlxModelInfo { id: string; name: string; path: string; sizeGB: number }
export interface MlxStartResult { ok: boolean; port?: number; base?: string; error?: string }
export interface MlxStatus { running: boolean; port: number; model: string | null; pid: number | null }

export interface NativeMlx {
  mlxList: () => Promise<MlxModelInfo[]>;
  mlxStart: (path: string) => Promise<MlxStartResult>;
  mlxStop: () => Promise<{ ok: boolean }>;
  mlxStatus: () => Promise<MlxStatus>;
  pickFolder: () => Promise<string | null>;
}

export const nativeMlx: NativeMlx | null = (typeof window !== "undefined" && (window as any).codexNative) || null;

// ── Folder scan (Chromium File System Access API) ──────────────────────
export const supportsFolderScan =
  typeof window !== "undefined" && "showDirectoryPicker" in window;

export interface FolderModel { name: string; kind: "gguf" | "mlx" }

/** Ask the user for a folder, then walk it (bounded depth) for model files.
    Returns null if the picker is unavailable or the user cancels. */
export async function scanFolderForModels(): Promise<{ folder: string; models: FolderModel[] } | null> {
  if (!supportsFolderScan) return null;
  let dir: any;
  try { dir = await (window as any).showDirectoryPicker({ mode: "read" }); }
  catch { return null; } // user cancelled
  const models: FolderModel[] = [];
  const seen = new Set<string>();

  async function isMlxDir(handle: any): Promise<boolean> {
    let cfg = false, weights = false;
    try {
      for await (const [n, e] of handle.entries()) {
        if (e.kind === "file") {
          if (n === "config.json") cfg = true;
          if (n.endsWith(".safetensors")) weights = true;
        }
        if (cfg && weights) return true;
      }
    } catch { /* unreadable dir */ }
    return cfg && weights;
  }

  async function walk(handle: any, depth: number) {
    if (depth > 3) return;
    try {
      for await (const [name, entry] of handle.entries()) {
        if (entry.kind === "file") {
          if (name.toLowerCase().endsWith(".gguf") && !seen.has(name)) {
            seen.add(name); models.push({ name, kind: "gguf" });
          }
        } else if (entry.kind === "directory") {
          if (await isMlxDir(entry)) {
            if (!seen.has(name)) { seen.add(name); models.push({ name, kind: "mlx" }); }
          } else {
            await walk(entry, depth + 1);
          }
        }
      }
    } catch { /* permission or IO — best effort */ }
  }

  await walk(dir, 0);
  return { folder: dir.name as string, models };
}
