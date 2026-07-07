// THE TIMELINE — an era ribbon, events as glass chips that turn the
// reader. SCHOLARLY SURVEY, NOT PREDICTION: the banner is load-bearing,
// and dates the scholarship cannot pin carry a CONTESTED stamp.

import { useEffect, useState } from "react";
import { goTo, closePanel } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { Provenance, type ProvenanceMeta } from "@/kernel/Provenance";
import {
  loadTimeline, eventRef, yearLabel, ERA_LABEL, CONTESTED_ERAS, type TimelineEvent,
} from "@/engine/timeline";
import "./timeline.css";

export function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [meta, setMeta] = useState<ProvenanceMeta | null>(null);
  const [era, setEra] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadTimeline()
      .then((f) => { if (live) { setEvents(f.events); setMeta(f._meta); } })
      .catch(() => { if (live) setEvents([]); });
    return () => { live = false; };
  }, []);

  const eras = events ? [...new Set(events.map((e) => e.era))] : [];
  const shown = events?.filter((e) => !era || e.era === era) ?? [];

  return (
    <div className="gx-timeline" role="region" aria-label="Timeline">
      <h2 className="gx-tl-title">THE TIMELINE</h2>
      <p className="gx-tl-banner">SCHOLARLY SURVEY, NOT PREDICTION</p>
      {events === null ? (
        <p className="gx-tl-wait">…</p>
      ) : (
        <>
          <div className="gx-tl-ribbon" role="tablist" aria-label="Eras">
            <button
              className={"gx-tl-era" + (era === null ? " is-active" : "")}
              onClick={() => setEra(null)}
            >ALL</button>
            {eras.map((e) => (
              <button
                key={e}
                className={"gx-tl-era" + (era === e ? " is-active" : "")}
                onClick={() => setEra(era === e ? null : e)}
              >{ERA_LABEL[e] ?? e.toUpperCase()}</button>
            ))}
          </div>
          <ul className="gx-tl-events">
            {shown.map((e) => {
              const ref = eventRef(e);
              const contested = e.contested || CONTESTED_ERAS.has(e.era);
              return (
                <li key={e.id} className="gx-tl-event glass-sm glass">
                  <button
                    className="gx-tl-event-go"
                    disabled={!ref}
                    onClick={() => ref && goTo({ ...ref })}
                    title={e.summary}
                  >
                    <span className="gx-tl-year">
                      {yearLabel(e.year)}
                      {contested ? <span className="gx-tl-contested">⚑ CONTESTED</span> : null}
                    </span>
                    <span className="gx-tl-name">{e.title}</span>
                    {e.summary ? <span className="gx-tl-sum">{e.summary}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {meta ? (
            <footer className="gx-tl-foot">
              <Provenance label="CONVENTIONAL DATING · THIELE / CONSENSUS" meta={meta} />
            </footer>
          ) : null}
        </>
      )}
      {useInWindow() ? null : (
        <button className="gx-tl-close" aria-label="Close timeline" onClick={() => closePanel()}>×</button>
      )}
    </div>
  );
}
