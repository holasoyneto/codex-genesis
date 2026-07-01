import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  plugins: [react()],
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
