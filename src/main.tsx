import React from "react";
import { createRoot } from "react-dom/client";
import { Shell } from "./shell/Shell";
import { Reader } from "./features/reader";
import "./features/omnibar";
import "./styles/base.css";

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
window.__CODEX_READY__ = true;
