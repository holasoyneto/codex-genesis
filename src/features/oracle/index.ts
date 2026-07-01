import { registerFeature } from "@/kernel/registry";
import { setState } from "@/kernel/store";
import { Oracle } from "./Oracle";

registerFeature({
  id: "oracle",
  glyph: "◎",
  title: "Oracle",
  surfaces: { main: Oracle },
  commands: [
    { phrase: "oracle", hint: "ask about this passage", run: () => setState({ panel: "oracle" }) },
  ],
});
