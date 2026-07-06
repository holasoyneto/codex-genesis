// THE THREADS — every place Scripture answers the verse under your eye,
// from Torrey's Treasury. Tap a thread to walk it; the trail is the study.

import { useEffect, useState } from "react";
import { useApp, closePanel } from "@/kernel/store";
import { Ref } from "@/kernel/Ref";
import { bookById } from "@/engine/corpus";
import { threadsFor, type ThreadRef } from "@/engine/threads";
import "./threads.css";

export function Threads() {
  const cursor = useApp((s) => s.cursor);
  const verse = cursor.verse ?? 1;
  const [refs, setRefs] = useState<ThreadRef[] | null>(null);
  const here = bookById.get(cursor.bookId);

  useEffect(() => {
    let live = true;
    setRefs(null);
    threadsFor(cursor.bookId, cursor.chapter, verse)
      .then((r) => { if (live) setRefs(r); })
      .catch(() => { if (live) setRefs([]); });
    return () => { live = false; };
  }, [cursor.bookId, cursor.chapter, verse]);

  return (
    <div className="gx-threads" role="region" aria-label="Cross references">
      <h2 className="gx-threads-title">THE THREADS</h2>
      <p className="gx-threads-here">
        {here?.name} {cursor.chapter}:{verse}
        {cursor.verse == null ? <span className="gx-threads-hint"> — tap a verse to re-center</span> : null}
      </p>
      {refs === null ? (
        <p className="gx-threads-wait">…</p>
      ) : !refs.length ? (
        <p className="gx-threads-none">Torrey recorded no threads for this verse.</p>
      ) : (
        <ul className="gx-threads-rows">
          {refs.map((r, i) => {
            const b = bookById.get(r.bookId);
            const nt = b?.testament === "NT";
            void b;
            return (
              <li key={i} className={"gx-thread" + (nt ? " is-nt" : "")}>
                <Ref bookId={r.bookId} chapter={r.chapter} verse={r.verse} />
              </li>
            );
          })}
        </ul>
      )}
      <p className="gx-threads-oath">TREASURY OF SCRIPTURE KNOWLEDGE · TORREY · PUBLIC DOMAIN</p>
      <button
        className="gx-threads-close"
        aria-label="Close threads"
        onClick={() => closePanel()}
      >×</button>
    </div>
  );
}
