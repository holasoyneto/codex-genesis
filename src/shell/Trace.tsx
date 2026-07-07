// The Trace — time · theme · version · ⌘K. The shell's ONLY fixed chrome,
// living in the edge region's top-right slot. Nearly transparent until you
// reach for it.

import { useEffect, useState } from "react";
import { useApp, setState, openVeil, whisper, getState, dismissWhisper, openPanel } from "@/kernel/store";
import { APP_VERSION, RELEASE_NOTES } from "@/kernel/version";

export function Trace() {
  const theme = useApp((s) => s.settings.theme);
  const activeCase = useApp((s) => s.investigations.find((c) => c.id === s.activeInvestigation));
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dark = theme === "auto"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : theme === "dark";

  return (
    <div className="gx-trace" role="toolbar" aria-label="System">
      <button
        className="gx-trace-ver"
        data-version
        title="What’s new"
        onClick={() => {
          const open = getState().whispers.find((w) => w.kind === "update");
          if (open) dismissWhisper(open.id);
          else whisper({ kind: "update", title: `✦ CODEX GENESIS v${APP_VERSION}`, body: RELEASE_NOTES.join(" — ") });
        }}
      >{`v${APP_VERSION}`}</button>
      {activeCase ? (
        <button
          className="gx-trace-btn gx-trace-case"
          title={`Active investigation: ${activeCase.title} (${activeCase.items.length} items)`}
          aria-label="Open the active investigation"
          onClick={() => openPanel("investigations")}
        >🗂 {activeCase.items.length}</button>
      ) : null}
      <span className="gx-trace-time">{hh}:{mm}</span>
      <button
        className="gx-trace-btn"
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        onClick={() =>
          setState((s) => ({
            settings: { ...s.settings, theme: dark ? "light" : "dark" },
          }))
        }
      >{dark ? "◐" : "◑"}</button>
      <button
        className="gx-trace-btn"
        aria-label="Open omnibar"
        title="Ask anything · ⌘K"
        onClick={() => openVeil("omnibar")}
      >⌘</button>
    </div>
  );
}
