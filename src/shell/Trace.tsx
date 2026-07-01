// The Trace — time · theme · version · ⌘K. The shell's ONLY fixed chrome,
// living in the edge region's top-right slot. Nearly transparent until you
// reach for it.

import { useEffect, useState } from "react";
import { useApp, setState, openVeil } from "@/kernel/store";

declare const __APP_VERSION__: string;

export function Trace() {
  const theme = useApp((s) => s.settings.theme);
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
      >{`v${__APP_VERSION__}`}</button>
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
