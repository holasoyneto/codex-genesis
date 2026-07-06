// THE LEXICON — Strong's numbers become doors. `lemma H430` in the door
// opens a glass dossier: the word itself, transliteration, gloss, and the
// full definition, with provenance one tap away.

import { useEffect, useState } from "react";
import { closePanel } from "@/kernel/store";
import { Provenance } from "@/kernel/Provenance";
import { lemma, type LexResult } from "@/engine/lexicon";
import { subscribeLemma, getLemma } from "./query";
import "./lexicon.css";

export function Lexicon() {
  const [q, setQ] = useState(getLemma() ?? "H430");
  const [input, setInput] = useState("");
  const [hit, setHit] = useState<LexResult | null | "missing">(null);

  useEffect(() => subscribeLemma(setQ), []);

  useEffect(() => {
    let live = true;
    setHit(null);
    lemma(q)
      .then((r) => { if (live) setHit(r ?? "missing"); })
      .catch(() => { if (live) setHit("missing"); });
    return () => { live = false; };
  }, [q]);

  const submit = () => { if (input.trim()) { setQ(input.trim()); setInput(""); } };

  return (
    <div className="gx-lexicon" role="region" aria-label="Lexicon">
      <h2 className="gx-lex-title">THE LEXICON</h2>
      <div className="gx-lex-ask">
        <input
          className="gx-lex-input"
          placeholder="H430 · G26 …"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          spellCheck={false}
        />
        <button className="gx-lex-go" onClick={submit}>OPEN</button>
      </div>
      {hit === null ? (
        <p className="gx-lex-wait">…</p>
      ) : hit === "missing" ? (
        <p className="gx-lex-none">No entry for “{q}” — Strong's numbers run H1–H8674 and G1–G5624.</p>
      ) : (
        <article className="gx-lex-entry">
          <header className="gx-lex-head">
            <span className="gx-lex-word" dir="auto">{hit.entry.word}</span>
            <span className="gx-lex-id">{hit.id}</span>
          </header>
          {hit.entry.translit ? (
            <p className="gx-lex-translit">
              {hit.entry.translit}
              {hit.entry.pron ? <span className="gx-lex-pron"> · {hit.entry.pron}</span> : null}
              {hit.entry.pos ? <span className="gx-lex-pos"> · {hit.entry.pos}</span> : null}
            </p>
          ) : null}
          {hit.entry.gloss ? <p className="gx-lex-gloss">{hit.entry.gloss}</p> : null}
          {hit.entry.def ? <p className="gx-lex-def">{hit.entry.def}</p> : null}
          {hit.entry.kjv ? <p className="gx-lex-kjv">KJV renders: {hit.entry.kjv}</p> : null}
          {hit.entry.usage ? <p className="gx-lex-usage">{hit.entry.usage.toLocaleString()} occurrences</p> : null}
          <footer className="gx-lex-foot">
            <Provenance label={`STRONG ${hit.id.startsWith("H") ? "1894" : "1890"} · OPENSCRIPTURES`} meta={hit.meta} />
          </footer>
        </article>
      )}
      <button className="gx-lex-close" aria-label="Close lexicon" onClick={() => closePanel()}>×</button>
    </div>
  );
}
