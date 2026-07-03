// The omnibar — the one door. Type a reference and go; type anything and
// the door offers what it has. Never a dead end: there is always at least
// one actionable row. Rows are GENERATED from the feature registry —
// the index cannot promise what isn't registered.

import { useEffect, useMemo, useRef, useState } from "react";
import { goTo, closeVeil, setState, openDossier } from "@/kernel/store";
import { allFeatures } from "@/kernel/registry";
import { record } from "@/kernel/witness";
import { setSearchSeed } from "@/features/search";
import { getLoadedOntology, searchEntities } from "@/engine/ontology";
import { parseRef } from "./refparse";

const setPanel = (panel: string) => setState({ panel });
import "./omnibar.css";

interface Row {
  key: string;
  glyph: string;
  label: string;
  hint: string;
  run: () => void;
}

export function Omnibar({ seed }: { seed?: string }) {
  const [q, setQ] = useState(seed ?? "");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const ref = parseRef(q);
    const refRow: Row | null = ref ? {
      key: "ref",
      glyph: "☰",
      label: `${ref.book.name} ${ref.chapter}${ref.verse ? ":" + ref.verse : ""}`,
      hint: ref.fuzzy ? "did you mean — open" : "open",
      run: () => {
        goTo({ bookId: ref.book.id, chapter: ref.chapter, verse: ref.verse });
        closeVeil();
      },
    } : null;
    // A sure reference leads; a FUZZY guess must not outrank an exact
    // command ("marks" is the panel, not the gospel of Mark misspelled).
    if (refRow && !ref!.fuzzy) out.push(refRow);
    const needle = q.trim().toLowerCase();
    for (const f of allFeatures()) {
      for (const c of f.commands ?? []) {
        if (!needle || c.phrase.toLowerCase().includes(needle)) {
          out.push({
            key: `${f.id}:${c.phrase}`,
            glyph: f.glyph,
            label: c.phrase,
            hint: c.hint,
            run: () => { c.run(); closeVeil(); },
          });
        }
      }
    }
    // Entities are doors. A named person or place ranks ABOVE a fuzzy book
    // guess ("melchizedek" is the priest-king, not a misspelt book) but never
    // shadows an exact reference or command.
    const ont = getLoadedOntology();
    if (ont && needle.length >= 2) {
      for (const e of searchEntities(ont, needle, 3)) {
        out.push({
          key: `entity:${e.id}`,
          glyph: e.kind === "place" ? "⌖" : "☖",
          label: e.names[0],
          hint: e.summary.length > 48 ? e.summary.slice(0, 47) + "…" : e.summary,
          run: () => { openDossier(e.id); closeVeil(); },
        });
      }
    }
    if (refRow && ref!.fuzzy) out.push(refRow);
    // Free text that names no verse and no command searches Scripture —
    // words are never a dead end.
    if (needle.length > 2 && !ref) {
      out.push({
        key: "search",
        glyph: "☌",
        label: `Search Scripture for “${q.trim()}”`,
        hint: "every occurrence",
        run: () => {
          setSearchSeed(q.trim());
          setPanel("search");
          closeVeil();
        },
      });
    }
    if (!out.length) {
      out.push({
        key: "guide",
        glyph: "✦",
        label: "Try a reference — John 3:16 · psa 23 · 1 co 13",
        hint: "the door opens on the Word",
        run: () => {
          // The purest signal of an unmet want: the user asked, the door
          // had nothing. The witness remembers what was asked.
          record("dead-end", q);
          setQ("John 3:16");
        },
      });
    }
    return out.slice(0, 8);
  }, [q]);

  useEffect(() => setSel(0), [q]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); rows[sel]?.run(); }
  };

  return (
    <div className="gx-omni" role="dialog" aria-label="Omnibar">
      <input
        ref={inputRef}
        className="gx-omni-input"
        placeholder="Where to? — a verse, a book, a command"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        spellCheck={false}
      />
      <ul className="gx-omni-rows" role="listbox">
        {rows.map((r, i) => (
          <li key={r.key} role="option" aria-selected={i === sel}>
            <button
              className={"gx-omni-row" + (i === sel ? " is-sel" : "")}
              onMouseEnter={() => setSel(i)}
              onClick={r.run}
            >
              <span className="gx-omni-glyph" aria-hidden>{r.glyph}</span>
              <span className="gx-omni-label">{r.label}</span>
              <span className="gx-omni-hint">{r.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
