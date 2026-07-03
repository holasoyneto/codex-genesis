// seed-ontology.mjs — the verified, book-scoped seed for Phase One (PALANTIR §1).
//
// This is NOT the frontier extraction sweep (scripts/extract-ontology.mjs runs
// the full mention + coreference + relation passes over all 66 books and lands
// in Session 2). This builds a HONEST, AUDITABLE seed so the engine, the
// Dossier and the smoke harness are real today:
//
//   • entities are a curated cast of distinctive persons & places;
//   • mentions are found by exact whole-word match against the baked WEB, so
//     every mention resolves to a real verse by construction (no hallucinated
//     refs — the corpus is the authority);
//   • each entity carries a `books` SCOPE — the set of books where its name
//     denotes IT unambiguously. This is how the seed stays precise without the
//     frontier: "Joseph" the patriarch is scoped to the Torah/Joshua and never
//     conflated with Joseph the husband of Mary; "Saul" the king never bleeds
//     into Saul-who-became-Paul. Ambiguous common names the seed cannot safely
//     resolve (John, Mary, Simon, James, Judas, most of the NT) are LEFT for
//     the frontier sweep, not faked here.
//   • relations are hand-curated, each carrying an evidence ref the audit verifies.
//
// Coreference ("the prophet" → Elijah) is deliberately NOT resolved here.
// The seed never pretends to be the sweep.
//
// Usage:  node scripts/seed-ontology.mjs
// Output: data/ontology/{persons,places,relations,manifest}.json + mentions/<book>.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const WEB = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bibles/web.json"), "utf8"));
const OUT = path.join(ROOT, "data/ontology");

const DATE = "2026-07-03";
const TORAH = ["gen", "exo", "lev", "num", "deu"];
// Canonical order of the baked WEB (Genesis → Revelation) — for stable output.
const WEB_ORDER = [...new Set(Object.keys(WEB.chapters).map((k) => k.split(".")[0]))];

const META = {
  source: "World English Bible (public domain)",
  license: "Public Domain",
  extracted_by: `whole-word match over baked WEB · curated by claude-opus-4-8 · ${DATE}`,
  method: "seed",
  scope: "Distinctive persons & places, each scoped to the books where its name is unambiguous (Torah + OT narrative & prophets).",
  limitations:
    "Exact-name match only, no coreference or pronoun anaphora. Each entity is confined to a curated `books` scope, " +
    "so recall is deliberately bounded (a figure named outside its scope gets no chip) in exchange for precision. " +
    "Ambiguous common names the seed cannot safely disambiguate — most of the New Testament (John, Mary, Simon, James, " +
    "Judas), tribe-vs-person eponyms outside the Torah — are LEFT for the frontier sweep over all 66 books (Session 2), " +
    "not approximated here. A verified seed, not the sweep.",
  contested_policy:
    "Where a tradition disputes an identity or reading, the entity carries a `contested` block with the competing views " +
    "and their sources. The app never presents one lens as neutral fact.",
};

// ── the curated cast ─────────────────────────────────────────────────────
// { id, aliases:[surface forms, most specific first], summary, books:[scope] }
// A person and a place helper keep the tables terse.
const NARR = ["jos", "jdg", "rut", "1sa", "2sa", "1ki", "2ki", "1ch", "2ch", "ezr", "neh", "est"];

const PERSONS = [
  // — the Torah (scoped to the five books; unchanged from the first seed) —
  ["p.adam", ["Adam"], "The first man, formed from the dust of the ground.", TORAH],
  ["p.eve", ["Eve"], "The first woman, 'the mother of all living'.", TORAH],
  ["p.cain", ["Cain"], "First son of Adam and Eve; killed his brother Abel.", TORAH],
  ["p.abel", ["Abel"], "Second son of Adam; a keeper of sheep, slain by Cain.", TORAH],
  ["p.seth", ["Seth"], "Third named son of Adam, appointed 'in place of Abel'.", TORAH],
  ["p.enoch", ["Enoch"], "Walked with God; 'he was not, for God took him'.", TORAH],
  ["p.methuselah", ["Methuselah"], "Longest-lived man recorded in scripture.", TORAH],
  ["p.noah", ["Noah"], "Righteous in his generation; built the ark, survived the flood.", TORAH],
  ["p.shem", ["Shem"], "Son of Noah; ancestor of the Semitic peoples.", TORAH],
  ["p.ham", ["Ham"], "Son of Noah; father of Canaan.", TORAH],
  ["p.japheth", ["Japheth"], "Son of Noah.", TORAH],
  ["p.terah", ["Terah"], "Father of Abram, of Ur of the Chaldees.", TORAH],
  ["p.abraham", ["Abraham", "Abram"], "The patriarch of faith; called from Ur, promised a nation.", TORAH],
  ["p.sarah", ["Sarah", "Sarai"], "Wife of Abraham; mother of Isaac in her old age.", TORAH],
  ["p.hagar", ["Hagar"], "Sarah's Egyptian handmaid; mother of Ishmael.", TORAH],
  ["p.ishmael", ["Ishmael"], "Son of Abraham and Hagar; father of twelve princes.", TORAH],
  ["p.lot", ["Lot"], "Abraham's nephew; dwelt in Sodom, delivered from its destruction.", TORAH],
  ["p.melchizedek", ["Melchizedek"], "King of Salem and priest of God Most High; blessed Abram.", TORAH],
  ["p.isaac", ["Isaac"], "The son of promise; offered on Moriah, father of Jacob and Esau.", TORAH],
  ["p.rebekah", ["Rebekah"], "Wife of Isaac; mother of Esau and Jacob.", TORAH],
  ["p.esau", ["Esau"], "Firstborn of Isaac; sold his birthright; father of Edom.", TORAH],
  ["p.jacob", ["Jacob"], "Younger son of Isaac, renamed Israel; father of the twelve tribes.", TORAH],
  ["p.rachel", ["Rachel"], "Beloved wife of Jacob; mother of Joseph and Benjamin.", TORAH],
  ["p.leah", ["Leah"], "Wife of Jacob; mother of six of the tribes incl. Judah and Levi.", TORAH],
  ["p.laban", ["Laban"], "Brother of Rebekah; father of Rachel and Leah.", TORAH],
  ["p.reuben", ["Reuben"], "Firstborn of Jacob by Leah.", TORAH],
  ["p.simeon", ["Simeon"], "Second son of Jacob by Leah.", TORAH],
  ["p.levi", ["Levi"], "Third son of Jacob; ancestor of the priestly tribe.", TORAH],
  ["p.judah", ["Judah"], "Fourth son of Jacob; ancestor of the royal and Messianic line.", TORAH],
  ["p.joseph", ["Joseph"], "Beloved son of Jacob; sold into Egypt, rose to be its ruler.", ["gen", "exo", "num", "jos"]],
  ["p.benjamin", ["Benjamin"], "Youngest son of Jacob, Rachel's second son.", TORAH],
  ["p.ephraim", ["Ephraim"], "Younger son of Joseph, blessed above the firstborn.", TORAH],
  ["p.manasseh", ["Manasseh"], "Firstborn son of Joseph.", TORAH],
  ["p.potiphar", ["Potiphar"], "Egyptian officer who bought Joseph.", TORAH],
  ["p.moses", ["Moses"], "Drawn from the water; led Israel out of Egypt; received the Law.", TORAH],
  ["p.aaron", ["Aaron"], "Brother of Moses; first high priest of Israel.", TORAH],
  ["p.miriam", ["Miriam"], "Sister of Moses and Aaron; prophetess.", TORAH],
  ["p.jethro", ["Jethro", "Reuel"], "Priest of Midian; father-in-law of Moses.", TORAH],
  ["p.zipporah", ["Zipporah"], "Wife of Moses, daughter of Jethro.", TORAH],
  ["p.joshua", ["Joshua"], "Moses' minister; one of the two faithful spies; his successor.", ["exo", "num", "deu", "jos"]],
  ["p.caleb", ["Caleb"], "The other faithful spy; 'he wholly followed the LORD'.", ["num", "deu", "jos", "jdg"]],
  ["p.korah", ["Korah"], "Led a rebellion against Moses and Aaron; swallowed by the earth.", TORAH],
  ["p.balaam", ["Balaam"], "The Mesopotamian seer hired to curse Israel, made to bless.", TORAH],
  ["p.eleazar", ["Eleazar"], "Son of Aaron; succeeded him as high priest.", TORAH],
  ["p.phinehas", ["Phinehas"], "Son of Eleazar; his zeal turned away the plague.", TORAH],

  // — the Conquest & the Judges —
  ["p.rahab", ["Rahab"], "The Canaanite of Jericho who hid the spies and was spared.", ["jos"]],
  ["p.achan", ["Achan"], "Took of the devoted things at Jericho; brought defeat on Israel.", ["jos"]],
  ["p.deborah", ["Deborah"], "Prophetess and judge who summoned Barak against Sisera.", ["jdg"]],
  ["p.barak", ["Barak"], "Captain who, with Deborah, routed Sisera's army.", ["jdg"]],
  ["p.gideon", ["Gideon"], "Judge who broke Midian with three hundred men.", ["jdg"]],
  ["p.samson", ["Samson"], "The Nazirite of prodigious strength; judge against the Philistines.", ["jdg"]],
  ["p.delilah", ["Delilah"], "The woman of Sorek who coaxed out Samson's secret.", ["jdg"]],

  // — Ruth —
  ["p.ruth", ["Ruth"], "The Moabite who clung to Naomi and to her God; great-grandmother of David.", ["rut"]],
  ["p.naomi", ["Naomi"], "Widow of Bethlehem, mother-in-law of Ruth.", ["rut"]],
  ["p.boaz", ["Boaz"], "The kinsman-redeemer of Bethlehem who married Ruth.", ["rut"]],

  // — the United Kingdom —
  ["p.samuel", ["Samuel"], "Last of the judges; the prophet who anointed Saul and David.", ["1sa", "2sa"]],
  ["p.jesse", ["Jesse"], "The Bethlehemite, father of David.", ["rut", "1sa", "isa"]],
  ["p.saul-king", ["Saul"], "First king of Israel, of the tribe of Benjamin.", ["1sa", "2sa"]],
  ["p.jonathan", ["Jonathan"], "Saul's son; David's covenant friend.", ["1sa", "2sa"]],
  ["p.david", ["David"], "Shepherd, psalmist and king; the man after God's own heart.", ["1sa", "2sa", "1ki"]],
  ["p.goliath", ["Goliath"], "The Philistine champion of Gath, felled by David's sling.", ["1sa", "2sa"]],
  ["p.abner", ["Abner"], "Saul's captain of the host.", ["1sa", "2sa"]],
  ["p.joab", ["Joab"], "David's fierce and ruthless captain of the host.", ["2sa", "1ki"]],
  ["p.absalom", ["Absalom"], "David's son who rebelled and seized the kingdom for a season.", ["2sa"]],
  ["p.bathsheba", ["Bathsheba"], "Wife of Uriah, then of David; mother of Solomon.", ["2sa", "1ki"]],
  ["p.nathan", ["Nathan"], "The prophet who confronted David and named Solomon.", ["2sa", "1ki"]],
  ["p.solomon", ["Solomon"], "David's son; builder of the Temple; the wise king.", ["1ki", "1ch", "2ch"]],

  // — the Divided Kingdom & its prophets —
  ["p.jeroboam", ["Jeroboam"], "First king of the northern ten tribes; set up the golden calves.", ["1ki", "2ki"]],
  ["p.rehoboam", ["Rehoboam"], "Solomon's son whose folly split the kingdom.", ["1ki", "2ch"]],
  ["p.ahab", ["Ahab"], "King of Israel who married Jezebel and served Baal.", ["1ki", "2ki"]],
  ["p.jezebel", ["Jezebel"], "Ahab's queen, patroness of Baal, foe of Elijah.", ["1ki", "2ki"]],
  ["p.elijah", ["Elijah"], "The Tishbite; called down fire on Carmel; taken up in a whirlwind.", ["1ki", "2ki"]],
  ["p.elisha", ["Elisha"], "Elijah's successor, who received a double portion of his spirit.", ["1ki", "2ki"]],
  ["p.jehu", ["Jehu"], "The furious charioteer anointed to end the house of Ahab.", ["2ki"]],
  ["p.hezekiah", ["Hezekiah"], "King of Judah who trusted the LORD against Assyria.", ["2ki", "2ch", "isa"]],
  ["p.josiah", ["Josiah"], "The reforming king who restored the Book of the Law.", ["2ki", "2ch"]],
  ["p.nebuchadnezzar", ["Nebuchadnezzar"], "King of Babylon who razed Jerusalem and carried Judah away.", ["2ki", "jer", "dan", "ezk"]],

  // — Exile & Return —
  ["p.daniel", ["Daniel"], "The exile in Babylon's court, keeper of visions, spared in the lions' den.", ["dan"]],
  ["p.ezra", ["Ezra"], "The scribe who brought the Law back to the returned exiles.", ["ezr", "neh"]],
  ["p.nehemiah", ["Nehemiah"], "The cupbearer who rebuilt Jerusalem's wall.", ["neh"]],
  ["p.esther", ["Esther", "Hadassah"], "The Jewish queen of Persia who saved her people.", ["est"]],
  ["p.mordecai", ["Mordecai"], "Esther's guardian cousin who would not bow to Haman.", ["est"]],
  ["p.haman", ["Haman"], "The Agagite whose plot against the Jews recoiled on himself.", ["est"]],
  ["p.cyrus", ["Cyrus"], "The Persian king whose decree sent the exiles home.", ["ezr", "isa", "dan", "2ch"]],

  // — the Prophets (each in his own book) —
  ["p.job", ["Job"], "The blameless man of Uz tried in the crucible of suffering.", ["job"]],
  ["p.isaiah", ["Isaiah"], "The prophet of the Holy One of Israel and the Suffering Servant.", ["isa"]],
  ["p.jeremiah", ["Jeremiah"], "The weeping prophet of Judah's last days.", ["jer", "lam"]],
  ["p.ezekiel", ["Ezekiel"], "Priest-prophet of the exile; seer of the chariot and the dry bones.", ["ezk"]],
  ["p.hosea", ["Hosea"], "Prophet whose marriage figured God's love for faithless Israel.", ["hos"]],
  ["p.amos", ["Amos"], "The herdsman of Tekoa, prophet of justice.", ["amo"]],
  ["p.jonah", ["Jonah"], "The prophet who fled to Tarshish and preached to Nineveh.", ["jon", "2ki"]],
  ["p.micah", ["Micah"], "Prophet who foretold the ruler to come from Bethlehem.", ["mic"]],
  ["p.habakkuk", ["Habakkuk"], "Prophet who learned that the just shall live by faith.", ["hab"]],
  ["p.zechariah", ["Zechariah"], "Post-exilic prophet of the coming King on a donkey.", ["zec"]],
];

const PLACES = [
  // — Torah —
  ["pl.eden", ["Eden"], "The garden God planted eastward, where man was set.", TORAH],
  ["pl.ararat", ["Ararat"], "The mountains where the ark came to rest.", TORAH],
  ["pl.babel", ["Babel"], "Where the LORD confused the one language of the earth.", TORAH],
  ["pl.ur", ["Ur"], "Ur of the Chaldees, Abram's birthplace.", TORAH],
  ["pl.haran", ["Haran"], "Where Terah settled and Abram was called onward.", TORAH],
  ["pl.canaan", ["Canaan"], "The land promised to Abraham and his seed.", TORAH],
  ["pl.shechem", ["Shechem"], "Abram's first altar-site in the land.", TORAH],
  ["pl.bethel", ["Bethel"], "'House of God'; Jacob's ladder and vow.", TORAH],
  ["pl.hebron", ["Hebron", "Mamre"], "Where Abraham pitched his tent and was buried.", TORAH],
  ["pl.beersheba", ["Beersheba"], "'Well of the oath'; a patriarchal boundary.", TORAH],
  ["pl.sodom", ["Sodom"], "The city of the plain destroyed with Gomorrah.", TORAH],
  ["pl.gomorrah", ["Gomorrah"], "Destroyed with Sodom by fire from heaven.", TORAH],
  ["pl.salem", ["Salem"], "Melchizedek's city, later associated with Jerusalem.", TORAH],
  ["pl.egypt", ["Egypt"], "The land of bondage and of Joseph's exaltation.", TORAH],
  ["pl.goshen", ["Goshen"], "The region of Egypt where Israel dwelt.", TORAH],
  ["pl.midian", ["Midian"], "Where Moses fled and kept Jethro's flock.", TORAH],
  ["pl.sinai", ["Sinai"], "The mountain of the Law and the covenant.", TORAH],
  ["pl.horeb", ["Horeb"], "The mountain of God; the burning bush and the rock.", TORAH],
  ["pl.jordan", ["Jordan"], "The river bounding the land of promise.", TORAH],
  ["pl.moab", ["Moab"], "The plains where Israel camped before crossing over.", TORAH],
  ["pl.nebo", ["Nebo", "Pisgah"], "The height from which Moses saw the land and died.", TORAH],
  ["pl.kadesh", ["Kadesh"], "The wilderness camp of Israel's long sojourn.", TORAH],

  // — the Land & the Kingdoms —
  ["pl.jericho", ["Jericho"], "The city of palms whose walls fell at the shout.", ["jos", "jdg", "2ki"]],
  ["pl.shiloh", ["Shiloh"], "Where the tabernacle stood and Samuel was called.", ["jos", "jdg", "1sa"]],
  ["pl.gilgal", ["Gilgal"], "Israel's first camp across the Jordan.", ["jos", "1sa"]],
  ["pl.carmel", ["Carmel"], "The mount of Elijah's contest with the prophets of Baal.", ["1ki", "2ki"]],
  ["pl.samaria", ["Samaria"], "Capital of the northern kingdom of Israel.", ["1ki", "2ki"]],
  ["pl.nineveh", ["Nineveh"], "The great city of Assyria, spared at Jonah's preaching.", ["jon", "nam", "2ki"]],
  ["pl.babylon", ["Babylon"], "The empire and city of Judah's exile.", ["2ki", "jer", "dan", "isa"]],
  ["pl.zion", ["Zion"], "The mount of the city of David; the beloved of God.", ["isa", "psa"]],
];

// ── curated relations (each with an evidence ref the audit verifies) ───────
const R = (from, to, kind, ref, provenance = "curated · scripture genealogy & deeds") =>
  ({ from, to, kind, ref, provenance });
const RELATIONS = [
  // Torah
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
  // Judges & Ruth
  R("p.deborah", "p.barak", "summoned", "jdg.4.6"),
  R("p.samson", "p.delilah", "loved", "jdg.16.4"),
  R("p.naomi", "p.ruth", "mother_in_law_of", "rut.1.4"),
  R("p.boaz", "p.ruth", "spouse_of", "rut.4.13"),
  // United Kingdom
  R("p.jesse", "p.david", "father_of", "rut.4.22"),
  R("p.samuel", "p.saul-king", "anointed", "1sa.10.1"),
  R("p.samuel", "p.david", "anointed", "1sa.16.13"),
  R("p.saul-king", "p.jonathan", "father_of", "1sa.14.49"),
  R("p.david", "p.jonathan", "covenant_with", "1sa.18.3"),
  R("p.david", "p.goliath", "killed", "1sa.17.50"),
  R("p.david", "p.bathsheba", "spouse_of", "2sa.12.24"),
  R("p.david", "p.absalom", "father_of", "2sa.3.3"),
  R("p.david", "p.solomon", "father_of", "2sa.12.24"),
  R("p.bathsheba", "p.solomon", "mother_of", "1ki.1.11"),
  R("p.nathan", "p.david", "rebuked", "2sa.12.7"),
  // Divided Kingdom & prophets
  R("p.solomon", "p.rehoboam", "father_of", "1ki.11.43"),
  R("p.ahab", "p.jezebel", "spouse_of", "1ki.16.31"),
  R("p.elijah", "p.elisha", "called", "1ki.19.19"),
  R("p.elijah", "p.ahab", "rebuked", "1ki.18.18"),
  R("p.jehu", "p.jezebel", "killed", "2ki.9.33"),
  R("p.nebuchadnezzar", "pl.babylon", "king_of", "dan.1.1"),
  R("p.nebuchadnezzar", "p.daniel", "ruled", "dan.2.48"),
  // Exile & Return
  R("p.mordecai", "p.esther", "guardian_of", "est.2.7"),
  R("p.cyrus", "pl.babylon", "king_of", "2ch.36.23"),
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
  "p.isaiah": {
    why: "The unity of the book of Isaiah is disputed.",
    views: [
      { view: "One prophet, Isaiah of Jerusalem, wrote the whole book (8th c. BC).", source: "traditional / conservative view" },
      { view: "Chapters 40–66 come from later hands ('Deutero-' and 'Trito-Isaiah').", source: "critical scholarship (Duhm 1892 and after)" },
    ],
  },
};

// ── the match ──────────────────────────────────────────────────────────
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function mentionsFor(aliases, books) {
  // Whole-word, case-sensitive on the capitalised name. Possessives ('s) count.
  const re = new RegExp(`(?<![\\p{L}])(${aliases.map(esc).join("|")})(?![\\p{L}])`, "u");
  const found = [];
  for (const book of books) {
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

const entityRec = ([id, names, summary]) => {
  const kind = id.startsWith("pl.") ? "place" : "person";
  const rec = { id, kind, names, summary };
  if (CONTESTED[id]) rec.contested = CONTESTED[id];
  return rec;
};
const persons = PERSONS.map(entityRec);
const places = PLACES.map(entityRec);
const allEntities = [...PERSONS, ...PLACES];

// mentions, sharded per book — only books that actually receive one get a file
const byBook = {};
let totalMentions = 0;
for (const [id, aliases, , books] of allEntities) {
  for (const mm of mentionsFor(aliases, books)) {
    const book = mm.ref.split(".")[0];
    (byBook[book] ??= []).push({ entityId: id, ref: mm.ref, form: mm.form });
    totalMentions++;
  }
}
const booksWithMentions = Object.keys(byBook).sort(
  (a, b) => WEB_ORDER.indexOf(a) - WEB_ORDER.indexOf(b)
);
for (const book of booksWithMentions) {
  byBook[book].sort(
    (a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }) || a.entityId.localeCompare(b.entityId)
  );
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
  books: booksWithMentions,
  counts: {
    persons: persons.length,
    places: places.length,
    entities: persons.length + places.length,
    relations: RELATIONS.length,
    mentions: totalMentions,
    mentionsByBook: Object.fromEntries(booksWithMentions.map((b) => [b, byBook[b].length])),
  },
};
write("manifest.json", manifest);

console.log("[seed-ontology] wrote", OUT);
console.log("  persons  :", persons.length);
console.log("  places   :", places.length);
console.log("  relations:", RELATIONS.length);
console.log("  books    :", booksWithMentions.length, "→", booksWithMentions.join(" "));
console.log("  mentions :", totalMentions);
