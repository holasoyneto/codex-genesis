// Canon-tradition metadata — which traditions receive which books.
// Imported (metadata only) from the codex-open-canon registry, with
// provenance. Factual membership tags; no readings travel with them.

import type { ProvenanceMeta } from "@/kernel/Provenance";

export type Tradition =
  | "tanakh" | "protestant" | "catholic" | "eastern_orthodox"
  | "ethiopian_tewahedo" | "lds" | "extra";

export const TRADITION_LABEL: Record<string, string> = {
  tanakh: "TANAKH",
  protestant: "PROTESTANT",
  catholic: "CATHOLIC",
  eastern_orthodox: "ORTHODOX",
  ethiopian_tewahedo: "TEWAHEDO",
  lds: "LDS",
  extra: "BEYOND",
};

interface TraditionsFile {
  _meta: ProvenanceMeta;
  books: { code: string; name: string; canon_tags: string[] }[];
}

let loading: Promise<TraditionsFile> | null = null;
let loaded: TraditionsFile | null = null;

export function getLoadedTraditions(): TraditionsFile | null { return loaded; }

export function loadTraditions(): Promise<TraditionsFile> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}data/traditions.json`)
      .then((r) => { if (!r.ok) throw new Error(`traditions: ${r.status}`); return r.json(); })
      .then((j: TraditionsFile) => { loaded = j; return j; });
  }
  return loading;
}

/** tradition tags for a book id, [] when the registry is silent. */
export function tagsFor(bookId: string): string[] {
  return loaded?.books.find((b) => b.code === bookId)?.canon_tags ?? [];
}
