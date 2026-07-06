// Panel seeds — a tiny hand-off lane. A surface may be opened WITH a
// payload ("ask the Oracle about Jhn 3:16") but panels carry no payload in
// the store (they are surfaces, not messages); the seed waits here and the
// panel takes it exactly once on mount.

const seeds = new Map<string, string>();

export function setSeed(feature: string, value: string): void {
  seeds.set(feature, value);
}

export function takeSeed(feature: string): string | null {
  const v = seeds.get(feature) ?? null;
  seeds.delete(feature);
  return v;
}
