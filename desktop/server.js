// Tiny static file server for the bundled CODEX web app. Serving over
// http://127.0.0.1 (rather than file://) gives the app a real origin, so
// localStorage, the service worker, and fetch all behave exactly as they do
// in the browser build. Everything is local — no network needed to render.
const http = require("http");
const fs = require("fs");
const path = require("path");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".webmanifest": "application/manifest+json", ".map": "application/json",
  ".jsonl": "application/x-ndjson", ".ico": "image/x-icon",
};

function createAppServer(rootDir) {
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath === "/") urlPath = "/index.html";
      let filePath = path.join(rootDir, path.normalize(urlPath));
      // stay inside the bundle
      if (!filePath.startsWith(rootDir)) { res.writeHead(403); return res.end("no"); }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        // SPA fallback → index.html
        filePath = path.join(rootDir, "index.html");
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500); res.end(String(e && e.message || e));
    }
  });
  return server;
}

module.exports = { createAppServer };
