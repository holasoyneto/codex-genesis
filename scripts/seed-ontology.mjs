// seed-ontology.mjs — the verified Torah seed for Phase One (PALANTIR §1).
//
// This is NOT the frontier extraction sweep (that is scripts/extract-ontology.mjs,
// which runs the full mention + coreference + relation passes over all 66 books
// and lands in Session 2). This builds a HONEST, AUDITABLE seed so the engine,
// the Dossier and the smoke harness are real today:
//
//   • entities are a curated list of the Torah's principal persons & places;
//   • mentions are found by exact whole-word match against the baked WEB, so
//     every mention resolves to a real verse by construction (no hallucinated
//     refs — the corpus is the authority);
//   • relations are hand-curated genealogy/deeds, each carrying an evidence
//     ref that the audit harness verifies.
//
// Coreference ("the prophet" → Elijah) is deliberately NOT resolved here — that
// needs the frontier and is stated as a limitation in _meta. The seed never
// pretends to be the sweep.
//
// Usage:  node scripts/seed-ontology.mjs
// Output: data/ontology/{persons,places,relations,manifest}.json + mentions/<book>.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const WEB = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bibles/web.json"), "utf8"));
const OUT = path.join(ROOT, "data/ontology");
const TORAH = ["gen", "exo", "lev", "num", "deu"];

const DATE = "2026-07-03";
const META = {
  source: "World English Bible (public domain)",
  license: "Public Domain",
  extracted_by: `whole-word match over baked WEB · curated by claude-opus-4-8 · ${DATE}`,
  method: "seed",
  scope: "Torah (Genesis–Deuteronomy) principal persons & places",
  limitations:
    "Exact-name match only — coreference and pronoun anaphora are NOT resolved. " +
    "The full frontier mention+relation sweep over all 66 books lands in Session 2. " +
    "A verified seed, not the sweep.",
  contested_policy:
    "Where a tradition disputes an identity or reading, the entity carries a `contested` block " +
    "with the competing views and their sources. The app never presents one lens as neutral fact.",
};

// ── the curated cast ─────────────────────────────────────────────────────
// aliases: every surface form to match, most specific first. Distinctive names
// only — ambiguous eponyms (Israel the nation vs. Jacob) are matched on the
// unambiguous form to keep the seed honest.
const PERSONS = [
  ["p.adam", ["Adam"], "The first man, formed from the dust of the ground."],
  ["p.eve", ["Eve"], "The first woman, 'the mother of all living'."],
  ["p.cain", ["Cain"], "First son of Adam and Eve; killed his brother Abel."],
  ["p.abel", ["Abel"], "Second son of Adam; a keeper of sheep, slain by Cain."],
  ["p.seth", ["Seth"], "Third named son of Adam, appointed 'in place of Abel'."],
  ["p.enoch", ["Enoch"], "Walked with God; 'he was not, for God took him'."],
  ["p.methuselah", ["Methuselah"], "Longest-lived man recorded in scripture."],
  ["p.noah", ["Noah"], "Righteous in his generation; built the ark, survived the flood."],
  ["p.shem", ["Shem"], "Son of Noah; ancestor of the Semitic peoples."],
  ["p.ham", ["Ham"], "Son of Noah; father of Canaan."],
  ["p.japheth", ["Japheth"], "Son of Noah."],
  ["p.terah", ["Terah"], "Father of Abram, of Ur of the Chaldees."],
  ["p.abraham", ["Abraham", "Abram"], "The patriarch of faith; called from Ur, promised a nation."],
  ["p.sarah", ["Sarah", "Sarai"], "Wife of Abraham; mother of Isaac in her old age."],
  ["p.hagar", ["Hagar"], "Sarah's Egyptian handmaid; mother of Ishmael."],
  ["p.ishmael", ["Ishmael"], "Son of Abraham and Hagar; father of twelve princes."],
  ["p.lot", ["Lot"], "Abraham's nephew; dwelt in Sodom, delivered from its destruction."],
  ["p.melchizedek", ["Melchizedek"], "King of Salem and priest of God Most High; blessed Abram."],
  ["p.isaac", ["Isaac"], "The son of promise; offered on Moriah, father of Jacob and Esau."],
  ["p.rebekah", ["Rebekah"], "Wife of Isaac; mother of Esau and Jacob."],
  ["p.esau", ["Esau"], "Firstborn of Isaac; sold his birthright; father of Edom."],
  ["p.jacob", ["Jacob"], "Younger son of Isaac, renamed Israel; father of the twelve tribes."],
  ["p.rachel", ["Rachel"], "Beloved wife of Jacob; mother of Joseph and Benjamin."],
  ["p.leah", ["Leah"], "Wife of Jacob; mother of six of the tribes incl. Judah and Levi."],
  ["p.laban", ["Laban"], "Brother of Rebekah; father of Rachel and Leah."],
  ["p.reuben", ["Reuben"], "Firstborn of Jacob by Leah."],
  ["p.simeon", ["Simeon"], "Second son of Jacob by Leah."],
  ["p.levi", ["Levi"], "Third son of Jacob; ancestor of the priestly tribe."],
  ["p.judah", ["Judah"], "Fourth son of Jacob; ancestor of the royal and Messianic line."],
  ["p.joseph", ["Joseph"], "Beloved son of Jacob; sold into Egypt, rose to be its ruler."],
  ["p.benjamin", ["Benjamin"], "Youngest son of Jacob, Rachel's second son."],
  ["p.ephraim", ["Ephraim"], "Younger son of Joseph, blessed above the firstborn."],
  ["p.manasseh", ["Manasseh"], "Firstborn son of Joseph."],
  ["p.potiphar", ["Potiphar"], "Egyptian officer who bought Joseph."],
  ["p.moses", ["Moses"], "Drawn from the water; led Israel out of Egypt; received the Law."],
  ["p.aaron", ["Aaron"], "Brother of Moses; first high priest of Israel."],
  ["p.miriam", ["Miriam"], "Sister of Moses and Aaron; prophetess."],
  ["p.jethro", ["Jethro", "Reuel"], "Priest of Midian; father-in-law of Moses."],
  ["p.zipporah", ["Zipporah"], "Wife of Moses, daughter of Jethro."],
  ["p.joshua", ["Joshua"], "Moses' minister; one of the two faithful spies; his successor."],
  ["p.caleb", ["Caleb"], "The other faithful spy; 'he wholly followed the LORD'."],
  ["p.korah", ["Korah"], "Led a rebellion against Moses and Aaron; swallowed by the earth."],
  ["p.balaam", ["Balaam"], "The Mesopotamian seer hired to curse Israel, made to bless."],
  ["p.eleazar", ["Eleazar"], "Son of Aaron; succeeded him as high priest."],
  ["p.phinehas", ["Phinehas"], "Son of Eleazar; his zeal turned away the plague."],
];

const PLACES = [
  ["pl.eden", ["Eden"], "The garden God planted eastward, where man was set."],
  ["pl.ararat", ["Ararat"], "The mountains where the ark came to rest."],
  ["pl.babel", ["Babel"], "Where the LORD confused the one language of the earth."],
  ["pl.ur", ["Ur"], "Ur of the Chaldees, Abram's birthplace."],
  ["pl.haran", ["Haran"], "Where Terah settled and Abram was called onward."],
  ["pl.canaan", ["Canaan"], "The land promised to Abraham and his seed."],
  ["pl.shechem", ["Shechem"], "Abram's first altar-site in the land."],
  ["pl.bethel", ["Bethel"], "'House of God'; Jacob's ladder and vow."],
  ["pl.hebron", ["Hebron", "Mamre"], "Where Abraham pitched his tent and was buried."],
  ["pl.beersheba", ["Beersheba"], "'Well of the oath'; a patriarchal boundary."],
  ["pl.sodom", ["Sodom"], "The city of the plain destroyed with Gomorrah."],
  ["pl.gomorrah", ["Gomorrah"], "Destroyed with Sodom by fire from heaven."],
  ["pl.salem", ["Salem"], "Melchizedek's city, later associated with Jerusalem."],
  ["pl.egypt", ["Egypt"], "The land of bondage and of Joseph's exaltation."],
  ["pl.goshen", ["Goshen"], "The region of Egypt where Israel dwelt."],
  ["pl.midian", ["Midian"], "Where Moses fled and kept Jethro's flock."],
  ["pl.sinai", ["Sinai"], "The mountain of the Law and the covenant."],
  ["pl.horeb", ["Horeb"], "The mountain of God; the burning bush and the rock."],
  ["pl.jordan", ["Jordan"], "The river bounding the land of promise."],
  ["pl.moab", ["Moab"], "The plains where Israel camped before crossing over."],
  ["pl.nebo", ["Nebo", "Pisgah"], "The height from which Moses saw the land and died."],
  ["pl.kadesh", ["Kadesh"], "The wilderness camp of Israel's long sojourn."],
];

// ── curated relations (each with an evidence ref the audit verifies) ───────
const R = (from, to, kind, ref, provenance = "curated · Torah genealogy") =>
  ({ from, to, kind, ref, provenance });
const RELATIONS = [
  R("p.adam", "p.eve", "spouse_of", "gen.3.20"),
  R("p.adam", "p.cain", "father_of", "gen.4.1"),
  R("p.adam", "p.abel", "father_of", "gen.4.2"),
  R("p.adam", "p.seth", "father_of", "gen.4.25"),
  R("p.eve", "p.cain", "mother_of", "gen.4.1"),
  R("p.eve", "p.seth", "mother_of", "gen.4.25"),
  R("p.noah", "p.shem", "father_of", "gen.5.32"),
  R("p.noah", "p.ham", "father_of", "gen.5.32"),
  R("p.noah", "p.japheth", "father_of", "gen.5.32"),
  R("p.terah", "p.abraham", "father_of", "gen.11.27"),
  R("p.abraham", "p.sarah", "spouse_of", "gen.11.29"),
  R("p.abraham", "p.ishmael", "father_of", "gen.16.15"),
  R("p.hagar", "p.ishmael", "mother_of", "gen.16.15"),
  R("p.abraham", "p.isaac", "father_of", "gen.21.3"),
  R("p.sarah", "p.isaac", "mother_of", "gen.21.3"),
  R("p.abraham", "p.lot", "uncle_of", "gen.12.5"),
  R("p.melchizedek", "p.abraham", "blessed", "gen.14.19", "curated · Genesis 14 (the showcase)"),
  R("p.melchizedek", "pl.salem", "king_of", "gen.14.18"),
  R("p.lot", "pl.sodom", "dwelt_in", "gen.13.12"),
  R("p.isaac", "p.rebekah", "spouse_of", "gen.24.67"),
  R("p.isaac", "p.esau", "father_of", "gen.25.25"),
  R("p.isaac", "p.jacob", "father_of", "gen.25.26"),
  R("p.rebekah", "p.esau", "mother_of", "gen.25.25"),
  R("p.rebekah", "p.jacob", "mother_of", "gen.25.26"),
  R("p.laban", "p.rebekah", "brother_of", "gen.24.29"),
  R("p.laban", "p.rachel", "father_of", "gen.29.16"),
  R("p.laban", "p.leah", "father_of", "gen.29.16"),
  R("p.jacob", "p.rachel", "spouse_of", "gen.29.28"),
  R("p.jacob", "p.leah", "spouse_of", "gen.29.23"),
  R("p.jacob", "p.reuben", "father_of", "gen.29.32"),
  R("p.jacob", "p.simeon", "father_of", "gen.29.33"),
  R("p.jacob", "p.levi", "father_of", "gen.29.34"),
  R("p.jacob", "p.judah", "father_of", "gen.29.35"),
  R("p.jacob", "p.joseph", "father_of", "gen.30.24"),
  R("p.jacob", "p.benjamin", "father_of", "gen.35.18"),
  R("p.leah", "p.reuben", "mother_of", "gen.29.32"),
  R("p.leah", "p.levi", "mother_of", "gen.29.34"),
  R("p.leah", "p.judah", "mother_of", "gen.29.35"),
  R("p.rachel", "p.joseph", "mother_of", "gen.30.24"),
  R("p.rachel", "p.benjamin", "mother_of", "gen.35.18"),
  R("p.joseph", "p.manasseh", "father_of", "gen.41.51"),
  R("p.joseph", "p.ephraim", "father_of", "gen.41.52"),
  R("p.levi", "p.moses", "ancestor_of", "exo.6.20"),
  R("p.levi", "p.aaron", "ancestor_of", "exo.6.20"),
  R("p.moses", "p.aaron", "brother_of", "exo.7.1"),
  R("p.moses", "p.miriam", "sibling_of", "num.26.59"),
  R("p.jethro", "p.zipporah", "father_of", "exo.2.21"),
  R("p.moses", "p.zipporah", "spouse_of", "exo.2.21"),
  R("p.aaron", "p.eleazar", "father_of", "exo.6.23"),
  R("p.eleazar", "p.phinehas", "father_of", "exo.6.25"),
];

// ── contested stamps (honesty is load-bearing) ────────────────────────────
const CONTESTED = {
  "p.melchizedek": {
    why: "His origin and identity are read differently across traditions.",
    views: [
      { view: "A historical Canaanite priest-king of Salem.", source: "plain sense of Genesis 14" },
      { view: "Identified with Shem, son of Noah.", source: "Targum / rabbinic tradition (b. Nedarim 32b)" },
      { view: "A type of the eternal priesthood of Christ, 'without genealogy'.", source: "Hebrews 7 (Christian reading)" },
    ],
  },
};

// ── the match ──────────────────────────────────────────────────────────
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function mentionsFor(aliases) {
  // Whole-word, case-sensitive on the capitalised name. Possessives ('s) count.
  const re = new RegExp(`(?<![\\p{L}])(${aliases.map(esc).join("|")})(?![\\p{L}])`, "u");
  const found = [];
  for (const book of TORAH) {
    for (const [key, verses] of Object.entries(WEB.chapters)) {
      if (!key.startsWith(book + ".")) continue;
      const [, ch] = key.split(".");
      for (const v of verses) {
        const m = re.exec(v.text);
        if (m) found.push({ ref: `${book}.${ch}.${v.n}`, form: m[1] });
      }
    }
  }
  return found;
}

// ── build ────────────────────────────────────────────────────────────
fs.mkdirSync(path.join(OUT, "mentions"), { recursive: true });

const entityRec = ([id, names, summary], kind) => {
  const rec = { id, kind, names, summary };
  if (CONTESTED[id]) rec.contested = CONTESTED[id];
  return rec;
};
const persons = PERSONS.map((e) => entityRec(e, "person"));
const places = PLACES.map((e) => entityRec(e, "place"));
const allEntities = [...PERSONS, ...PLACES];

// mentions, sharded per book
const byBook = Object.fromEntries(TORAH.map((b) => [b, []]));
let totalMentions = 0;
for (const [id, aliases] of allEntities) {
  for (const mm of mentionsFor(aliases)) {
    const book = mm.ref.split(".")[0];
    byBook[book].push({ entityId: id, ref: mm.ref, form: mm.form });
    totalMentions++;
  }
}
for (const book of TORAH) {
  // stable order: by verse then entity
  byBook[book].sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }) || a.entityId.localeCompare(b.entityId));
  fs.writeFileSync(
    path.join(OUT, "mentions", `${book}.json`),
    JSON.stringify({ _meta: META, book, mentions: byBook[book] }, null, 0) + "\n"
  );
}

const write = (name, body) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(body, null, 2) + "\n");
write("persons.json", { _meta: META, entities: persons });
write("places.json", { _meta: META, entities: places });
write("relations.json", { _meta: META, relations: RELATIONS });

const manifest = {
  _meta: META,
  generated: DATE,
  books: TORAH,
  counts: {
    persons: persons.length,
    places: places.length,
    entities: persons.length + places.length,
    relations: RELATIONS.length,
    mentions: totalMentions,
    mentionsByBook: Object.fromEntries(TORAH.map((b) => [b, byBook[b].length])),
  },
};
write("manifest.json", manifest);

console.log("[seed-ontology] wrote", OUT);
console.log("  persons  :", persons.length);
console.log("  places   :", places.length);
console.log("  relations:", RELATIONS.length);
console.log("  mentions :", totalMentions, JSON.stringify(manifest.counts.mentionsByBook));
