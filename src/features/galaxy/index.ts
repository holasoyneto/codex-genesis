import { registerFeature } from "@/kernel/registry";
import { openPanel, getState } from "@/kernel/store";
import { parseRef } from "@/features/omnibar/refparse";
import { setGalaxyQuery } from "./query";
import { Galaxy } from "./Galaxy";

// A ref token for PATH/NEAR: a dotted key ("gen.1.1"), a compact human ref
// ("gen1:1", "rev21.1"), or an entity id ("melchizedek" — no digits).
function refToken(tok: string): string | null {
  const t = tok.trim().toLowerCase();
  if (!t) return null;
  if (/^[\w-]+\.\d+\.\d+$/.test(t)) return t;
  const parsed = parseRef(t.replace(/([a-z])(\d)/, "$1 $2"));
  if (parsed && !parsed.fuzzy) {
    return `${parsed.book.id}.${parsed.chapter}.${parsed.verse ?? 1}`;
  }
  if (/^[a-z][a-z-]+$/.test(t)) return t; // an entity id, resolved by the graph
  return null;
}

registerFeature({
  id: "galaxy",
  glyph: "✧",
  title: "Galaxy",
  help: "the whole canon as a sky — pan, zoom, click a star to read",
  surfaces: { main: Galaxy },
  commands: [
    {
      phrase: "galaxy",
      hint: "the canon as a sky",
      run: () => { setGalaxyQuery(null); openPanel("galaxy"); },
    },
    {
      phrase: "path",
      hint: "path gen.1.1 rev.21.1 — the shortest thread between two places",
      run: () => {
        const { cursor } = getState();
        setGalaxyQuery({ kind: "near", ref: `${cursor.bookId}.${cursor.chapter}.${cursor.verse ?? 1}` });
        openPanel("galaxy");
      },
      match: (q) => {
        const m = q.match(/^path\s+(\S+)\s+(\S+)$/i);
        if (!m) return null;
        const a = refToken(m[1]), b = refToken(m[2]);
        if (!a || !b) return null;
        return {
          label: `PATH ${a} → ${b}`,
          hint: "burn the gold trail in the Galaxy",
          run: () => { setGalaxyQuery({ kind: "path", a, b }); openPanel("galaxy"); },
        };
      },
    },
    {
      phrase: "near",
      hint: "near isa.53.5 — ignite a verse's neighborhood",
      run: () => {
        const { cursor } = getState();
        setGalaxyQuery({ kind: "near", ref: `${cursor.bookId}.${cursor.chapter}.${cursor.verse ?? 1}` });
        openPanel("galaxy");
      },
      match: (q) => {
        const m = q.match(/^near\s+(.+)$/i);
        if (!m) return null;
        const ref = refToken(m[1]);
        if (!ref) return null;
        return {
          label: `NEAR ${ref}`,
          hint: "ignite the neighborhood in the Galaxy",
          run: () => { setGalaxyQuery({ kind: "near", ref }); openPanel("galaxy"); },
        };
      },
    },
  ],
});
