// Plans — seven cadences through scripture, a day at a time. Each plan is
// a bundled module (data/modules/plan-*.json), fetched lazily only once
// chosen; progress lives entirely in this feature's own localStorage
// ledger, never in the kernel store.

import { useEffect, useState } from "react";
import { goTo, closePanel } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { bookById } from "@/engine/corpus";
import "./plans.css";

// ── bundled plans — hardcoded because data/modules/_index.json does not
// enumerate them. Only the id/name/description/days needed to render the
// picker live here; the full day-by-day module is fetched lazily, only
// once a plan is opened. ─────────────────────────────────────────────────
const CATALOG: { id: string; name: string; description: string; days: number }[] = [
  { id: "plan-canonical-1y", name: "Canonical — 1 Year", days: 365, description: "Read the Bible cover-to-cover in 365 days, Genesis through Revelation." },
  { id: "plan-chronological-1y", name: "Chronological — 1 Year", days: 365, description: "Read the Bible in the approximate order events occurred." },
  { id: "plan-gospels-90", name: "Gospels — 90 Days", days: 90, description: "Matthew, Mark, Luke, and John — about one chapter a day." },
  { id: "plan-psalms-30", name: "Psalms & Proverbs — 30 Days", days: 30, description: "Five Psalms plus one chapter of Proverbs each day for a month." },
  { id: "plan-whole-bible-90", name: "Whole Bible — 90 Day Sprint", days: 90, description: "Aggressive 90-day cover-to-cover read (~13 chapters/day)." },
  { id: "plan-daf-yomi", name: "Daf Yomi — Bavli Talmud", days: 2711, description: "One folio of the Babylonian Talmud per day, ~7.5 years." },
  { id: "plan-torah-triennial", name: "Torah — Triennial Cycle", days: 162, description: "The triennial Torah cycle, 54 parshiyot split across 3 years." },
];

interface PlanMeta {
  id: string;
  name: string;
  description: string;
  days: number;
  _partial?: boolean;
}
interface PlanDay {
  day: number;
  readings: string[];
  tractate?: string;
  parshah?: string;
  year?: number;
}
interface Plan { meta: PlanMeta; days: PlanDay[] }

const cache = new Map<string, Plan>();
async function loadPlan(id: string): Promise<Plan | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}data/modules/${id}.json`);
    if (!r.ok) return null;
    const plan = (await r.json()) as Plan;
    cache.set(id, plan);
    return plan;
  } catch {
    return null;
  }
}

// ── progress ledger — this feature's own, not the kernel's ────────────
const LEDGER_KEY = "codex-genesis.plans.v1";
interface PlanProgress { startedISO: string; done: Record<number, true> }
type Ledger = Record<string, PlanProgress>;

function readLedger(): Ledger {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    return raw ? (JSON.parse(raw) as Ledger) : {};
  } catch {
    return {};
  }
}
function writeLedger(l: Ledger): void {
  try { localStorage.setItem(LEDGER_KEY, JSON.stringify(l)); } catch { /* full or denied — progress is a courtesy */ }
}

// ── dates ──────────────────────────────────────────────────────────────
function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysSince(startISO: string): number {
  const [y, m, d] = startISO.split("-").map(Number);
  const [Y, M, D] = isoToday().split("-").map(Number);
  const a = new Date(y, m - 1, d).getTime();
  const b = new Date(Y, M - 1, D).getTime();
  return Math.round((b - a) / 86400000);
}

// ── reading refs — "gen.1", "gen.1-3", "talmud.berakhot.2a" ───────────
interface Reading {
  label: string;
  nav: { bookId: string; chapter: number } | null;
}
function parseReading(ref: string): Reading {
  if (ref.startsWith("talmud.")) {
    const [, tractate, daf] = ref.split(".");
    return { label: `talmud · ${tractate} ${daf}`, nav: null };
  }
  const m = ref.match(/^([a-z0-9]+)\.(\d+)(?:-(\d+))?$/i);
  if (!m) return { label: ref, nav: null };
  const [, b, a, z] = m;
  const name = bookById.get(b)?.name ?? b;
  return {
    label: z ? `${name} ${a}–${z}` : `${name} ${a}`,
    nav: bookById.has(b) ? { bookId: b, chapter: Number(a) } : null,
  };
}

// consecutive done days ending at the current day (today unfinished is OK)
function streakOf(p: PlanProgress, currentDay: number): number {
  let n = 0;
  for (let d = currentDay; d >= 1; d--) {
    if (p.done[d]) n++;
    else if (d < currentDay) break;
  }
  return n;
}

// ── detail — one plan, its day, its readings ───────────────────────────
function PlanDetail({ plan, progress, onChange, inWindow }: {
  plan: Plan;
  progress: PlanProgress | undefined;
  onChange: (next: PlanProgress | null) => void;
  inWindow: boolean;
}) {
  const total = plan.days.length;

  if (!progress) {
    return (
      <div className="gx-plans-detail">
        <p className="gx-plans-empty">not started · {plan.meta.days} days{plan.meta._partial ? " · preview" : ""}</p>
        <button
          className="gx-plans-btn"
          onClick={() => onChange({ startedISO: isoToday(), done: {} })}
        >
          begin today
        </button>
      </div>
    );
  }

  const dayNum = Math.min(Math.max(1, daysSince(progress.startedISO) + 1), total);
  const day = plan.days.find((d) => d.day === dayNum) ?? null;
  const doneCount = Object.keys(progress.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const streak = streakOf(progress, dayNum);
  const isDone = !!progress.done[dayNum];
  const finished = doneCount >= total;

  const toggleDay = () => {
    const done = { ...progress.done };
    if (done[dayNum]) delete done[dayNum];
    else done[dayNum] = true;
    onChange({ ...progress, done });
  };

  const jump = (nav: { bookId: string; chapter: number }) => {
    goTo({ bookId: nav.bookId, chapter: nav.chapter, verse: null });
    if (!inWindow) closePanel();
  };

  return (
    <div className="gx-plans-detail">
      <p className="gx-plans-stats">
        day {dayNum} of {total} · {pct}% · streak {streak}
      </p>
      {finished ? (
        <p className="gx-plans-finished">the plan is finished.</p>
      ) : day ? (
        <>
          {day.parshah ? <p className="gx-plans-context">parashat {day.parshah}{day.year != null ? ` · year ${day.year}` : ""}</p> : null}
          {day.tractate ? <p className="gx-plans-context">{day.tractate.toLowerCase()}</p> : null}
          <ul className="gx-plans-readings">
            {day.readings.map((r) => {
              const parsed = parseReading(r);
              return (
                <li key={r} className="gx-plans-reading">
                  {parsed.nav ? (
                    <button className="gx-plans-readlink" onClick={() => jump(parsed.nav!)}>
                      {parsed.label}
                    </button>
                  ) : (
                    <span className="gx-plans-readtext">{parsed.label} · not in the corpus</span>
                  )}
                </li>
              );
            })}
          </ul>
          <button className={"gx-plans-btn" + (isDone ? " is-done" : "")} onClick={toggleDay}>
            {isDone ? "✓ day done · undo" : "mark day done"}
          </button>
        </>
      ) : (
        <p className="gx-plans-empty">no reading recorded for day {dayNum}</p>
      )}
      <button
        className="gx-plans-reset"
        onClick={() => onChange(null)}
      >
        reset plan
      </button>
    </div>
  );
}

// ── panel ──────────────────────────────────────────────────────────────
export function Plans() {
  const [ledger, setLedger] = useState<Ledger>(() => readLedger());
  const [openId, setOpenId] = useState<string | null>(() => {
    const l = readLedger();
    const started = CATALOG.find((c) => l[c.id]);
    return started ? started.id : null;
  });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const inWindow = useInWindow();

  // Lazy-fetch only the opened plan's full module — never all 7 up front.
  useEffect(() => {
    if (!openId) { setPlan(null); setLoadFailed(false); return; }
    let live = true;
    setPlan(null);
    setLoadFailed(false);
    loadPlan(openId).then((p) => {
      if (!live) return;
      if (p) setPlan(p);
      else setLoadFailed(true);
    });
    return () => { live = false; };
  }, [openId]);

  const setProgress = (planId: string, next: PlanProgress | null) => {
    const l = { ...ledger };
    if (next) l[planId] = next;
    else delete l[planId];
    writeLedger(l);
    setLedger(l);
  };

  return (
    <div className="gx-plans" role="region" aria-label="Reading plans">
      <h2 className="gx-plans-title">PLANS</h2>
      <ul className="gx-plans-list">
        {CATALOG.map((c) => {
          const prog = ledger[c.id];
          const open = openId === c.id;
          const pct = prog && c.days ? Math.round((Object.keys(prog.done).length / c.days) * 100) : 0;
          return (
            <li key={c.id} className={"gx-plans-item" + (open ? " is-open" : "")}>
              <button
                className="gx-plans-card"
                onClick={() => setOpenId(open ? null : c.id)}
              >
                <span className="gx-plans-name">
                  {c.name}
                  {prog ? <span className="gx-plans-badge">{pct}%</span> : null}
                </span>
                <span className="gx-plans-meta">{c.days} days</span>
                <span className="gx-plans-desc">{c.description}</span>
              </button>
              {open ? (
                loadFailed ? (
                  <p className="gx-plans-empty">could not load this plan — offline or missing file</p>
                ) : plan && plan.meta.id === c.id ? (
                  <PlanDetail
                    plan={plan}
                    progress={prog}
                    onChange={(next) => setProgress(c.id, next)}
                    inWindow={inWindow}
                  />
                ) : (
                  <p className="gx-plans-wait">…</p>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
      {inWindow ? null : (
        <button className="gx-plans-close" aria-label="Close plans" onClick={() => closePanel()}>×</button>
      )}
    </div>
  );
}
