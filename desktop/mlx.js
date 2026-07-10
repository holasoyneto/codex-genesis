// APPLE MLX ENGINE — find mlx_lm.server on disk, find MLX models in the HF
// cache (and any user-picked folders), spawn the server on a free port, and
// wait for it to answer before handing back a base URL. This is the whole
// reason the Oracle's "ON YOUR MACHINE" card can offer a one-click start
// instead of "open Terminal and run this yourself."
const { app, dialog, ipcMain } = require("electron");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const net = require("net");
const http = require("http");

const CONFIG_FILE = () => path.join(app.getPath("userData"), "codex-native.json");

let child = null;
let state = { running: false, port: 0, model: null, pid: null };
let stderrTail = "";

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE(), "utf8")); }
  catch { return { folders: [] }; }
}
function writeConfig(cfg) {
  try { fs.mkdirSync(path.dirname(CONFIG_FILE()), { recursive: true }); fs.writeFileSync(CONFIG_FILE(), JSON.stringify(cfg, null, 2)); }
  catch { /* best effort — a missing config just means an empty folder list */ }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on("error", reject);
  });
}

// ── Model discovery ─────────────────────────────────────────────────────

function dirSizeGB(dir) {
  let total = 0;
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { try { total += fs.statSync(p).size; } catch { /* skip */ } }
    }
  }
  walk(dir);
  return Math.round((total / 1e9) * 10) / 10;
}

// A directory is a usable MLX model if it (or a snapshot subdir) has
// config.json + at least one .safetensors file.
function isMlxWeightsDir(dir) {
  let hasCfg = false, hasWeights = false;
  try {
    for (const name of fs.readdirSync(dir)) {
      if (name === "config.json") hasCfg = true;
      if (name.endsWith(".safetensors")) hasWeights = true;
    }
  } catch { return false; }
  return hasCfg && hasWeights;
}

// Resolve a HF-cache model dir (models--org--name) to its live snapshot path.
function resolveHfSnapshot(modelDir) {
  const snapRoot = path.join(modelDir, "snapshots");
  let hashes;
  try { hashes = fs.readdirSync(snapRoot); } catch { return null; }
  for (const h of hashes) {
    const snap = path.join(snapRoot, h);
    if (isMlxWeightsDir(snap)) return snap;
  }
  return null;
}

function listHfCacheModels() {
  const hubDir = path.join(os.homedir(), ".cache", "huggingface", "hub");
  let entries;
  try { entries = fs.readdirSync(hubDir); } catch { return []; }
  const out = [];
  for (const name of entries) {
    if (!name.startsWith("models--")) continue;
    const modelDir = path.join(hubDir, name);
    const snap = resolveHfSnapshot(modelDir);
    if (!snap) continue;
    const id = name.replace(/^models--/, "").replace(/--/g, "/");
    out.push({ id, name: id, path: snap, sizeGB: dirSizeGB(snap) });
  }
  return out;
}

function listUserFolderModels() {
  const cfg = readConfig();
  const out = [];
  for (const folder of cfg.folders || []) {
    if (isMlxWeightsDir(folder)) {
      out.push({ id: folder, name: path.basename(folder), path: folder, sizeGB: dirSizeGB(folder) });
      continue;
    }
    // one level down — a picked parent folder holding several model dirs
    let entries;
    try { entries = fs.readdirSync(folder, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const sub = path.join(folder, e.name);
      if (isMlxWeightsDir(sub)) out.push({ id: sub, name: e.name, path: sub, sizeGB: dirSizeGB(sub) });
    }
  }
  return out;
}

function listMlxModels() {
  const seen = new Set();
  const out = [];
  for (const m of [...listHfCacheModels(), ...listUserFolderModels()]) {
    if (seen.has(m.path)) continue;
    seen.add(m.path);
    out.push(m);
  }
  return out;
}

// ── Server binary discovery ──────────────────────────────────────────────

function findServerBin() {
  const home = os.homedir();
  const candidates = [];
  // ~/Library/Python/*/bin/mlx_lm.server
  try {
    const pyRoot = path.join(home, "Library", "Python");
    for (const v of fs.readdirSync(pyRoot)) {
      candidates.push(path.join(pyRoot, v, "bin", "mlx_lm.server"));
    }
  } catch { /* no ~/Library/Python */ }
  candidates.push("/opt/homebrew/bin/mlx_lm.server", "/usr/local/bin/mlx_lm.server");
  for (const c of candidates) {
    try { if (fs.existsSync(c) && fs.statSync(c).isFile()) return { cmd: c, args: [] }; } catch { /* skip */ }
  }
  // fallback: python3 -m mlx_lm.server (only if the module actually imports)
  try {
    execFileSync("python3", ["-c", "import mlx_lm.server"], { stdio: "ignore" });
    return { cmd: "python3", args: ["-m", "mlx_lm.server"] };
  } catch { /* not installed */ }
  return null;
}

// ── Readiness poll ────────────────────────────────────────────────────────

function pingModels(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/v1/models", timeout: 1500 }, (res) => {
      let body = "";
      res.on("data", (d) => (body += d));
      res.on("end", () => resolve(res.statusCode === 200 ? body : null));
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

async function waitForReady(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!child) return false; // killed while waiting
    const body = await pingModels(port);
    if (body) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// ── Public ops ────────────────────────────────────────────────────────────

function killChild() {
  if (child) { try { child.kill("SIGTERM"); } catch { /* already dead */ } }
  child = null;
  state = { running: false, port: 0, model: null, pid: null };
  stderrTail = "";
}

async function startModel(modelPath) {
  const bin = findServerBin();
  if (!bin) {
    return { ok: false, error: "mlx_lm.server not found — install with: pip3 install mlx-lm" };
  }
  killChild(); // one engine at a time
  const port = await freePort();
  stderrTail = "";
  const args = [...bin.args, "--model", modelPath, "--port", String(port), "--host", "127.0.0.1"];
  let proc;
  try {
    proc = spawn(bin.cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    return { ok: false, error: "failed to launch mlx_lm.server: " + String(e && e.message || e) };
  }
  child = proc;
  state = { running: false, port, model: modelPath, pid: proc.pid };
  proc.stderr.on("data", (d) => { stderrTail = (stderrTail + d.toString()).slice(-4000); });
  proc.on("exit", () => { if (child === proc) killChild(); });

  const ready = await waitForReady(port, 120000);
  if (child !== proc) return { ok: false, error: "engine was stopped before it finished loading" };
  if (!ready) {
    const tail = stderrTail.trim().split("\n").slice(-8).join("\n");
    killChild();
    return { ok: false, error: "mlx_lm.server did not answer within 120s" + (tail ? "\n" + tail : "") };
  }
  state.running = true;
  return { ok: true, port, base: `http://127.0.0.1:${port}/v1` };
}

function registerMlxIpc() {
  ipcMain.handle("mlx:list", () => {
    try { return listMlxModels(); } catch (e) { return []; }
  });
  ipcMain.handle("mlx:start", async (_evt, modelPath) => {
    try { return await startModel(modelPath); }
    catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  ipcMain.handle("mlx:stop", () => { killChild(); return { ok: true }; });
  ipcMain.handle("mlx:status", () => ({ ...state }));
  ipcMain.handle("native:pick-folder", async (evt) => {
    const win = require("electron").BrowserWindow.fromWebContents(evt.sender);
    const res = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
    if (res.canceled || !res.filePaths.length) return null;
    const dir = res.filePaths[0];
    const cfg = readConfig();
    cfg.folders = Array.from(new Set([...(cfg.folders || []), dir]));
    writeConfig(cfg);
    return dir;
  });
  app.on("will-quit", killChild);
}

module.exports = { registerMlxIpc, killChild };
