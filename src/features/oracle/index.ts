import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { setSeed } from "@/kernel/seeds";
import { Oracle } from "./Oracle";

registerFeature({
  id: "oracle",
  glyph: "◎",
  title: "Oracle",
  purpose: "ask a frontier mind — with receipts",
  surfaces: { main: Oracle },
  commands: [
    { phrase: "oracle", hint: "ask about this passage", run: () => openPanel("oracle") },
    {
      phrase: "council",
      hint: "ask two minds at once, reconciled honestly",
      run: () => { setSeed("oracle-mode", "council"); openPanel("oracle"); },
    },
    {
      phrase: "missions",
      hint: "give the Oracle a multi-step research goal",
      run: () => { setSeed("oracle-mode", "mission"); openPanel("oracle"); },
    },
    {
      phrase: "mission",
      hint: "give the Oracle a multi-step research goal",
      run: () => { setSeed("oracle-mode", "mission"); openPanel("oracle"); },
      // `mission <goal>` seeds the goal AND opens the Oracle in mission mode.
      match: (q: string) => {
        const m = q.match(/^missions?\s+(.+)$/i);
        if (!m) return null;
        const goal = m[1].trim();
        return {
          label: `MISSION — ${goal}`,
          hint: "launch this as a mission",
          run: () => { setSeed("missions", goal); setSeed("oracle-mode", "mission"); openPanel("oracle"); },
        };
      },
    },
  ],
  help: "One door to every AI mind: ASK a frontier model with receipts, COUNCIL two minds at once with disagreement shown, or run a MISSION — a multi-step research goal, worked and reported.",
});
