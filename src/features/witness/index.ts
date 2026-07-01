import { registerFeature } from "@/kernel/registry";
import { setState } from "@/kernel/store";
import { Witness } from "./Witness";

registerFeature({
  id: "witness",
  glyph: "◉",
  title: "Witness",
  surfaces: { main: Witness },
  commands: [
    { phrase: "witness", hint: "what the app has heard", run: () => setState({ panel: "witness" }) },
  ],
});
