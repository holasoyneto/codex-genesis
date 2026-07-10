// Gematria — pure numerology compute functions, ported faithfully from the
// og gematria.js (Hebrew/Greek/English systems). No DOM, no React; the
// panel calls into these. Input is normalized (NFD + strip combining marks)
// so pointed Hebrew and accented Greek reduce the same as plain text.

export type Lang = "hebrew" | "greek" | "english";

function strip(s: string): string {
  return (s || "").normalize("NFD").replace(/\p{M}/gu, "");
}
function lower(s: string): string {
  return strip(s).toLowerCase();
}

// ── Hebrew tables ────────────────────────────────────────────────────────
const HEBREW_BASE: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
  // finals collapse to base by default
  ך: 20, ם: 40, ן: 50, ף: 80, ץ: 90,
};
const HEBREW_FINALS500: Record<string, number> = { ך: 500, ם: 600, ן: 700, ף: 800, ץ: 900 };
const HEBREW_ORDER = "אבגדהוזחטיכלמנסעפצקרשת";
const HEBREW_ORDINAL: Record<string, number> = (() => {
  const o: Record<string, number> = {};
  [...HEBREW_ORDER].forEach((c, i) => { o[c] = i + 1; });
  o["ך"] = o["כ"]; o["ם"] = o["מ"]; o["ן"] = o["נ"]; o["ף"] = o["פ"]; o["ץ"] = o["צ"];
  return o;
})();
const HEBREW_NAMES: Record<string, string> = {
  א: "אלף", ב: "בית", ג: "גימל", ד: "דלת", ה: "הא",
  ו: "וו", ז: "זין", ח: "חית", ט: "טית", י: "יוד",
  כ: "כף", ל: "למד", מ: "מם", נ: "נון", ס: "סמך",
  ע: "עין", פ: "פא", צ: "צדי", ק: "קוף", ר: "ריש",
  ש: "שין", ת: "תיו",
};

// ── Greek tables ─────────────────────────────────────────────────────────
const GREEK_BASE: Record<string, number> = {
  α: 1, β: 2, γ: 3, δ: 4, ε: 5, ϛ: 6, ζ: 7, η: 8, θ: 9,
  ι: 10, κ: 20, λ: 30, μ: 40, ν: 50, ξ: 60, ο: 70, π: 80, ϟ: 90,
  ρ: 100, σ: 200, ς: 200, τ: 300, υ: 400, φ: 500, χ: 600, ψ: 700, ω: 800, ϡ: 900,
};
const GREEK_ORDER = "αβγδεζηθικλμνξοπρστυφχψω";
const GREEK_ORDINAL: Record<string, number> = (() => {
  const o: Record<string, number> = {};
  [...GREEK_ORDER].forEach((c, i) => { o[c] = i + 1; });
  o["ς"] = o["σ"];
  return o;
})();

// ── helpers ──────────────────────────────────────────────────────────────
function isHebrew(s: string): boolean { return /[֐-׿]/.test(s); }
function isGreek(s: string): boolean { return /[Ͱ-Ͽἀ-῿]/.test(s); }
export function detectLang(s: string): Lang {
  if (!s) return "english";
  if (isHebrew(s)) return "hebrew";
  if (isGreek(s)) return "greek";
  return "english";
}
function reduceToDigit(n: number): number {
  n = Math.abs(Math.trunc(n));
  while (n > 9) n = String(n).split("").reduce((s, d) => s + Number(d), 0);
  return n;
}
function triangular(n: number): number { return (n * (n + 1)) / 2; }

// ── Hebrew systems ───────────────────────────────────────────────────────
function hebSum(s: string, table: Record<string, number>): number {
  let n = 0;
  for (const ch of lower(s)) if (table[ch]) n += table[ch];
  return n;
}
export function mispar_hechrachi(s: string): number { return hebSum(s, HEBREW_BASE); }
export function mispar_gadol(s: string): number { return hebSum(s, { ...HEBREW_BASE, ...HEBREW_FINALS500 }); }
export function mispar_sidduri(s: string): number { return hebSum(s, HEBREW_ORDINAL); }
export function mispar_katan(s: string): number {
  let n = 0;
  for (const ch of lower(s)) {
    const v = HEBREW_BASE[ch];
    if (v) n += reduceToDigit(v);
  }
  return n;
}
export function mispar_katan_mispari(s: string): number { return reduceToDigit(mispar_hechrachi(s)); }
export function mispar_boneh(s: string): number {
  let running = 0, total = 0;
  for (const ch of lower(s)) {
    const v = HEBREW_BASE[ch];
    if (v) { running += v; total += running; }
  }
  return total;
}
export function mispar_kidmi(s: string): number {
  let n = 0;
  for (const ch of lower(s)) {
    const v = HEBREW_BASE[ch];
    if (v) n += triangular(v);
  }
  return n;
}
export interface Transformed { transformed: string; value: number }
export function atbash(s: string): Transformed {
  const ABC = HEBREW_ORDER;
  let out = "";
  for (const ch of lower(s)) {
    const i = ABC.indexOf(ch);
    if (i >= 0) out += ABC[ABC.length - 1 - i];
    else if (/[֐-׿]/.test(ch)) {
      const base = ch === "ך" ? "כ" : ch === "ם" ? "מ" : ch === "ן" ? "נ" : ch === "ף" ? "פ" : ch === "ץ" ? "צ" : "";
      if (base) { const j = ABC.indexOf(base); if (j >= 0) out += ABC[ABC.length - 1 - j]; }
    }
  }
  return { transformed: out, value: mispar_hechrachi(out) };
}
export function albam(s: string): Transformed {
  const ABC = HEBREW_ORDER, H = 11;
  let out = "";
  for (const ch of lower(s)) {
    const i = ABC.indexOf(ch);
    if (i >= 0) out += ABC[(i + H) % 22];
  }
  return { transformed: out, value: mispar_hechrachi(out) };
}
export function mispar_neelam(s: string): number {
  let n = 0;
  for (const ch of lower(s)) {
    const name = HEBREW_NAMES[ch];
    if (!name) continue;
    n += mispar_hechrachi(name) - (HEBREW_BASE[ch] || 0);
  }
  return n;
}
export function mispar_haakhor(s: string): number {
  let n = 0, i = 1;
  for (const ch of lower(s)) {
    const v = HEBREW_BASE[ch];
    if (v) { n += v * i; i++; }
  }
  return n;
}

// ── Greek systems ────────────────────────────────────────────────────────
export function isopsephy_standard(s: string): number {
  let n = 0;
  for (const ch of lower(s)) if (GREEK_BASE[ch]) n += GREEK_BASE[ch];
  return n;
}
export function isopsephy_ordinal(s: string): number {
  let n = 0;
  for (const ch of lower(s)) if (GREEK_ORDINAL[ch]) n += GREEK_ORDINAL[ch];
  return n;
}
export function isopsephy_reduced(s: string): number { return reduceToDigit(isopsephy_standard(s)); }

// ── English systems ──────────────────────────────────────────────────────
export function english_ordinal(s: string): number {
  let n = 0;
  for (const ch of (s || "").toLowerCase()) {
    const c = ch.charCodeAt(0);
    if (c >= 97 && c <= 122) n += c - 96;
  }
  return n;
}
export function english_reduction(s: string): number {
  let n = 0;
  for (const ch of (s || "").toLowerCase()) {
    const c = ch.charCodeAt(0);
    if (c >= 97 && c <= 122) {
      const ord = c - 96;
      n += ((ord - 1) % 9) + 1;
    }
  }
  return n;
}
export function english_reverse(s: string): number {
  let n = 0;
  for (const ch of (s || "").toLowerCase()) {
    const c = ch.charCodeAt(0);
    if (c >= 97 && c <= 122) n += 27 - (c - 96);
  }
  return n;
}

// ── bundle ───────────────────────────────────────────────────────────────
export interface HebrewResult {
  lang: "hebrew";
  hechrachi: number;
  gadol: number;
  sidduri: number;
  katan: number;
  katan_mispari: number;
  boneh: number;
  kidmi: number;
  atbash: Transformed;
  albam: Transformed;
  neelam: number;
  haakhor: number;
}
export interface GreekResult {
  lang: "greek";
  isopsephy: number;
  ordinal: number;
  reduced: number;
}
export interface EnglishResult {
  lang: "english";
  ordinal: number;
  reduction: number;
  reverse: number;
}
export type GematriaResult = HebrewResult | GreekResult | EnglishResult;

export function computeGematria(text: string, lang?: Lang): GematriaResult {
  const L = lang || detectLang(text);
  if (L === "hebrew") {
    return {
      lang: "hebrew",
      hechrachi: mispar_hechrachi(text),
      gadol: mispar_gadol(text),
      sidduri: mispar_sidduri(text),
      katan: mispar_katan(text),
      katan_mispari: mispar_katan_mispari(text),
      boneh: mispar_boneh(text),
      kidmi: mispar_kidmi(text),
      atbash: atbash(text),
      albam: albam(text),
      neelam: mispar_neelam(text),
      haakhor: mispar_haakhor(text),
    };
  }
  if (L === "greek") {
    return {
      lang: "greek",
      isopsephy: isopsephy_standard(text),
      ordinal: isopsephy_ordinal(text),
      reduced: isopsephy_reduced(text),
    };
  }
  return {
    lang: "english",
    ordinal: english_ordinal(text),
    reduction: english_reduction(text),
    reverse: english_reverse(text),
  };
}

/** Labeled rows for the panel — [key, label, value] per system in `all()`. */
export function gematriaRows(r: GematriaResult): { key: string; label: string; value: number }[] {
  if (r.lang === "hebrew") {
    return [
      { key: "hechrachi", label: "Mispar Hechrachi (standard)", value: r.hechrachi },
      { key: "gadol", label: "Mispar Gadol (finals lifted)", value: r.gadol },
      { key: "sidduri", label: "Mispar Sidduri (ordinal)", value: r.sidduri },
      { key: "katan", label: "Mispar Katan (reduced per letter)", value: r.katan },
      { key: "katan_mispari", label: "Mispar Katan Mispari (reduced total)", value: r.katan_mispari },
      { key: "boneh", label: "Mispar Boneh (building)", value: r.boneh },
      { key: "kidmi", label: "Mispar Kidmi (triangular)", value: r.kidmi },
      { key: "neelam", label: "Mispar Ne'elam (hidden)", value: r.neelam },
      { key: "haakhor", label: "Mispar Ha'akhor (positional)", value: r.haakhor },
      { key: "atbash", label: `Atbash (→ ${r.atbash.transformed || "—"})`, value: r.atbash.value },
      { key: "albam", label: `Albam (→ ${r.albam.transformed || "—"})`, value: r.albam.value },
    ];
  }
  if (r.lang === "greek") {
    return [
      { key: "isopsephy", label: "Isopsephy (standard)", value: r.isopsephy },
      { key: "ordinal", label: "Ordinal", value: r.ordinal },
      { key: "reduced", label: "Reduced", value: r.reduced },
    ];
  }
  return [
    { key: "ordinal", label: "Ordinal (a=1…z=26)", value: r.ordinal },
    { key: "reduction", label: "Reduction (digital root per letter)", value: r.reduction },
    { key: "reverse", label: "Reverse ordinal (a=26…z=1)", value: r.reverse },
  ];
}
