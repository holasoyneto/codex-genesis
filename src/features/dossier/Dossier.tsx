// THE DOSSIER — a named entity as a first-class object. Names, summary,
// every place it is mentioned (walkable), every relation (walkable), and a
// provenance footer that never lets a 19th-century lens pass as neutral fact.
// This is the keystone surface: clicking "Melchizedek" anywhere lands here.

import { useEffect, useState } from "react";
import { useApp, goTo, setState, openDossier } from "@/kernel/store";
import { bookById } from "@/engine/corpus";
import {
  loadOntology, type Ontology, type Entity, type Relation,
  entityMentions, entityRelations, relationLabel, relationInverseLabel,
} from "@/engine/ontology";
import "./dossier.css";

const KIND_GLYPH: Record<string, string> = {
  person: "☖", place: "⌖", event: "✦", number: "№", topic: "◈", lemma: "אָ", pericope: "¶",
};

function refLabel(ref: string): string {
  const [b, c, v] = ref.split(".");
  return `${bookById.get(b)?.name ?? b} ${c}:${v}`;
}
function jump(ref: string) {
  const [b, c, v] = ref.split(".");
  goTo({ bookId: b, chapter: Number(c), verse: Number(v) });
}

// One relation row, oriented from the entity in view. An out-edge reads
// forward ("father of Isaac"); an in-edge reads inverted ("father: Terah").
function RelRow({ o, rel, selfId }: { o: Ontology; rel: Relation; selfId: string }) {
  const out = rel.from === selfId;
  const otherId = out ? rel.to : rel.from;
  const other = o.entities.get(otherId);
  const verb = out ? relationLabel(rel.kind) : relationInverseLabel(rel.kind);
  return (
    <li className="gx-dos-rel">
      <span className="gx-dos-rel-verb">{verb}</span>
      <button className="gx-dos-rel-who" onClick={() => openDossier(otherId)}>
        {other?.names[0] ?? otherId}
      </button>
      {rel.ref ? (
        <button className="gx-dos-rel-ev" title="the verse that says so" onClick={() => jump(rel.ref!)}>
          {refLabel(rel.ref)}
        </button>
      ) : null}
    </li>
  );
}

export function Dossier() {
  const id = useApp((s) => s.entity);
  const [o, setO] = useState<Ontology | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadOntology().then((x) => { if (live) setO(x); }).catch((e) => { if (live) setErr(String(e)); });
    return () => { live = false; };
  }, []);

  const entity: Entity | undefined = o && id ? o.entities.get(id) : undefined;
  const mentions = o && id ? entityMentions(o, id) : [];
  const rels = o && id ? entityRelations(o, id) : { out: [], in: [] };
  const allRels = [...rels.out, ...rels.in];

  return (
    <div className="gx-dossier" role="region" aria-label="Dossier">
      {err ? (
        <p className="gx-dos-none">The ontology could not be read. <span className="gx-dos-err">{err}</span></p>
      ) : !o ? (
        <p className="gx-dos-wait">…</p>
      ) : !entity ? (
        <p className="gx-dos-none">No entity in view. Tap an underlined name in the reader, or search one.</p>
      ) : (
        <>
          <header className="gx-dos-head">
            <span className="gx-dos-glyph" aria-hidden>{KIND_GLYPH[entity.kind] ?? "◦"}</span>
            <div>
              <h2 className="gx-dos-name">{entity.names[0]}</h2>
              <span className="gx-dos-kind">{entity.kind.toUpperCase()}</span>
              {entity.names.length > 1 ? (
                <span className="gx-dos-aka"> · also {entity.names.slice(1).join(", ")}</span>
              ) : null}
            </div>
          </header>

          <p className="gx-dos-summary">{entity.summary}</p>

          {entity.contested ? (
            <div className="gx-dos-contested">
              <span className="gx-dos-stamp">⚑ CONTESTED</span>
              <p className="gx-dos-contested-why">{entity.contested.why}</p>
              <ul className="gx-dos-views">
                {entity.contested.views.map((v, i) => (
                  <li key={i}><span className="gx-dos-view">{v.view}</span><cite className="gx-dos-view-src">{v.source}</cite></li>
                ))}
              </ul>
            </div>
          ) : null}

          {allRels.length ? (
            <section className="gx-dos-sec">
              <h3 className="gx-dos-sec-title">RELATIONS <span className="gx-dos-count">{allRels.length}</span></h3>
              <ul className="gx-dos-rels">
                {allRels.map((r, i) => <RelRow key={i} o={o} rel={r} selfId={entity.id} />)}
              </ul>
            </section>
          ) : null}

          <section className="gx-dos-sec">
            <h3 className="gx-dos-sec-title">MENTIONED <span className="gx-dos-count">{mentions.length}</span></h3>
            {mentions.length ? (
              <ul className="gx-dos-mentions">
                {mentions.map((m, i) => (
                  <li key={i}>
                    <button className="gx-dos-mention" onClick={() => jump(m.ref)}>
                      <span className="gx-dos-mention-ref">{refLabel(m.ref)}</span>
                      <span className="gx-dos-mention-form">{m.form}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="gx-dos-none">No mentions in the seeded books yet.</p>
            )}
          </section>

          <footer className="gx-dos-foot" title={o.meta.limitations}>
            <span className="gx-dos-prov">◇ {o.meta.extracted_by}</span>
            <span className="gx-dos-prov-scope">{o.meta.scope}</span>
          </footer>
        </>
      )}
      <button className="gx-dossier-close" aria-label="Close dossier" onClick={() => setState({ panel: null })}>×</button>
    </div>
  );
}
