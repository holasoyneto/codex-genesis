// The Oracle's engines — two ways to think, both honest about which ran
// and about HOW MUCH scripture they were given.
//
//   local  — any OpenAI-compatible server on the user's machine (default
//            Ollama). Private; receives the open chapter.
//   cloud  — the USER'S OWN key, browser-direct, no middleman. CODEX asks
//            the strongest model the key can see and feeds it the deepest
//            context it can hold — a 1M-token frontier mind receives THE
//            WHOLE CANON; smaller minds get testament, book, or chapter.
//
// The Oracle can err — Scripture is the source.

import { getState } from "@/kernel/store";
import { record } from "@/kernel/witness";
import { buildContext, shallower, type ContextLevel } from "./context";
import { bookById, getChapter } from "./corpus";

export interface OracleAnswer {
  text: string;
  engine: "local" | "cloud";
  model: string;
  context: { level: ContextLevel; approxTokens: number };
}

const SYSTEM = [
  "You are the Oracle inside CODEX, a Bible study instrument.",
  "Scripture is provided to you directly — ground every claim in it and",
  "cite book, chapter and verse. Present contested interpretations as",
  "contested; distinguish what the text says from tradition and speculation.",
  "You are a study companion, not an authority — Scripture is the source.",
  "Be concise and warm. Answer in the user's language.",
].join(" ");

async function positionLine(): Promise<string> {
  const { cursor } = getState();
  const book = bookById.get(cursor.bookId);
  let line = `The reader is at ${book?.name ?? cursor.bookId} ${cursor.chapter}`;
  if (cursor.verse != null) {
    try {
      const ch = await getChapter(cursor.translation, cursor.bookId, cursor.chapter);
      const v = ch.verses.find((x) => x.n === cursor.verse);
      if (v) line += `, focused on verse ${v.n}: "${v.text}"`;
    } catch { /* position is a courtesy, not a dependency */ }
  }
  return line + ".";
}

const sizeError = (e: unknown) => /413|token|length|context|too.large|payload/i.test(String(e));

// ── local (OpenAI-compatible: Ollama, LM Studio, Atelier…) ─────────────
export async function probeLocal(url: string): Promise<{ ok: boolean; model?: string; why?: string }> {
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/models`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return { ok: false, why: `answered ${r.status}` };
    const j = (await r.json()) as { data?: { id: string }[] };
    const model = j.data?.[0]?.id;
    return model ? { ok: true, model } : { ok: false, why: "no models installed yet" };
  } catch (e) {
    return { ok: false, why: String(e).slice(0, 120) };
  }
}

// ── cloud provider registry (all verified browser-CORS) ───────────────
export interface CloudProvider {
  id: string;
  label: string;
  base: string;                       // OpenAI-compatible base ("" = Anthropic native)
  budget: number;                     // context tokens the tier can hold (Anthropic: discovered live)
  pick: (models: string[]) => string;
}

const newest = (ids: string[]) => [...ids].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];

const PROVIDERS: { prefix: string; p: CloudProvider }[] = [
  { prefix: "sk-ant-", p: { id: "anthropic", label: "Anthropic (Claude)", base: "", budget: 200_000, pick: () => ANTHROPIC_FALLBACK } },
  { prefix: "xai-", p: { id: "xai", label: "xAI (Grok)", base: "https://api.x.ai/v1", budget: 200_000,
    pick: (m) => newest(m.filter((x) => /^grok/.test(x))) ?? m[0] } },
  { prefix: "AIza", p: { id: "gemini", label: "Google (Gemini)", base: "https://generativelanguage.googleapis.com/v1beta/openai", budget: 1_050_000,
    pick: (m) => newest(m.filter((x) => /gemini-[\d.]+-pro$/.test(x.replace(/^models\//, ""))))
      ?? newest(m.filter((x) => /gemini-[\d.]+-flash$/.test(x.replace(/^models\//, "")))) ?? m[0] } },
  { prefix: "gsk_", p: { id: "groq", label: "Groq", base: "https://api.groq.com/openai/v1", budget: 100_000,
    pick: (m) => newest(m.filter((x) => /llama|deepseek|qwen/.test(x))) ?? m[0] } },
  { prefix: "sk-or-", p: { id: "openrouter", label: "OpenRouter", base: "https://openrouter.ai/api/v1", budget: 120_000,
    pick: () => "openrouter/auto" } },
];

export function cloudProvider(key: string): CloudProvider | null {
  return PROVIDERS.find(({ prefix }) => key.startsWith(prefix))?.p ?? null;
}

// ── Anthropic: discover the strongest mind AND its true window ────────
const ANTHROPIC_FALLBACK = "claude-opus-4-8";
const ANTHROPIC_RANK = [/^claude-mythos/, /^claude-fable/, /^claude-opus/, /^claude-sonnet/];
let anthDiscovered: { key: string; model: string; budget: number } | null = null;

const anthHeaders = (key: string) => ({
  "Content-Type": "application/json",
  "x-api-key": key,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
});

async function discoverAnthropic(key: string): Promise<{ model: string; budget: number }> {
  if (anthDiscovered?.key === key) return anthDiscovered;
  try {
    const r = await fetch("https://api.anthropic.com/v1/models", { headers: anthHeaders(key) });
    if (!r.ok) return { model: ANTHROPIC_FALLBACK, budget: 200_000 };
    const data = ((await r.json()) as { data: { id: string; max_input_tokens?: number }[] }).data;
    for (const rank of ANTHROPIC_RANK) {
      const tier = data.filter((m) => rank.test(m.id));
      if (tier.length) {
        const id = newest(tier.map((m) => m.id))!;
        const budget = tier.find((m) => m.id === id)?.max_input_tokens ?? 200_000;
        anthDiscovered = { key, model: id, budget };
        return anthDiscovered;
      }
    }
    return { model: data[0]?.id ?? ANTHROPIC_FALLBACK, budget: 200_000 };
  } catch {
    return { model: ANTHROPIC_FALLBACK, budget: 200_000 };
  }
}

async function askAnthropic(key: string, question: string): Promise<OracleAnswer> {
  const { model, budget } = await discoverAnthropic(key);
  let ctx = await buildContext(getState().cursor, budget);
  const position = await positionLine();

  for (;;) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthHeaders(key),
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        // The canon block is cached server-side (1h) — the first question
        // pays for the whole Bible once; the rest of the hour reads it at
        // a tenth of the price.
        system: [
          { type: "text", text: SYSTEM },
          { type: "text", text: ctx.text, cache_control: { type: "ephemeral", ttl: "1h" } },
        ],
        messages: [{ role: "user", content: `${position}\n\n${question}` }],
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      const lower = shallower(ctx.level);
      if ((r.status === 400 || r.status === 413) && sizeError(body) && lower) {
        ctx = await buildContext(getState().cursor, ctx.approxTokens / 3);
        continue;
      }
      if (r.status === 401) throw new Error("the key was not accepted (401) — check it in Oracle setup");
      throw new Error(`cloud engine: ${r.status}`);
    }
    const j = (await r.json()) as { stop_reason: string; content: { type: string; text?: string }[] };
    const meta = { engine: "cloud" as const, model, context: { level: ctx.level, approxTokens: ctx.approxTokens } };
    if (j.stop_reason === "refusal") return { text: "The Oracle declined this question.", ...meta };
    return { text: j.content.filter((b) => b.type === "text").map((b) => b.text).join("\n"), ...meta };
  }
}

// ── generic OpenAI-compatible ask (xai/gemini/groq/openrouter/local) ───
async function askCompat(
  base: string, headers: Record<string, string>, model: string,
  question: string, budget: number, engine: "local" | "cloud"
): Promise<OracleAnswer> {
  let ctx = await buildContext(getState().cursor, budget);
  const position = await positionLine();

  for (;;) {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `${ctx.text}\n\n${position}\n\n${question}` },
        ],
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      const lower = shallower(ctx.level);
      if ((r.status === 400 || r.status === 413 || r.status === 422) && sizeError(body) && lower) {
        ctx = await buildContext(getState().cursor, ctx.approxTokens / 3);
        continue;
      }
      throw new Error(`${engine} engine (${model}): ${r.status}`);
    }
    const j = (await r.json()) as { choices: { message: { content: string } }[] };
    return {
      text: j.choices[0]?.message?.content ?? "",
      engine, model: model.replace(/^models\//, ""),
      context: { level: ctx.level, approxTokens: ctx.approxTokens },
    };
  }
}

async function askLocal(question: string): Promise<OracleAnswer> {
  const { localUrl } = getState().settings.oracle;
  const base = localUrl.replace(/\/$/, "");
  const probe = await probeLocal(base);
  if (!probe.ok || !probe.model) throw new Error("local engine unreachable — " + (probe.why ?? ""));
  return askCompat(base, {}, probe.model, question, 6_000, "local");
}

async function askCloud(question: string): Promise<OracleAnswer> {
  const key = getState().settings.oracle.anthropicKey;
  const p = cloudProvider(key);
  if (!p) throw new Error("no usable key — paste a key from Gemini, Groq, OpenRouter, Anthropic or xAI in Oracle setup");
  if (p.id === "anthropic") return askAnthropic(key, question);
  const auth = { Authorization: `Bearer ${key}`, "X-Title": "CODEX" };
  const models = await fetch(`${p.base}/models`, { headers: auth });
  if (models.status === 401 || models.status === 403) throw new Error(`the ${p.label} key was not accepted — check it in Oracle setup`);
  if (!models.ok) throw new Error(`cloud engine (${p.id} models): ${models.status}`);
  const list = ((await models.json()) as { data: { id: string }[] }).data.map((m) => m.id);
  const model = p.pick(list);
  if (!model) throw new Error(`this ${p.label} key can see no models`);
  return askCompat(p.base, auth, model, question, p.budget, "cloud");
}

// ── the door ───────────────────────────────────────────────────────────
export async function askOracle(question: string): Promise<OracleAnswer> {
  const { engine } = getState().settings.oracle;
  if (!engine) throw new Error("no engine chosen — open Oracle setup");
  try {
    const out = engine === "local" ? await askLocal(question) : await askCloud(question);
    record("oracle", `${engine} ok · ${out.model} · ${out.context.level}`);
    return out;
  } catch (e) {
    record("oracle", `${engine} failed: ${String(e).slice(0, 80)}`);
    throw e;
  }
}
