// Verse Art — paintings, illuminations, and other depictions of the
// passage the reader is standing in. This panel touches the network:
// once (optionally) to ask the Oracle which works exist, and once per
// search term to resolve Wikimedia Commons images. CODEX is offline-first
// everywhere else; here we say so plainly rather than pretend otherwise.

import { useEffect, useMemo, useState } from "react";
import { useApp, closePanel } from "@/kernel/store";
import { useInWindow } from "@/shell/Windows";
import { bookById } from "@/engine/corpus";
import { askOracleStream } from "@/engine/oracle";
import "./verseart.css";

interface Plate {
  pageid: number;
  title: string;
  artist: string;
  thumbUrl: string;
  fullUrl: string;
  commonsUrl: string;
}
interface ArtResult { scene: string; plates: Plate[] }

// In-memory only — a session-length cache keyed by book.chapter.verse, so
// flipping back to a passage already looked at doesn't refetch. Cleared
// on reload; this is a courtesy, not a store of record.
const cache = new Map<string, ArtResult>();

const KEY = (bookId: string, chapter: number, verse: number | null) => `${bookId}.${chapter}.${verse ?? "-"}`;

// A handful of famous passages get a curated search term, since a literal
// "book chapter" search on Commons mostly turns up manuscript scans of the
// text itself rather than depictions of the scene. Everything else falls
// back to a generic "<book> <chapter> bible painting" search.
const CURATED_TERMS: Record<string, string> = {
  "gen.1": "creation of the world painting",
  "gen.2": "garden of eden painting",
  "gen.3": "fall of man expulsion eden painting",
  "gen.4": "cain and abel painting",
  "gen.6": "noah's ark painting",
  "gen.7": "noah's ark flood painting",
  "gen.19": "sodom and gomorrah painting",
  "gen.22": "sacrifice of isaac painting",
  "gen.37": "joseph sold into slavery painting",
  "exo.3": "moses burning bush painting",
  "exo.14": "crossing the red sea painting",
  "exo.20": "moses ten commandments painting",
  "jos.6": "battle of jericho painting",
  "jdg.16": "samson and delilah painting",
  "1sa.17": "david and goliath painting",
  "2sa.11": "david and bathsheba painting",
  "job.1": "job painting",
  "psa.23": "good shepherd painting",
  "dan.3": "fiery furnace painting",
  "dan.6": "daniel lion's den painting",
  "jon.1": "jonah and the whale painting",
  "mat.1": "nativity painting",
  "mat.2": "adoration of the magi painting",
  "mat.3": "baptism of christ painting",
  "mat.4": "temptation of christ painting",
  "mat.5": "sermon on the mount painting",
  "mat.14": "christ walking on water painting",
  "mat.17": "transfiguration painting",
  "mat.26": "last supper painting",
  "mat.27": "crucifixion painting",
  "mat.28": "resurrection of christ painting",
  "mrk.16": "resurrection of christ painting",
  "luk.1": "annunciation painting",
  "luk.2": "nativity shepherds painting",
  "luk.15": "prodigal son painting",
  "luk.23": "crucifixion painting",
  "luk.24": "supper at emmaus painting",
  "jhn.1": "creation logo word painting",
  "jhn.2": "wedding at cana painting",
  "jhn.11": "raising of lazarus painting",
  "jhn.13": "last supper foot washing painting",
  "jhn.19": "crucifixion painting",
  "jhn.20": "noli me tangere resurrection painting",
  "act.2": "pentecost painting",
  "act.9": "conversion of paul damascus painting",
  "rev.4": "apocalypse throne painting",
  "rev.6": "four horsemen of the apocalypse painting",
  "rev.12": "woman clothed with the sun painting",
  "rev.20": "last judgment painting",
  "rev.21": "new jerusalem painting",
};

function searchTermFor(bookId: string, chapter: number, bookName: string): string {
  const curated = CURATED_TERMS[`${bookId}.${chapter}`];
  if (curated) return curated;
  return `"${bookName} ${chapter}" bible painting`;
}

const IMG_EXT = /\.(jpe?g|png|gif|webp|svg|tiff?)$/i;
const SKIP_EXT = /\.(pdf|djvu|ogv|webm|mp4)$/i;

function stripTags(html: string | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").trim();
}

interface CommonsPage {
  pageid: number;
  title: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    extmetadata?: {
      Artist?: { value?: string };
      ObjectName?: { value?: string };
    };
  }>;
}

// The one code path every render funnels through: a Commons generator=search
// over File-namespace pages, with imageinfo (thumb + full url + metadata)
// pulled in the same request. Needs `origin=*` — MediaWiki's CORS anywhere
// policy — or the browser silently fails the fetch.
async function searchCommons(query: string, limit = 8): Promise<Plate[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php" +
    "?action=query&generator=search" +
    `&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=${limit}&gsrnamespace=6` +
    "&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=480" +
    "&format=json&origin=*";
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return [];
  const j = (await r.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  const pages = Object.values(j.query?.pages ?? {});
  const plates: Plate[] = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info?.thumburl || !info.url) continue;
    if (SKIP_EXT.test(info.url) || !IMG_EXT.test(info.url)) continue;
    const rawTitle = p.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "");
    plates.push({
      pageid: p.pageid,
      title: stripTags(info.extmetadata?.ObjectName?.value) || rawTitle,
      artist: stripTags(info.extmetadata?.Artist?.value),
      thumbUrl: info.thumburl,
      fullUrl: info.url,
      commonsUrl: `https://commons.wikimedia.org/?curid=${p.pageid}`,
    });
  }
  return plates;
}

function dedupe(plates: Plate[]): Plate[] {
  const seen = new Set<number>();
  const out: Plate[] = [];
  for (const p of plates) {
    if (seen.has(p.pageid)) continue;
    seen.add(p.pageid);
    out.push(p);
  }
  return out;
}

interface Suggestion { title: string; artist: string; year?: number }

// AI path — only taken when an Oracle engine is actually configured. Asks
// for a handful of notable works, then resolves EACH suggested title
// through the same Commons search so there's exactly one render path.
async function askForWorks(refStr: string): Promise<{ scene: string; suggestions: Suggestion[] }> {
  const question = [
    `Verse: ${refStr}`,
    "",
    "Identify 4–6 notable paintings, frescoes, illuminated manuscripts, or",
    "sculptures that depict THIS specific scene. Only include works whose",
    "existence and attribution you are confident in. Output ONLY a JSON",
    "object, no prose, no fences. Schema:",
    '{"scene":"one sentence naming the scene","works":[{"title":"","artist":"","year":<int>}]}',
  ].join("\n");
  const a = await askOracleStream(question, [], { onDelta: () => {}, onTool: () => {} });
  const i = a.text.indexOf("{");
  if (i === -1) throw new Error("no JSON in the Oracle's reply");
  const parsed = JSON.parse(a.text.slice(i)) as { scene: string; works: Suggestion[] };
  if (!Array.isArray(parsed.works)) throw new Error("malformed art result");
  return { scene: parsed.scene, suggestions: parsed.works };
}

function Lightbox({ plate, onClose }: { plate: Plate; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="gx-verseart-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="gx-verseart-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="gx-verseart-lightbox-close" aria-label="Close" onClick={onClose}>×</button>
        <img className="gx-verseart-lightbox-img" src={plate.fullUrl} alt={plate.title} />
        <div className="gx-verseart-lightbox-cap">
          <span className="gx-verseart-lightbox-title">{plate.title}</span>
          {plate.artist ? <span className="gx-verseart-lightbox-artist">{plate.artist}</span> : null}
          <a className="gx-verseart-lightbox-link" href={plate.commonsUrl} target="_blank" rel="noreferrer">
            view on Commons ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function Plate({ plate, onOpen }: { plate: Plate; onOpen: () => void }) {
  return (
    <li className="gx-verseart-card" onClick={onOpen}>
      <img
        className="gx-verseart-thumb"
        src={plate.thumbUrl}
        alt={`${plate.title}${plate.artist ? `, ${plate.artist}` : ""}`}
        loading="lazy"
      />
      <span className="gx-verseart-card-title">{plate.title}</span>
      {plate.artist ? <span className="gx-verseart-card-meta">{plate.artist}</span> : null}
    </li>
  );
}

export function VerseArt() {
  const cursor = useApp((s) => s.cursor);
  const engine = useApp((s) => s.settings.oracle.engine);
  const here = bookById.get(cursor.bookId);
  const bookName = here?.name ?? cursor.bookId;
  const refStr = `${bookName} ${cursor.chapter}${cursor.verse ? ":" + cursor.verse : ""}`;
  const key = KEY(cursor.bookId, cursor.chapter, cursor.verse);

  const [result, setResult] = useState<ArtResult | null>(cache.get(key) ?? null);
  const [state, setState] = useState<"idle" | "busy" | "offline">(cache.has(key) ? "idle" : "idle");
  const [open, setOpen] = useState<Plate | null>(null);

  const term = useMemo(() => searchTermFor(cursor.bookId, cursor.chapter, bookName), [cursor.bookId, cursor.chapter, bookName]);

  useEffect(() => {
    setOpen(null);
    const cached = cache.get(key);
    if (cached) { setResult(cached); setState("idle"); return; }
    let live = true;
    setResult(null);
    setState("busy");
    (async () => {
      try {
        let scene = refStr;
        let plates: Plate[] = [];
        if (engine) {
          try {
            const { scene: s, suggestions } = await askForWorks(refStr);
            scene = s || refStr;
            const found = await Promise.all(
              suggestions.slice(0, 6).map((w) => searchCommons(`${w.title} ${w.artist}`, 2))
            );
            plates = found.flat();
          } catch {
            // Oracle path failed (bad JSON, offline, etc.) — fall through
            // to the direct search below rather than showing nothing.
          }
        }
        if (!plates.length) {
          plates = await searchCommons(term, 10);
        }
        const r: ArtResult = { scene, plates: dedupe(plates).slice(0, 12) };
        if (!live) return;
        cache.set(key, r);
        setResult(r);
        setState("idle");
      } catch {
        if (live) setState("offline");
      }
    })();
    return () => { live = false; };
  }, [key, engine, refStr, term]);

  return (
    <div className="gx-verseart" role="region" aria-label="Verse art">
      <h2 className="gx-verseart-title">VERSE ART</h2>
      <p className="gx-verseart-here">{refStr}</p>
      <p className="gx-verseart-note">
        Fetches artwork depicting this passage from Wikimedia Commons — needs network access.
        {!engine ? " Connect an Oracle engine for AI-suggested works; without one this shows a direct Commons search." : null}
      </p>
      {state === "busy" ? (
        <div className="gx-verseart-grid" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="gx-verseart-shimmer" />
          ))}
        </div>
      ) : state === "offline" ? (
        <p className="gx-verseart-empty">Couldn't reach Wikimedia — check your connection and reopen this panel.</p>
      ) : result && result.plates.length ? (
        <>
          {result.scene ? <p className="gx-verseart-scene">{result.scene}</p> : null}
          <ul className="gx-verseart-grid">
            {result.plates.map((p) => (
              <Plate key={p.pageid} plate={p} onOpen={() => setOpen(p)} />
            ))}
          </ul>
        </>
      ) : (
        <p className="gx-verseart-empty">
          No depictions surfaced for this passage on Wikimedia Commons.
        </p>
      )}
      {open ? <Lightbox plate={open} onClose={() => setOpen(null)} /> : null}
      {useInWindow() ? null : (
        <button className="gx-verseart-close" aria-label="Close verse art" onClick={() => closePanel()}>×</button>
      )}
    </div>
  );
}
