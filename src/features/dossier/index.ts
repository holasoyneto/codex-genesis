import { registerFeature } from "@/kernel/registry";
import { openPanel } from "@/kernel/store";
import { loadOntology } from "@/engine/ontology";
import { Dossier } from "./Dossier";

// Warm the ontology at boot so the reader's chips and the omnibar's entity
// rows are ready before the reader asks — a small, one-time read.
void loadOntology().catch(() => { /* dark-safe: the app runs without it */ });

registerFeature({
  id: "dossier",
  glyph: "☖",
  title: "Dossier",
  surfaces: { main: Dossier },
  commands: [
    { phrase: "dossier", hint: "the entity under study", run: () => openPanel("dossier") },
  ],
});
