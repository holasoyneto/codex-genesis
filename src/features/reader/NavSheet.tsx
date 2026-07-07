// The nav sheet — the reader's two doors, and since v1.2.0 THE one
// translation system in the whole app ("the voices of the world").
// "book": canon-sectioned book list, then a chapter grid, one tap each.
// "trans": the VOICES surface — MY SHELF (bundled + user-added, sacred
// originals pinned in their own group) and ADD A VOICE (the baked bolls
// catalog, grouped by language, searchable, one tap to add & switch).
// Every affordance that switches translation (desk header chip, palm
// pill, windowed-reader chip, the Library's "Voices…" door) opens THIS
// surface — no popovers, no inline grids, no second list anywhere.
// A seed of "trans:<winId>" scopes the pick to that windowed reader's pin.

import { useEffect, useState } from "react";
import { useApp, goTo, closeVeil, setState, whisper, addVoice, removeVoice } from "@/kernel/store";
import {
  BOOKS, TRANSLATIONS, bookById, covers, allTranslations, type Book, type Translation,
} from "@/engine/corpus";
import "./navsheet.css";

const SHELVES: { key: Book["testament"] | "BYD"; label: string }[] = [
  { key: "OT", label: "OLD TESTAMENT" },
  { key: "NT", label: "NEW TESTAMENT" },
  { key: "DC", label: "APOCRYPHA" },
  { key: "BYD", label: "BEYOND" },
];

// The sacred originals + the honestly-gated Open Canon sit in their own
// pinned group at the top of MY SHELF.
const SACRED_IDS = new Set(["wlc", "sblgnt", "codex"]);

function scale(delta: number) {
  setState((s) => ({
    settings: {
      ...s.settings,
      scriptureScale: Math.min(26, Math.max(15, s.settings.scriptureScale + delta)),
    },
  }));
}

// ── the world catalog (lazy — fetched once, kept for the session) ───────
interface CatalogVoice { code: string; name: string; year?: number }
interface CatalogLang { lang: string; langName: string; voices: CatalogVoice[] }
let catalogCache: CatalogLang[] | null = null;

function useCatalog(active: boolean): { langs: CatalogLang[] | null; error: boolean } {
  const [langs, setLangs] = useState<CatalogLang[] | null>(catalogCache);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!active || catalogCache) return;
    let live = true;
    fetch(`${import.meta.env.BASE_URL}data/voice-catalog.json`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((j: { languages: CatalogLang[] }) => {
        catalogCache = j.languages;
        if (live) setLangs(j.languages);
      })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [active]);
  return { langs, error };
}

// ── the VOICES surface — THE one translation system ─────────────────────
function Voices({ winId }: { winId: string | null }) {
  const cursor = useApp((s) => s.cursor);
  const userVoices = useApp((s) => s.voices);
  const pinned = useApp((s) => (winId ? s.readers[winId] : undefined));
  const current = winId ? (pinned?.translation ?? cursor.translation) : cursor.translation;
  const [layer, setLayer] = useState<"shelf" | "add">("shelf");
  const [q, setQ] = useState("");
  const { langs, error } = useCatalog(layer === "add");

  const pick = (id: string, name: string) => {
    const t = allTranslations().find((x) => x.id === id);
    if (t && !covers(t, cursor.bookId)) {
      whisper({ kind: "toast", title: `◇ ${name}`, body: "This book lives outside that corpus — the nearest voice that carries it will serve." });
    }
    if (winId) {
      setState((s) => ({
        readers: { ...s.readers, [winId]: { ...s.readers[winId], translation: id } },
      }));
    } else {
      goTo({ translation: id });
    }
    closeVeil();
  };

  const Row = ({ t, removable }: { t: Translation; removable?: boolean }) => (
    <div className={"gx-navsheet-row gx-voice-row" + (t.id === current ? " is-active" : "")}>
      <button className="gx-voice-pick" onClick={() => pick(t.id, t.name)}>
        <span className="gx-navsheet-name">{t.name}</span>
        <span className="gx-navsheet-lang">{t.lang}</span>
        {t.id === current ? <span className="gx-navsheet-dot" aria-hidden>●</span> : null}
      </button>
      {removable && t.id !== current ? (
        <button
          className="gx-voice-remove"
          aria-label={`Remove ${t.name} from my shelf`}
          title="Remove from my shelf"
          onClick={() => { removeVoice(t.id); whisper({ kind: "toast", title: `Removed ${t.name}` }); }}
        >×</button>
      ) : null}
    </div>
  );

  const sacred = TRANSLATIONS.filter((t) => SACRED_IDS.has(t.id));
  const common = TRANSLATIONS.filter((t) => !SACRED_IDS.has(t.id));
  const mine = allTranslations().filter((t) => t.id.startsWith("bolls:"));

  const needle = q.trim().toLowerCase();
  const filtered = (langs ?? [])
    .map((l) => ({
      ...l,
      voices: needle
        ? l.langName.toLowerCase().includes(needle)
          ? l.voices
          : l.voices.filter((v) => v.name.toLowerCase().includes(needle) || v.code.toLowerCase().includes(needle))
        : l.voices,
    }))
    .filter((l) => l.voices.length);

  return (
    <div className="gx-voices">
      <div className="gx-voices-tabs" role="tablist" aria-label="Voices">
        <button role="tab" aria-selected={layer === "shelf"} className={"gx-voices-tab" + (layer === "shelf" ? " is-on" : "")} onClick={() => setLayer("shelf")}>MY SHELF</button>
        <button role="tab" aria-selected={layer === "add"} className={"gx-voices-tab" + (layer === "add" ? " is-on" : "")} onClick={() => setLayer("add")}>ADD A VOICE</button>
      </div>

      {layer === "shelf" ? (
        <div className="gx-navsheet-list gx-voices-shelf">
          <h3 className="gx-navsheet-shelf">SACRED ORIGINALS</h3>
          {sacred.map((t) => <Row key={t.id} t={t} />)}
          <h3 className="gx-navsheet-shelf">TRANSLATIONS</h3>
          {common.map((t) => <Row key={t.id} t={t} />)}
          {mine.length ? (
            <>
              <h3 className="gx-navsheet-shelf">FROM THE WORLD</h3>
              {mine.map((t) => <Row key={t.id} t={t} removable />)}
            </>
          ) : (
            <p className="gx-voices-note">
              Voices you add from the world catalog appear here — open
              <b> ADD A VOICE</b> above to browse every language the
              catalog carries.
            </p>
          )}
        </div>
      ) : (
        <div className="gx-navsheet-list gx-voices-add">
          <input
            className="gx-voices-search"
            placeholder="Search languages and translations…"
            aria-label="Search the voice catalog"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            spellCheck={false}
            autoFocus
          />
          <p className="gx-voices-note">
            First read of a new voice needs a connection; after that it is
            kept on this device. The footer badge always says where the
            text was served from.
          </p>
          {error ? (
            <p className="gx-voices-note">The catalog could not be loaded — try again with a connection.</p>
          ) : !langs ? (
            <p className="gx-voices-note" aria-live="polite">Loading the catalog…</p>
          ) : !filtered.length ? (
            <p className="gx-voices-note">No language or translation matches “{q}”.</p>
          ) : (
            filtered.map((l) => (
              <section key={l.lang}>
                <h3 className="gx-navsheet-shelf">{l.langName.toUpperCase()}</h3>
                {l.voices.map((v) => {
                  const id = `bolls:${v.code}`;
                  const builtin = TRANSLATIONS.find((t) => t.bolls === v.code);
                  const onShelf = !!builtin || userVoices.some((x) => x.id === id);
                  return (
                    <button
                      key={v.code}
                      className={"gx-navsheet-row" + (onShelf ? " is-on-shelf" : "")}
                      onClick={() => {
                        if (builtin) { pick(builtin.id, builtin.name); return; }
                        addVoice({ bolls: v.code, name: v.name, lang: l.langName });
                        whisper({ kind: "toast", title: `Added ${v.name}`, body: "It lives on MY SHELF now — first read needs a connection." });
                        pick(id, v.name);
                      }}
                    >
                      <span className="gx-navsheet-name">{v.name}</span>
                      <span className="gx-navsheet-lang">{v.code}{v.year ? ` · ${v.year}` : ""}</span>
                      {onShelf ? <span className="gx-navsheet-dot" aria-hidden>✓</span> : null}
                    </button>
                  );
                })}
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function NavSheet({ seed }: { seed?: string }) {
  const cursor = useApp((s) => s.cursor);
  const size = useApp((s) => s.settings.scriptureScale);
  const isTrans = !!seed?.startsWith("trans");
  const winId = seed?.startsWith("trans:") ? seed.slice("trans:".length) : null;
  const [mode] = useState<"book" | "trans">(isTrans ? "trans" : "book");
  const [pick, setPick] = useState<string | null>(null);
  const book = pick ? bookById.get(pick) : null;

  return (
    <div className="gx-navsheet glass glass-lg gx-enter" role="dialog" aria-label={mode === "book" ? "Book and chapter" : "Voices"}>
      <div className="gx-navsheet-top">
        <span className="gx-instrument-title">{mode === "book" ? (book ? book.name.toUpperCase() : "THE BOOKS") : "THE VOICES"}</span>
        <div className="gx-navsheet-size" role="group" aria-label="Text size">
          <button aria-label="Smaller text" onClick={() => scale(-1)}>A−</button>
          <span className="gx-navsheet-px">{size}</span>
          <button aria-label="Larger text" onClick={() => scale(1)}>A+</button>
        </div>
        <button className="gx-navsheet-x" aria-label="Close" onClick={closeVeil}>×</button>
      </div>

      {mode === "trans" ? (
        <Voices winId={winId} />
      ) : book ? (
        <>
          <button className="gx-navsheet-back" onClick={() => setPick(null)}>‹ all books</button>
          <div className="gx-navsheet-grid">
            {Array.from({ length: book.chapters }, (_, i) => (
              <button
                key={i}
                className={"gx-navsheet-ch" + (book.id === cursor.bookId && i + 1 === cursor.chapter ? " is-active" : "")}
                onClick={() => { goTo({ bookId: book.id, chapter: i + 1, verse: null }); closeVeil(); }}
              >{i + 1}</button>
            ))}
          </div>
        </>
      ) : (
        <div className="gx-navsheet-list">
          {SHELVES.map((shelf) => {
            const books = BOOKS.filter((b) => b.testament === shelf.key);
            if (!books.length) return null;
            return (
              <section key={shelf.key}>
                <h3 className="gx-navsheet-shelf">{shelf.label}</h3>
                {books.map((b) => (
                  <button
                    key={b.id}
                    className={"gx-navsheet-row" + (b.id === cursor.bookId ? " is-active" : "")}
                    onClick={() => setPick(b.id)}
                  >
                    <span className="gx-navsheet-name">{b.name}</span>
                    <span className="gx-navsheet-lang">{b.chapters}</span>
                  </button>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
