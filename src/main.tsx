import React from "react";
import { createRoot } from "react-dom/client";
import { Shell } from "./shell/Shell";
import { Reader } from "./features/reader";
import "./features/omnibar";
import "./features/library";
import "./features/settings";
import "./styles/base.css";
import { getState, setState, whisper } from "./kernel/store";
import { APP_VERSION, RELEASE_NOTES } from "./kernel/version";

// Boot signal for the smoke harness — same contract as v1.
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

window.__CODEX_READY__ = true;
