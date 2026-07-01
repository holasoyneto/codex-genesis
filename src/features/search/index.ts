import { registerFeature } from "@/kernel/registry";
import { setState } from "@/kernel/store";
import { Search, setSearchSeed } from "./Search";

registerFeature({
  id: "search",
  glyph: "☌",
  title: "Search",
  surfaces: { main: Search },
  commands: [
    { phrase: "search", hint: "the whole of Scripture", run: () => { setSearchSeed(""); setState({ panel: "search" }); } },
  ],
});

export { setSearchSeed };
