// CODEX — Electron main process. Boots a tiny local static server that serves
// the bundled web app, then opens it in a native window. The entire app ships
// inside the .app (app/ = the Vite dist), so it ALWAYS renders — 100% offline,
// no backend, no network. The Oracle reaches api.anthropic.com only if the user
// has entered their own key and there's signal; everything else works on a plane.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");
const net = require("net");
const { createAppServer } = require("./server");
const { registerMlxIpc } = require("./mlx");

const BUNDLE_DIR = path.join(__dirname, "app");
let mainWindow = null;
let serverPort = 0;

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on("error", reject);
  });
}

async function startServer() {
  serverPort = await freePort();
  const server = createAppServer(BUNDLE_DIR);
  await new Promise((res) => server.listen(serverPort, "127.0.0.1", res));
  console.log("[codex] serving on 127.0.0.1:" + serverPort);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 840, minWidth: 380, minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#05080f",
    webPreferences: {
      contextIsolation: true, nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      // trusted local wrapper: let the Oracle call the Anthropic API cross-origin
      webSecurity: false,
    },
    show: false,
  });
  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/index.html`);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) { shell.openExternal(url); return { action: "deny" }; }
    return { action: "allow" };
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: "appMenu" },
    { role: "editMenu" },
    { label: "View", submenu: [
      { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => mainWindow && mainWindow.reload() },
      { role: "toggleDevTools" }, { type: "separator" },
      { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
      { type: "separator" }, { role: "togglefullscreen" },
    ]},
    { role: "windowMenu" },
  ]));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else {
  app.on("second-instance", () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(async () => {
    await startServer();
    registerMlxIpc();
    createWindow();
    buildMenu();
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
