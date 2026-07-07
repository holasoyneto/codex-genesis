import React from "react";
import { createRoot } from "react-dom/client";
// Base styles (tokens + glass utilities) FIRST — component styles must be
// able to override the shared utilities, so they load after.
import "./styles/base.css";
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
import "./features/galaxy";
import "./features/help";
import "./features/lexicon";
import "./features/timeline";
import "./features/investigations";
import "./features/missions";
import "./features/council";
import "./features/desk";
import { getState, setState, whisper } from "./kernel/store";
import { APP_VERSION, RELEASE_NOTES } from "./kernel/version";
import { startWitness } from "./kernel/witness";

import { callTool, KERNEL_TOOLS } from "./engine/kernel";
import { allFeatures } from "./kernel/registry";
import { openPanel, closePanel } from "./kernel/store";

// Boot signal for the smoke harness — and the kernel door (EXOGRAMMAR law
// 5: every capability callable without any DOM; the interface is mortal,
// the engines are not).
declare global {
  interface Window {
    __CODEX_READY__?: boolean;
    CODEX_KERNEL?: { call: typeof callTool; tools: string[] };
    __CODEX_FEATURES__?: { id: string; title: string; main: boolean }[];
    __CODEX_PANEL__?: { open: (id: string) => void; close: (id?: string) => void };
  }
}
window.CODEX_KERNEL = { call: callTool, tools: KERNEL_TOOLS.map((t) => t.name) };
window.__CODEX_PANEL__ = { open: openPanel, close: closePanel };

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

// First boot: three invitations, not a tutorial. Given once, then never again.
if (!getState().onboarded) {
  setState({ onboarded: true });
  whisper({ kind: "briefing", title: "✦ THE ONE DOOR", body: "Press ⌘K and type anything — John 3:16, a word, a command. The door never dead-ends." });
  setTimeout(() => whisper({ kind: "briefing", title: "✦ TOUCH THE WORD", body: "Tap any verse to focus it — press B to keep it as a mark." }), 2200);
  setTimeout(() => whisper({ kind: "briefing", title: "✦ PULL THE THREADS", body: "With a verse focused, type “threads” in the door — every place Scripture answers it." }), 4400);
}

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

window.__CODEX_FEATURES__ = allFeatures().map((f) => ({ id: f.id, title: f.title, main: !!f.surfaces.main }));
window.__CODEX_READY__ = true;
