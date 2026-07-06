// The timeline engine — 206 events across 13 eras, conventional scholarly
// dating, baked with provenance. Dates before the monarchy are traditional
// and approximate; the surface says so, loudly.

import type { ProvenanceMeta } from "@/kernel/Provenance";

export interface TimelineEvent {
  id: string;
  title: string;
  year: number;                 // negative = BC
  year_range?: [number, number];
  era: string;
  scripture?: string[];         // e.g. "gen.1.1-2.3"
  people?: string[];
  places?: string[];
  summary?: string;
  category?: string;
  contested?: boolean;
}

interface TimelineFile { _meta: ProvenanceMeta; events: TimelineEvent[] }

let loading: Promise<TimelineFile> | null = null;
export function loadTimeline(): Promise<TimelineFile> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}data/timeline.json`)
      .then((r) => { if (!r.ok) throw new Error(`timeline: ${r.status}`); return r.json(); });
  }
  return loading;
}

export const ERA_LABEL: Record<string, string> = {
  "primeval": "PRIMEVAL",
  "patriarchs": "PATRIARCHS",
  "egypt-exodus": "EGYPT & EXODUS",
  "conquest": "CONQUEST",
  "judges": "JUDGES",
  "united-monarchy": "UNITED MONARCHY",
  "divided-kingdom": "DIVIDED KINGDOM",
  "exile": "EXILE",
  "return": "RETURN",
  "intertestamental": "BETWEEN THE TESTAMENTS",
  "life-of-christ": "LIFE OF CHRIST",
  "apostolic": "APOSTOLIC",
  "post-canonical": "AFTER THE CANON",
};

/** Eras whose dates are traditional/approximate — CONTESTED by policy. */
export const CONTESTED_ERAS = new Set(["primeval", "patriarchs"]);

/** First navigable ref of an event: "gen.1.1-2.3" → gen 1:1. */
export function eventRef(e: TimelineEvent): { bookId: string; chapter: number; verse: number } | null {
  const raw = e.scripture?.[0];
  if (!raw) return null;
  const m = raw.match(/^([\w-]+)\.(\d+)\.(\d+)/);
  return m ? { bookId: m[1], chapter: +m[2], verse: +m[3] } : null;
}

export const yearLabel = (y: number) => (y < 0 ? `${-y} BC` : `AD ${y}`);
