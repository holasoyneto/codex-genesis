// Release notes for the current version — surfaced through the whisper
// lane (once per update on boot, and on demand from the Trace v-stamp).
// The version NUMBER itself is computed from package.json at build time.

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

export const RELEASE_NOTES: string[] = [
  "THE NAME IS EARNED. Every defect from the v0.9.0 audit is fixed: one close control per window, the dock/pill can never occlude the last verse, the Galaxy auto-fits and centers the canon ring with zoom-dependent label culling, the Dossier sits on opaque glass, and the Library reads as quiet single-line rows.",
  "Investigations: case files that accumulate evidence — a verse, an entity, a search hit, an Oracle answer — from anywhere in the app, with inline notes and a clean exportable brief. The Trail renders your jump ledger as a walkable ribbon; save it to a case in one click.",
  "Missions: give the Oracle a research goal and it plans, works the kernel's own tools step by step with a visible feed, and returns a structured artifact you can save. Council: when a local AND a cloud engine are both reachable, ask both at once — agreements and disagreements shown honestly as data, never blended.",
  "The Galaxy learns FAMILIES: `families gen.1.1` colors the communities around a place using the same label-propagation engine that powers PATH and NEAR.",
  "The work leaves the app: share an investigation as a compressed URL — no server, no accounts, the receiver's app rehydrates it read-only with a 'save a copy' button. Export or import your whole store as a file. Omnibar pipes chain verbs: `threads jhn 1:1 | compare | mark`.",
  "A quieter, more honest interface: a focus trap in every modal surface, aria-labels on every icon-only control, a subtle hover-lift throughout — all within the same 180/140ms motion language, respecting reduced-motion and reduced-transparency.",
  "THE GLASS CATHEDRAL (v0.9.0). The chrome molts into layered liquid glass — frosted windows, a glowing door, aurora walls — while scripture stays serif and serene, untouched.",
  "THE GALAXY: the whole canon as a sky. Books as arcs, verses as stars, entities as gold bodies; `path gen.1.1 rev.21.1` burns a gold trail, `near isa.53.5` ignites a neighborhood, and every star turns the reader.",
  "The Oracle becomes an analyst: it streams, remembers the conversation, drives the app's own engines through visible tool calls, and every quoted reference is checked verbatim — mismatches wear ⚠ UNVERIFIED.",
];
