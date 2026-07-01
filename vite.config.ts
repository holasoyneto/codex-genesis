import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  // Relative base so the same build runs at / (dev, Tauri) and under
  // /codex-genesis/ (GitHub Pages) without a rebuild matrix.
  base: "./",
  plugins: [
    react(),
    // The service worker is GENERATED and versioned by build hash — the
    // hand-mirrored-constant class of bug cannot exist here.
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "CODEX",
        short_name: "CODEX",
        description: "An open Bible study instrument.",
        theme_color: "#070b12",
        background_color: "#070b12",
        display: "standalone",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        // App shell precached; corpora cached as they are read (23MB of
        // bundles would bloat the precache — the engine's IndexedDB layer
        // already keeps chapters forever).
        globPatterns: ["**/*.{js,css,html,svg}"],
        navigateFallback: undefined,
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "codex-data" },
          },
        ],
      },
    }),
  ],
  // Version is COMPUTED from package.json — no hand-mirrored constants.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // ./data is the corpus source of truth, served at /data via public/data
  // symlink (same URL contract as v1).
  publicDir: "public",
  server: { port: 7778, strictPort: true },
});
