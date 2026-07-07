import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { setSeed } from "@/kernel/seeds";
import { Missions } from "./Missions";

registerFeature({
  id: "missions",
  glyph: "☄",
  title: "Missions",
  purpose: "a multi-step research goal, worked and reported",
  surfaces: { main: Missions },
  commands: [
    { phrase: "missions", hint: "give the Oracle a multi-step research goal", run: () => openPanel("missions") },
    {
      phrase: "mission",
      hint: "give the Oracle a multi-step research goal",
      run: () => openPanel("missions"),
      match: (q: string) => {
        const m = q.match(/^missions?\s+(.+)$/i);
        if (!m) return null;
        const goal = m[1].trim();
        return {
          label: `MISSION — ${goal}`,
          hint: "launch this as a mission",
          run: () => { setSeed("missions", goal); openPanel("missions"); },
        };
      },
    },
  ],
  help: "The Oracle plans and works the kernel's tools step by step, returning a structured brief you can save.",
});
