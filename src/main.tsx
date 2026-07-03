import React from "react";
import { createRoot } from "react-dom/client";
import { Shell } from "./shell/Shell";
import { Reader } from "./features/reader";
import "./features/omnibar";
import "./features/library";
import "./features/settings";
import "./features/witness";
import "./features/oracle";
import "./features/marks";
import "./features/threads";
import "./features/search";
import "./features/compare";
import "./features/dossier";
import "./styles/base.css";
import { getState, setState, whisper } from "./kernel/store";
import { APP_VERSION, RELEASE_NOTES } from "./kernel/version";
import { startWitness } from "./kernel/witness";

// Boot signal for the smoke harness.
declare global {
  interface Window { __CODEX_READY__?: boolean }
}

function App() {
  return (
    <Shell>
      <Reader />
    </Shell>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// What's-new, once per update. First-ever visit records silently — there
// is nothing to delta against, and a greeting card on first open is noise.
const seen = getState().lastVersion;
if (seen !== APP_VERSION) {
  if (seen !== null) {
    whisper({ kind: "update", title: `✦ WHAT'S NEW · v${APP_VERSION}`, body: RELEASE_NOTES.join(" — ") });
  }
  setState({ lastVersion: APP_VERSION });
}

startWitness();

// The generated service worker (production builds only). When a new
// version lands, the whisper offers one tap — no double-reload rituals.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    const update = registerSW({
      onNeedRefresh() {
        whisper({
          kind: "update",
          title: "✦ CODEX updated",
          body: "A new version is ready — close this to keep reading, or refresh to receive it.",
        });
        void update;
      },
    });
  });
}

window.__CODEX_READY__ = true;
