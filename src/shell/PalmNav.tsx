// The palm's pill — THE primary navigation on the phone. Bottom-center,
// glass, thumb-first: the left half names the place and opens the
// book/chapter sheet; the right half names the voice and opens the
// translation sheet. Two taps to any chapter in any translation.

import { useApp, openVeil } from "@/kernel/store";
import { bookById } from "@/engine/corpus";
import "./palmnav.css";

export function PalmNav() {
  const cursor = useApp((s) => s.cursor);
  const book = bookById.get(cursor.bookId);
  return (
    <div className="gx-pill glass" role="navigation" aria-label="Reader navigation">
      <button
        className="gx-pill-place"
        aria-label="Choose book and chapter"
        onClick={() => openVeil("reader", "book")}
      >
        {book?.name ?? cursor.bookId} {cursor.chapter}
      </button>
      <span className="gx-pill-sep" aria-hidden />
      <button
        className="gx-pill-voice"
        aria-label="Choose translation"
        onClick={() => openVeil("reader", "trans")}
      >
        {cursor.translation.toUpperCase()}
      </button>
    </div>
  );
}
