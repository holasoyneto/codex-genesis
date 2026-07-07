// The Witness panel — what the app has heard about its own use. Local
// only; export hands the ledger to a human (or to the builder, to learn
// what works). Honesty about honesty: the switch to silence it is right
// here, not buried.

import { useState } from "react";
import { useApp, setState, closePanel } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { summary, ledger, exportLedger, clearLedger } from "@/kernel/witness";
import "./witness.css";

export function Witness() {
  const on = useApp((s) => s.settings.witness);
  const [, bump] = useState(0);
  const rows = summary();
  const total = ledger().length;
  return (
    <div className="gx-witness" role="region" aria-label="Witness">
      <h2 className="gx-witness-title">THE WITNESS</h2>
      <p className="gx-witness-oath">
        {on
          ? `listening · ${total} events on this device — nothing leaves it unless you export`
          : "silenced — the app records nothing"}
      </p>
      <ul className="gx-witness-rows">
        {rows.map((r) => (
          <li key={r.kind} className="gx-witness-row">
            <span className="gx-witness-kind">{r.kind}</span>
            <span className="gx-witness-n">{r.n}</span>
            <span className="gx-witness-last">{r.last}</span>
          </li>
        ))}
        {!rows.length ? <li className="gx-witness-row"><span className="gx-witness-last">nothing yet</span></li> : null}
      </ul>
      <div className="gx-witness-acts">
        <button className="gx-witness-act" onClick={() => exportLedger()}>⬇ EXPORT</button>
        <button className="gx-witness-act" onClick={() => { clearLedger(); bump((n) => n + 1); }}>⌫ CLEAR</button>
        <button
          className="gx-witness-act"
          onClick={() => setState((s) => ({ settings: { ...s.settings, witness: !on } }))}
        >{on ? "◼ SILENCE" : "● LISTEN"}</button>
      </div>
      {useInWindow() ? null : (
        <button
          className="gx-witness-close"
          aria-label="Close witness"
          onClick={() => closePanel()}
        >×</button>
      )}
    </div>
  );
}
