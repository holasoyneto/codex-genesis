// The provenance chip (PALANTIR §7) — every dataset-driven row keeps its
// receipts one tap away. Tap toggles a small glass popover naming source,
// license, and import date. No hover-only affordance: thumbs are readers too.

import { useState } from "react";
import "./provenance.css";

export interface ProvenanceMeta {
  source: string;
  license: string;
  imported_from?: string;
  imported?: string;
  extracted_by?: string;
  limitations?: string;
  contested_policy?: string;
}

export function Provenance({ label, meta }: { label: string; meta: ProvenanceMeta }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="gx-prov">
      <button
        className="gx-prov-chip"
        aria-expanded={open}
        title="Provenance"
        onClick={() => setOpen((o) => !o)}
      >◇ {label}</button>
      {open ? (
        <span className="gx-prov-pop glass gx-enter" role="note">
          <span className="gx-prov-row"><b>SOURCE</b> {meta.source}</span>
          <span className="gx-prov-row"><b>LICENSE</b> {meta.license}</span>
          {meta.extracted_by ? <span className="gx-prov-row"><b>EXTRACTED BY</b> {meta.extracted_by}</span> : null}
          {meta.imported_from ? <span className="gx-prov-row"><b>IMPORTED FROM</b> {meta.imported_from}</span> : null}
          {meta.imported ? <span className="gx-prov-row"><b>IMPORTED</b> {meta.imported}</span> : null}
          {meta.limitations ? <span className="gx-prov-row"><b>LIMITS</b> {meta.limitations}</span> : null}
          {meta.contested_policy ? <span className="gx-prov-row"><b>CONTESTED</b> {meta.contested_policy}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
