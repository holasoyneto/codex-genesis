// The ONE smoke harness. Shared boot, shared external-noise filter,
// per-feature specs, screenshot proof. A feature lands with its spec here
// or it doesn't land.
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.env.SMOKE_URL || "http://localhost:7778/";
const SHOTS = process.env.SMOKE_SHOTS || "./smoke-shots";
fs.mkdirSync(SHOTS, { recursive: true });

const EXTERNAL = /Failed to load resource|Access to fetch|CORS policy|bible-api\.com|bolls\.life|ERR_FAILED|net::/i;
const results = [];
const check = (name, ok, info = "") => {
  results.push({ name, ok });
  console.log(`[smoke] ${ok ? "ok  " : "FAIL"} — ${name}${info ? " :: " + info : ""}`);
};

// ── ontology data integrity (node-side, before any browser) ───────────────
// The keystone must be sound in the data before it can be sound in the UI:
// every mention resolves to a real verse, and its surface form is really there.
{
  const web = JSON.parse(fs.readFileSync("data/bibles/web.json", "utf8")).chapters;
  const manifest = JSON.parse(fs.readFileSync("data/ontology/manifest.json", "utf8"));
  const verseText = (ref) => {
    const [b, c, v] = String(ref).split(".");
    return (web[`${b}.${c}`] || []).find((x) => x.n === Number(v))?.text ?? null;
  };
  let total = 0, dead = 0, formMiss = 0;
  for (const b of manifest.books) {
    const { mentions } = JSON.parse(fs.readFileSync(`data/ontology/mentions/${b}.json`, "utf8"));
    for (const m of mentions) {
      total++;
      const t = verseText(m.ref);
      if (t == null) dead++;
      else if (!t.includes(m.form)) formMiss++;
    }
  }
  check("ontology: Torah seed has persons & places", manifest.counts.persons > 0 && manifest.counts.places > 0, JSON.stringify(manifest.counts));
  check("ontology: every mention resolves to a real verse", total > 0 && dead === 0, `${total} mentions · ${dead} dead`);
  check("ontology: every mention form occurs in its verse", formMiss === 0, `${formMiss} misses`);
  // relations are evidenced and their endpoints are known entities
  const ents = new Set([
    ...JSON.parse(fs.readFileSync("data/ontology/persons.json", "utf8")).entities.map((e) => e.id),
    ...JSON.parse(fs.readFileSync("data/ontology/places.json", "utf8")).entities.map((e) => e.id),
  ]);
  const rels = JSON.parse(fs.readFileSync("data/ontology/relations.json", "utf8")).relations;
  const relBad = rels.filter((r) => !ents.has(r.from) || !ents.has(r.to) || (r.ref && verseText(r.ref) == null));
  check("ontology: every relation is evidenced and well-formed", relBad.length === 0, `${rels.length} relations · ${relBad.length} bad`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

async function boot(w, h, mobile = false) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
  page.jsErrors = [];
  page.on("pageerror", (e) => { if (!EXTERNAL.test(e.message)) page.jsErrors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error" && !EXTERNAL.test(m.text())) page.jsErrors.push(m.text()); });
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(() => window.__CODEX_READY__ === true, { timeout: 30000 });
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  // ── desk ─────────────────────────────────────────────────────────────
  {
    const { ctx, page } = await boot(1680, 1050);
    await page.waitForFunction(() => document.querySelectorAll(".gx-verse").length > 0, { timeout: 30000 });
    await sleep(400);

    const boot1 = await page.evaluate(() => ({
      verses: document.querySelectorAll(".gx-verse").length,
      title: document.querySelector(".gx-reader-title")?.textContent?.trim(),
      served: document.querySelector(".gx-served")?.textContent?.trim(),
      version: document.querySelector("[data-version]")?.textContent?.trim(),
      red: document.querySelectorAll(".gx-verse.is-red").length,
    }));
    check("reader renders verses", boot1.verses > 10, `${boot1.verses} vv · ${boot1.title}`);

    // Text purity: scripture never carries inline integers (Strong's
    // leakage from network sources) and John 1:1 reads as itself.
    const v1 = await page.evaluate(() => document.querySelector(".gx-verse")?.textContent?.replace(/^\d+/, "").trim());
    check("scripture text is pure", !!v1 && /^In the beginning was the Word/.test(v1) && !/[a-z]\d/.test(v1), JSON.stringify(v1?.slice(0, 60)));
    // …and carries no leaked margin notes anywhere in the chapter
    // (bolls <sup> notes read like "comprehended: or, did not admit").
    const notes = await page.evaluate(() =>
      [...document.querySelectorAll(".gx-verse")].filter((v) => /: or,/.test(v.textContent)).length);
    check("no margin notes leak into scripture", notes === 0, `${notes} verse(s) with ': or,'`);
    check("served-from chip is honest", !!boot1.served && /⇄/.test(boot1.served), boot1.served);
    check("version stamp visible in the Trace", !!boot1.version && /^v\d/.test(boot1.version), boot1.version);

    // Layout law: NOTHING may overlap the Trace — the shell reserves the strip.
    const clash = await page.evaluate(() => {
      const t = document.querySelector(".gx-trace").getBoundingClientRect();
      const els = document.elementsFromPoint(t.left + 4, t.top + t.height / 2);
      return els.some((el) => el.closest(".gx-reader") !== null);
    });
    check("shell law: scripture never under the Trace", !clash);

    // Chapter turn: next → verses change, scroll returns to top.
    await page.evaluate(() => document.querySelector(".gx-scripture").scrollTo({ top: 800 }));
    await page.click('button[aria-label="Next chapter"]');
    await page.waitForFunction(
      () => document.querySelector(".gx-reader-title")?.textContent?.includes("2"),
      { timeout: 20000 }
    );
    await sleep(500);
    const afterTurn = await page.evaluate(() => ({
      top: document.querySelector(".gx-scripture").scrollTop,
      verses: document.querySelectorAll(".gx-verse").length,
    }));
    check("chapter turn works + eye goes up", afterTurn.verses > 10 && afterTurn.top === 0, JSON.stringify(afterTurn));

    // Theme flip via the Trace — deterministic (opposite of current).
    const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.click('.gx-trace-btn[aria-label*="theme"]');
    await sleep(300);
    const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    check("theme flips", before !== after, `${before} → ${after}`);
    await shot(page, `desk-${after}`);
    await page.click('.gx-trace-btn[aria-label*="theme"]');
    await sleep(300);
    await shot(page, `desk-${before}`);

    // The door: ⌘K opens the veil, a TYPO'D ref still resolves, Enter jumps.
    await page.keyboard.down("Meta");
    await page.keyboard.press("k");
    await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "Jhon 3 16");
    await sleep(200);
    const row = await page.evaluate(() => document.querySelector(".gx-omni-row .gx-omni-label")?.textContent);
    check("omnibar forgives typos", row === "John 3:16", JSON.stringify(row));
    await shot(page, "desk-omnibar");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelector(".gx-reader-title")?.textContent?.replace(/\s+/g, " ").includes("John 3"),
      { timeout: 20000 }
    );
    await sleep(400);
    const focus = await page.evaluate(() => {
      const el = document.querySelector(".gx-verse.is-focus");
      const r = el?.getBoundingClientRect();
      return {
        veil: !!document.querySelector(".gx-veil"),
        focused: el?.querySelector(".gx-vn")?.textContent,
        inView: !!r && r.top >= 0 && r.bottom <= innerHeight,
      };
    });
    check("omnibar jumps + focused verse IN VIEW + veil closes", !focus.veil && focus.focused === "16" && focus.inView, JSON.stringify(focus));

    // No dead clicks: the v-stamp summons the what's-new whisper.
    await page.click("[data-version]");
    await sleep(300);
    const wsp = await page.evaluate(() => document.querySelector(".gx-whisper-update .gx-whisper-title")?.textContent);
    check("v-stamp click summons the notes whisper", !!wsp && /GENESIS/.test(wsp), JSON.stringify(wsp));
    await page.click(".gx-whisper-x");
    await sleep(200);

    // Arrow-key reading: → turns the chapter.
    const chBefore = await page.evaluate(() => document.querySelector(".gx-reader-title")?.textContent?.trim());
    await page.keyboard.press("ArrowRight");
    await sleep(600);
    const chAfter = await page.evaluate(() => document.querySelector(".gx-reader-title")?.textContent?.trim());
    check("→ turns the chapter", chBefore !== chAfter, `${chBefore} → ${chAfter}`);

    // Settings: open via omnibar; red-letter toggle edits the page LIVE.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "settings");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".gx-settings", { timeout: 5000 });
    await page.evaluate(() => { const s = document.querySelector(".gx-scripture"); if (s) s.scrollTop = 0; });
    // Jump somewhere red-lettered first (John 3 has words of Jesus).
    const redToggle = async () => page.evaluate(() => {
      document.querySelector('.gx-switch[aria-label*="Jesus"]').click();
    });
    const redCount = () => page.evaluate(() => document.querySelectorAll(".gx-verse.is-red").length);
    const redBefore = await redCount();
    await redToggle();
    await sleep(400);
    const redAfter = await redCount();
    check("settings edit the page live (red letters)", redBefore > 0 && redAfter === 0, `${redBefore} → ${redAfter}`);
    await redToggle();
    await sleep(200);
    await page.click(".gx-settings-close");

    // NO DARK PAGES: a recovered book requested under KJV routes to the
    // corpus that carries it, and the chip confesses the substitution.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "Apocalypse of Moses 1");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => /BEYOND/.test(document.querySelector(".gx-served")?.textContent || "") &&
            document.querySelectorAll(".gx-verse").length > 0,
      { timeout: 20000 }
    );
    const ghost = await page.evaluate(() => ({
      title: document.querySelector(".gx-reader-title")?.textContent?.replace(/\s+/g, " ").trim(),
      served: document.querySelector(".gx-served")?.textContent?.trim(),
      dark: !!document.querySelector(".gx-reader-dark"),
    }));
    check("no dark pages: ap-mos serves via BEYOND", !ghost.dark && /Apocalypse of Moses/.test(ghost.title || ""), JSON.stringify(ghost));

    // …and the standard Apocrypha serves via Charles 1913.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "Tobit 1");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => /CHARLES/.test(document.querySelector(".gx-served")?.textContent || ""),
      { timeout: 20000 }
    );
    check("no dark pages: Tobit serves via CHARLES", true);

    // The witness heard all of this and can show its ledger.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "witness");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".gx-witness", { timeout: 5000 });
    const heard = await page.evaluate(() =>
      [...document.querySelectorAll(".gx-witness-kind")].map((k) => k.textContent));
    check("the witness heard jumps and veils", heard.includes("jump") && heard.includes("veil"), JSON.stringify(heard));
    await page.click(".gx-witness-close");
    await sleep(200);

    // THE THREADS: focused verse → Torrey's cross-references, click walks.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "Genesis 1:1");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => /Genesis/.test(document.querySelector(".gx-reader-title")?.textContent || ""), { timeout: 20000 });
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "threads");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".gx-thread", { timeout: 15000 });
    const threads = await page.evaluate(() => document.querySelectorAll(".gx-thread").length);
    check("threads: Gen 1:1 has many", threads > 5, `${threads} threads`);
    await page.evaluate(() => document.querySelector(".gx-thread").click());
    await page.waitForFunction(() => !/Genesis 1/.test(document.querySelector(".gx-reader-title")?.textContent || ""), { timeout: 20000 });
    check("threads: clicking a thread walks there", true);

    // MARKS: B keeps the focused verse; the panel lists it.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "John 3:16");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => !!document.querySelector(".gx-verse.is-focus"), { timeout: 20000 });
    await page.keyboard.press("b");
    await sleep(300);
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "marks");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".gx-mark-ref", { timeout: 5000 });
    const mark = await page.evaluate(() => document.querySelector(".gx-mark-ref")?.textContent);
    check("marks: B kept John 3:16", mark === "John 3:16", JSON.stringify(mark));
    await page.click(".gx-marks-close");

    // SEARCH: omnibar free text → panel → hits → click reads.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "good shepherd");
    await sleep(300);
    const searchRow = await page.evaluate(() => document.querySelector(".gx-omni-row .gx-omni-label")?.textContent);
    check("omnibar: free text offers Scripture search", /Search Scripture/.test(searchRow || ""), JSON.stringify(searchRow));
    await page.keyboard.press("Enter");
    await page.waitForSelector(".gx-hit-ref", { timeout: 20000 });
    // "good shepherd" appears exactly 3× in the KJV (John 10) — the
    // count asserts truth, not abundance.
    const hits = await page.evaluate(() => document.querySelectorAll(".gx-hit").length);
    check("search: hits arrive", hits >= 3, `${hits} hits`);
    await page.click(".gx-search-close");

    // COMPARE: focused verse across corpora.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "compare");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".gx-lane", { timeout: 30000 });
    const lanes = await page.evaluate(() => ({
      n: document.querySelectorAll(".gx-lane").length,
      names: [...document.querySelectorAll(".gx-lane-name")].map((e) => e.textContent),
    }));
    check("compare: several voices incl. Greek NT", lanes.n >= 4 && lanes.names.some((n) => /SBL/.test(n)), JSON.stringify(lanes));
    await page.click(".gx-compare-close");
    await sleep(200);

    // THE ORACLE: fresh profile shows the beginner setup — both engine
    // cards, gated key button, and an HONEST probe failure (no Ollama in CI).
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "oracle");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".gx-oracle-setup", { timeout: 5000 });
    const setup = await page.evaluate(() => ({
      cards: document.querySelectorAll(".gx-oracle-card").length,
      cloudGated: [...document.querySelectorAll(".gx-oracle-btn")].find((b) => /USE CLOUD/.test(b.textContent))?.disabled,
    }));
    check("oracle: setup offers frontier + local, key button gated", setup.cards === 2 && setup.cloudGated === true, JSON.stringify(setup));
    await page.evaluate(() => [...document.querySelectorAll(".gx-oracle-btn")].find((b) => /TEST/.test(b.textContent)).click());
    await page.waitForFunction(() => document.querySelector(".gx-oracle-probe.is-fail, .gx-oracle-probe.is-ok"), { timeout: 10000 });
    const probe = await page.evaluate(() => document.querySelector(".gx-oracle-probe")?.className);
    check("oracle: probe answers honestly", /is-fail|is-ok/.test(probe || ""), probe);
    // Keys persist: paste an xAI-shaped key, reload, it's still there and
    // recognized (the provider is detected by key shape).
    await page.type(".gx-oracle-key", "xai-persistence-proof");
    await sleep(500); // debounce persist
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => window.__CODEX_READY__ === true, { timeout: 30000 });
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "oracle");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".gx-oracle-key", { timeout: 5000 });
    const persisted = await page.evaluate(() => ({
      key: document.querySelector(".gx-oracle-key")?.value,
      hint: document.querySelector(".gx-oracle-keyhint")?.textContent,
      enabled: ![...document.querySelectorAll(".gx-oracle-btn")].find((b) => /USE CLOUD/.test(b.textContent))?.disabled,
    }));
    check("oracle: key persists across reload + provider recognized",
      persisted.key === "xai-persistence-proof" && /xAI/.test(persisted.hint || "") && persisted.enabled === true,
      JSON.stringify(persisted));
    await page.evaluate(() => { const i = document.querySelector(".gx-oracle-key"); i.value = ""; i.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.click(".gx-oracle-close");
    await sleep(200);

    // Return to canon ground so the shelves spec exercises a book every
    // English corpus carries.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "John 1");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => /John/.test(document.querySelector(".gx-reader-title")?.textContent || ""),
      { timeout: 20000 }
    );

    // The shelves: omnibar → library panel → switch to WEB → honest chip.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "library");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".gx-instrument .gx-shelf", { timeout: 5000 });
    await page.evaluate(() => {
      const web = [...document.querySelectorAll(".gx-shelf")].find((b) => /World English/.test(b.textContent));
      web.click();
    });
    await page.waitForFunction(
      () => /WEB/.test(document.querySelector(".gx-served")?.textContent || ""),
      { timeout: 20000 }
    );
    const shelf = await page.evaluate(() => ({
      active: [...document.querySelectorAll(".gx-shelf.is-active")].map((b) => b.querySelector(".gx-shelf-name")?.textContent)[0],
      served: document.querySelector(".gx-served")?.textContent?.trim(),
    }));
    check("library switches the primary translation (WEB now baked)", /World English/.test(shelf.active || "") && /bundle · WEB/.test(shelf.served || ""), JSON.stringify(shelf));

    // #98: the Oracle's food — the whole canon is baked and buildable.
    const canon = await page.evaluate(async () => {
      const r = await fetch("data/bibles/web.json");
      const j = await r.json();
      const verses = Object.values(j.chapters).reduce((a, c) => a + c.length, 0);
      const chars = Object.values(j.chapters).flat().reduce((a, v) => a + v.text.length, 0);
      return { verses, approxTokens: Math.round(chars / 4) };
    });
    check("whole canon baked for frontier context", canon.verses === 31105 && canon.approxTokens > 900_000, JSON.stringify(canon));
    await shot(page, "desk-library");
    await page.click('.gx-library-close');
    await sleep(200);
    const panelGone = await page.evaluate(() => !document.querySelector(".gx-instrument"));
    check("library closes", panelGone);

    // THE DOSSIER — entities are first-class. Genesis 14, the Melchizedek
    // showcase: a name in the sacred column becomes a walkable door.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "Genesis 14");
    await sleep(250);
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => /Genesis\s*14\b/.test(document.querySelector(".gx-reader-title")?.textContent?.replace(/\s+/g, " ") || ""),
      { timeout: 20000 }
    );
    await page.waitForSelector(".gx-entity", { timeout: 15000 });
    const chips = await page.evaluate(() => {
      const els = [...document.querySelectorAll(".gx-entity")];
      return { count: els.length, hasMel: els.some((e) => e.textContent === "Melchizedek") };
    });
    check("dossier: entity underlines render in the sacred column", chips.count > 3 && chips.hasMel, JSON.stringify(chips));

    // Tap Melchizedek → the Dossier, with relations, an honest CONTESTED
    // stamp, and a provenance footer.
    await page.evaluate(() => [...document.querySelectorAll(".gx-entity")].find((e) => e.textContent === "Melchizedek").click());
    await page.waitForSelector(".gx-dossier .gx-dos-name", { timeout: 5000 });
    const dos = await page.evaluate(() => ({
      name: document.querySelector(".gx-dos-name")?.textContent,
      rels: document.querySelectorAll(".gx-dos-rel").length,
      mentions: document.querySelectorAll(".gx-dos-mention").length,
      contested: !!document.querySelector(".gx-dos-contested"),
      prov: !!document.querySelector(".gx-dos-prov"),
    }));
    check("dossier: Melchizedek opens — relations, CONTESTED, provenance",
      dos.name === "Melchizedek" && dos.rels >= 1 && dos.contested && dos.prov, JSON.stringify(dos));
    await shot(page, "desk-dossier");

    // The graph is walkable: a relation to Abraham opens Abraham's dossier.
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".gx-dos-rel-who")].find((x) => /Abraham/.test(x.textContent));
      b.click();
    });
    await page.waitForFunction(() => document.querySelector(".gx-dos-name")?.textContent === "Abraham", { timeout: 5000 });
    check("dossier: relations walk (Melchizedek → Abraham)", true);

    // A mention is a door back into scripture — clicking it moves the reader.
    const target = await page.evaluate(() => document.querySelector(".gx-dos-mention .gx-dos-mention-ref")?.textContent);
    await page.evaluate(() => document.querySelector(".gx-dos-mention").click());
    await page.waitForFunction(
      (t) => document.querySelector(".gx-reader-title")?.textContent?.replace(/\s+/g, " ").includes(t.replace(/:.*/, "").trim()),
      { timeout: 15000 }, target
    );
    check("dossier: a mention navigates the reader", true, target);

    // The omnibar learns entities: a named person outranks a fuzzy book guess.
    await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
    await page.waitForSelector(".gx-omni-input", { timeout: 5000 });
    await page.type(".gx-omni-input", "melchiz");
    await sleep(250);
    const topRow = await page.evaluate(() => document.querySelector(".gx-omni-row .gx-omni-label")?.textContent);
    check("omnibar: an entity outranks a fuzzy book guess", topRow === "Melchizedek", JSON.stringify(topRow));
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector(".gx-dos-name")?.textContent === "Melchizedek", { timeout: 5000 });
    check("omnibar: entity row opens the Dossier", true);
    await page.click(".gx-dossier-close");
    await sleep(200);

    check("desk: zero js errors", page.jsErrors.length === 0, JSON.stringify(page.jsErrors.slice(0, 3)));
    await ctx.close();
  }

  // ── palm ─────────────────────────────────────────────────────────────
  {
    const { ctx, page } = await boot(390, 844, true);
    await page.waitForFunction(() => document.querySelectorAll(".gx-verse").length > 0, { timeout: 30000 });
    await sleep(400);
    const hscroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check("palm: no horizontal scroll leak", hscroll <= 1, `${hscroll}px`);
    const clash = await page.evaluate(() => {
      const t = document.querySelector(".gx-trace")?.getBoundingClientRect();
      if (!t) return false;
      return document.elementsFromPoint(t.left + 4, t.top + t.height / 2)
        .some((el) => el.closest(".gx-reader") !== null);
    });
    check("palm: scripture never under the Trace", !clash);
    await shot(page, "palm-dark");
    check("palm: zero js errors", page.jsErrors.length === 0, JSON.stringify(page.jsErrors.slice(0, 3)));
    await ctx.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`[smoke] ${failed.length ? "FAIL — " + failed.length + "/" + results.length + " failed" : "ALL GREEN — " + results.length + " checks"}`);
  process.exit(failed.length ? 1 : 0);
} catch (e) {
  console.error("[smoke] CRASH", e);
  process.exit(1);
} finally {
  await browser.close();
}
