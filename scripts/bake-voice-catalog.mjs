// Bakes the world's voices — bolls.life's public languages/translations
// catalog — into data/voice-catalog.json for the VOICES surface's
// "ADD A VOICE" layer. The corpus engine already speaks bolls; this file
// just tells the UI what exists.
//
// HONESTY NOTE (pinned in _meta): the upstream catalog carries ~31
// languages / ~146 translations as of 2026-07 — not "hundreds of
// languages". We bake what is real and count it, we do not inflate.
//
// Shape:
//   { _meta: {...}, languages: [{ lang, langName, voices: [{code, name, year?}] }] }
// `lang` is a slug for grouping/search; `langName` keeps the upstream
// string verbatim (it usually carries native + english names together).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../data/voice-catalog.json");
const SRC = "https://bolls.life/static/bolls/app/views/languages.json";

const res = await fetch(SRC);
if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
const raw = await res.json();
if (!Array.isArray(raw) || !raw.length) throw new Error("catalog shape unexpected: not a nonempty array");

const YEAR_RE = /\b(1[5-9]\d{2}|20\d{2})\b/;

const languages = raw.map((l) => {
  const langName = String(l.language || "").trim();
  const lang = langName.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "unknown";
  const voices = (l.translations || []).map((t) => {
    const name = String(t.full_name || t.short_name || "").trim();
    const year = name.match(YEAR_RE)?.[1];
    return { code: String(t.short_name || "").trim(), name, ...(year ? { year: Number(year) } : {}) };
  }).filter((v) => v.code && v.name);
  return { lang, langName, voices };
}).filter((l) => l.voices.length);

const voiceCount = languages.reduce((n, l) => n + l.voices.length, 0);

const out = {
  _meta: {
    source: SRC,
    fetched_utc: new Date().toISOString(),
    languages: languages.length,
    voices: voiceCount,
    license: "catalog metadata from bolls.life (translation names/codes only — factual metadata); each translation carries its own license, served at read time",
    note: "counts are pinned honestly from upstream; the catalog is what it is",
  },
  languages,
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 0));
console.log(`[bake-voice-catalog] wrote ${OUT} — ${languages.length} languages · ${voiceCount} voices`);
if (languages.length < 25 || voiceCount < 100) {
  throw new Error(`catalog suspiciously small: ${languages.length} languages / ${voiceCount} voices`);
}
