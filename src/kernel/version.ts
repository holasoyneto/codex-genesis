// Release notes for the current version — surfaced through the whisper
// lane (once per update on boot, and on demand from the Trace v-stamp).
// The version NUMBER itself is computed from package.json at build time.

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

export const RELEASE_NOTES: string[] = [
  "V3.1 — THE ENGINE ROOM. On the Mac app, CODEX now starts your local mind itself: it finds the MLX models already on your disk, wakes mlx_lm.server with one press, and the Oracle is thinking locally — no Terminal, ever. STOP and switch just as easily.",
  "THE READER BECOMES THE STUDY. Tap verses to gather them — shift-click sweeps a range on desk — and a quiet bar rises: COPY with reference, MARK them all, COMPARE the exact selection across every voice, ASK the Oracle about precisely those words, or file them to a CASE.",
  "VERSE ART, ACTUALLY. The gallery now truly fetches from Wikimedia Commons — a masonry wall of depictions with artist attributions and a lightbox.",
  "GENESIS V3 — THE WHOLE LIBRARY, EVERYWHERE. Every built-in voice now ships inside the app: KJV, ASV and Young's Literal join WEB, the Hebrew Tanakh, the Greek NT, the Apocrypha, Enoch, the Recovered Books and the Open Canon — all 100% offline, on desk, palm and the native apps.",
  "The Oracle finds the minds already on your machine: AUTOFIND sweeps Ollama, Apple MLX, LM Studio and llama.cpp, lists every model each serves, and activates or switches with one press. SELECT FOLDER scans any directory for .gguf and MLX models on disk.",
  "The study returns: PLANS (daily reading plans with progress), STRONG'S (Hebrew & Greek concordance), WORD STUDY (frequency, first occurrences, every verse), GEMATRIA (Hebrew, Greek and English systems), DICTIONARY (Easton's, aware of the open chapter), and VERSE ART — depictions of the passage before you.",
  "THE NAME IS EARNED. Every defect from the v0.9.0 audit is fixed: one close control per window, the dock/pill can never occlude the last verse, the Galaxy auto-fits and centers the canon ring with zoom-dependent label culling, the Dossier sits on opaque glass, and the Library reads as quiet single-line rows.",
  "Investigations: case files that accumulate evidence — a verse, an entity, a search hit, an Oracle answer — from anywhere in the app, with inline notes and a clean exportable brief. The Trail renders your jump ledger as a walkable ribbon; save it to a case in one click.",
  "THE ORACLE becomes the one door to every AI mind. A single panel with three modes — ASK a frontier model with receipts, COUNCIL two minds at once with disagreement shown as data, and MISSION a multi-step research goal, worked and reported — and THE MIND drawer, where every engine on your Mac or in the cloud is chosen, switched and named. Switching minds mid-thread is a feature; every turn stamps the engine that answered it.",
  "The Galaxy learns FAMILIES: `families gen.1.1` colors the communities around a place using the same label-propagation engine that powers PATH and NEAR.",
  "The work leaves the app: share an investigation as a compressed URL — no server, no accounts, the receiver's app rehydrates it read-only with a 'save a copy' button. Export or import your whole store as a file. Omnibar pipes chain verbs: `threads jhn 1:1 | compare | mark`.",
  "A quieter, more honest interface: a focus trap in every modal surface, aria-labels on every icon-only control, a subtle hover-lift throughout — all within the same 180/140ms motion language, respecting reduced-motion and reduced-transparency.",
  "THE GLASS CATHEDRAL (v0.9.0). The chrome molts into layered liquid glass — frosted windows, a glowing door, aurora walls — while scripture stays serif and serene, untouched.",
  "THE GALAXY: the whole canon as a sky. Books as arcs, verses as stars, entities as gold bodies; `path gen.1.1 rev.21.1` burns a gold trail, `near isa.53.5` ignites a neighborhood, and every star turns the reader.",
  "The Oracle becomes an analyst: it streams, remembers the conversation, drives the app's own engines through visible tool calls, and every quoted reference is checked verbatim — mismatches wear ⚠ UNVERIFIED.",
];
