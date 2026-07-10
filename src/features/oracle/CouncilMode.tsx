// COUNCIL MODE — when both a local and a cloud engine are actually
// reachable, ask both the same question in parallel, then a reconciliation
// pass marks agreements and disagreements. Disagreement is rendered honestly
// as data — two lanes, plus a CONTESTED divergence list — never smoothed into
// a single false consensus. Fused into the Oracle panel from the former
// features/council.

import { useEffect, useState } from "react";
import { useApp } from "@/kernel/store";
import { askOracleStream, councilReady, cloudProvider, type ChatTurn } from "@/engine/oracle";

interface Seat {
  engine: "local" | "cloud";
  text: string;
  busy: boolean;
  err: string | null;
}

interface Reconciliation {
  agreements: string[];
  disagreements: string[];
}

// A small, local reconciliation — no third API call required: split each
// answer into sentences, flag pairs that share little vocabulary as likely
// divergence versus ones that echo each other. A heuristic aid to reading,
// not a verdict — the two full lanes are always the ground truth.
function reconcile(a: string, b: string): Reconciliation {
  const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 12);
  const sa = sentences(a), sb = sentences(b);
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3));
  const overlap = (x: Set<string>, y: Set<string>) => {
    let n = 0; for (const w of x) if (y.has(w)) n++;
    return n / Math.max(1, Math.min(x.size, y.size));
  };
  const agreements: string[] = [];
  const disagreements: string[] = [];
  for (const s of sa) {
    const ws = words(s);
    if (!ws.size) continue;
    const best = Math.max(0, ...sb.map((t) => overlap(ws, words(t))));
    if (best > 0.45) agreements.push(s);
  }
  for (const s of sa) {
    if (!/\b(is|was|means|refers|likely|probably|argue|dispute|contested)\b/i.test(s)) continue;
    const ws = words(s);
    if (!ws.size) continue;
    const best = Math.max(0, ...sb.map((t) => overlap(ws, words(t))));
    if (best < 0.2) disagreements.push(s);
  }
  return { agreements: agreements.slice(0, 6), disagreements: disagreements.slice(0, 6) };
}

export function CouncilMode({ onOpenMind }: { onOpenMind: () => void }) {
  const oracle = useApp((s) => s.settings.oracle);
  const [ready, setReady] = useState<{ local: boolean; cloud: boolean } | null>(null);
  const [q, setQ] = useState("");
  const [seats, setSeats] = useState<Seat[] | null>(null);
  const [rec, setRec] = useState<Reconciliation | null>(null);

  useEffect(() => { councilReady().then(setReady); }, [oracle.localUrl, oracle.anthropicKey]);

  const bothReady = ready?.local && ready?.cloud;
  const cloudLabel = cloudProvider(oracle.anthropicKey)?.label ?? "cloud";

  const ask = async () => {
    const question = q.trim();
    if (!question || !bothReady) return;
    setSeats([
      { engine: "local", text: "", busy: true, err: null },
      { engine: "cloud", text: "", busy: true, err: null },
    ]);
    setRec(null);
    const transcript: ChatTurn[] = [];
    const runOne = async (engine: "local" | "cloud") => {
      try {
        const a = await askOracleStream(question, transcript, { onDelta: () => {}, onTool: () => {} }, engine);
        setSeats((s) => s?.map((x) => (x.engine === engine ? { ...x, text: a.text, busy: false } : x)) ?? s);
        return a.text;
      } catch (e) {
        setSeats((s) => s?.map((x) => (x.engine === engine ? { ...x, busy: false, err: String(e).slice(0, 200) } : x)) ?? s);
        return "";
      }
    };
    const [localText, cloudText] = await Promise.all([runOne("local"), runOne("cloud")]);
    if (localText && cloudText) setRec(reconcile(localText, cloudText));
  };

  const seatSub = (engine: "local" | "cloud") =>
    engine === "local"
      ? (oracle.localProvider || "on this machine") + (oracle.localModel ? " · " + oracle.localModel : "")
      : cloudLabel;

  return (
    <div className="gx-council" role="region" aria-label="Council">
      {ready === null ? (
        <p className="gx-council-wait">…</p>
      ) : !bothReady ? (
        <div className="gx-council-none">
          <p>
            Council needs two reachable minds — a <b>LOCAL</b> engine (Ollama, Apple MLX, …) and a{" "}
            <b>CLOUD</b> key, both configured and answering.
          </p>
          <p>
            Right now: <b>LOCAL</b> {ready.local ? "✓ reachable" : "✗ missing"} ·{" "}
            <b>CLOUD</b> {ready.cloud ? "✓ configured" : "✗ missing"}.
          </p>
          <button className="gx-oracle-btn" onClick={onOpenMind} style={{ marginTop: 8 }}>◆ open THE MIND</button>
        </div>
      ) : (
        <>
          <div className="gx-council-ask">
            <input
              className="gx-council-input"
              placeholder="Ask both minds…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void ask(); }}
              aria-label="Ask both minds"
            />
            <button className="gx-council-go" onClick={() => void ask()}>ASK BOTH</button>
          </div>

          {seats ? (
            <div className="gx-council-seats">
              {seats.map((s) => (
                <div key={s.engine} className="gx-council-seat">
                  <span className="gx-council-seat-tag">
                    {s.engine === "local" ? "◆ LOCAL" : "✦ CLOUD"}
                    <span className="gx-council-seat-sub">{seatSub(s.engine)}</span>
                  </span>
                  {s.busy ? (
                    <p className="gx-council-seat-wait"><span className="gx-oracle-shimmer">thinking…</span></p>
                  ) : s.err ? (
                    <p className="gx-council-seat-err">{s.err}</p>
                  ) : (
                    <p className="gx-council-seat-text">{s.text}</p>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {rec ? (
            <section className="gx-council-rec">
              <h3 className="gx-council-rec-title">RECONCILIATION <span className="gx-council-rec-note">heuristic — read the lanes above as ground truth</span></h3>
              {rec.agreements.length ? (
                <div className="gx-council-agree">
                  <h4>AGREE</h4>
                  <ul>{rec.agreements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              ) : null}
              {rec.disagreements.length ? (
                <div className="gx-council-contest">
                  <h4>⚑ CONTESTED — likely divergence</h4>
                  <ul>{rec.disagreements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              ) : (
                <p className="gx-council-agree-only">No clear divergence detected — the two minds substantially agree.</p>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
