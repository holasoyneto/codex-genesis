// The Oracle's engines — two ways to think, both honest about which ran.
//
//   local  — any OpenAI-compatible server on the user's machine. Default is
//            Ollama (http://localhost:11434/v1): one installer, no account,
//            nothing leaves the device.
//   cloud  — the Anthropic API with the USER'S OWN key, sent directly from
//            the browser. The key lives in this device's storage only;
//            there is no middleman server.
//
// The Oracle can err — Scripture is the source. Every answer carries the
// engine that produced it.

import { getState } from "@/kernel/store";
import { record } from "@/kernel/witness";

export interface OracleAnswer {
  text: string;
  engine: "local" | "cloud";
  model: string;
}

const SYSTEM = [
  "You are the Oracle inside CODEX, a Bible study instrument.",
  "Answer questions about Scripture with scholarly honesty: cite book,",
  "chapter and verse for every claim; present contested interpretations as",
  "contested; distinguish what the text says from tradition and speculation.",
  "You are a study companion, not an authority — Scripture is the source.",
  "Be concise and warm. Answer in the user's language.",
].join(" ");

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

async function askLocal(question: string, context: string): Promise<OracleAnswer> {
  const { localUrl } = getState().settings.oracle;
  const base = localUrl.replace(/\/$/, "");
  const probe = await probeLocal(base);
  if (!probe.ok || !probe.model) throw new Error("local engine unreachable — " + (probe.why ?? ""));
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: probe.model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `${context}\n\n${question}` },
      ],
    }),
  });
  if (!r.ok) throw new Error(`local engine: ${r.status}`);
  const j = (await r.json()) as { choices: { message: { content: string } }[] };
  return { text: j.choices[0]?.message?.content ?? "", engine: "local", model: probe.model };
}

// ── cloud (the USER'S OWN key, browser-direct — no middleman) ─────────
// The key's shape names its provider. Every provider here was verified to
// answer browser CORS; Gemini, Groq and OpenRouter carry FREE tiers.
export interface CloudProvider {
  id: string;
  label: string;
  free: boolean;
  base: string;                       // OpenAI-compatible base URL ("" = Anthropic native)
  pick: (models: string[]) => string; // choose a model from what the key can see
}

const newest = (ids: string[]) => [...ids].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];

const PROVIDERS: { prefix: string; p: CloudProvider }[] = [
  { prefix: "sk-ant-", p: { id: "anthropic", label: "Anthropic (Claude)", free: false, base: "", pick: () => ANTHROPIC_MODEL } },
  { prefix: "xai-", p: { id: "xai", label: "xAI (Grok)", free: false, base: "https://api.x.ai/v1",
    pick: (m) => newest(m.filter((x) => /^grok/.test(x))) ?? m[0] } },
  { prefix: "AIza", p: { id: "gemini", label: "Google (Gemini)", free: true,
    base: "https://generativelanguage.googleapis.com/v1beta/openai",
    // frontier first: newest pro, then newest flash
    pick: (m) => newest(m.filter((x) => /gemini-[\d.]+-pro$/.test(x.replace(/^models\//, ""))))
      ?? newest(m.filter((x) => /gemini-[\d.]+-flash$/.test(x.replace(/^models\//, "")))) ?? m[0] } },
  { prefix: "gsk_", p: { id: "groq", label: "Groq", free: true, base: "https://api.groq.com/openai/v1",
    pick: (m) => newest(m.filter((x) => /llama|deepseek|qwen/.test(x))) ?? m[0] } },
  { prefix: "sk-or-", p: { id: "openrouter", label: "OpenRouter", free: true, base: "https://openrouter.ai/api/v1",
    pick: () => "openrouter/auto" } },
];

export function cloudProvider(key: string): CloudProvider | null {
  return PROVIDERS.find(({ prefix }) => key.startsWith(prefix))?.p ?? null;
}

const ANTHROPIC_MODEL = "claude-opus-4-8"; // fallback when discovery fails

// The strongest mind the key can see, discovered live — built for the
// moment the next frontier model ships. Mythos > Fable > newest Opus >
// newest Sonnet > whatever else answers.
const ANTHROPIC_RANK = [/^claude-mythos/, /^claude-fable/, /^claude-opus/, /^claude-sonnet/];
let anthropicPicked: { key: string; model: string } | null = null;

async function pickAnthropicModel(key: string): Promise<string> {
  if (anthropicPicked?.key === key) return anthropicPicked.model;
  try {
    const r = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
    });
    if (!r.ok) return ANTHROPIC_MODEL;
    const ids = ((await r.json()) as { data: { id: string }[] }).data.map((m) => m.id);
    for (const rank of ANTHROPIC_RANK) {
      const tier = ids.filter((id) => rank.test(id));
      if (tier.length) {
        const model = newest(tier)!;
        anthropicPicked = { key, model };
        return model;
      }
    }
    return ids[0] ?? ANTHROPIC_MODEL;
  } catch {
    return ANTHROPIC_MODEL;
  }
}

async function askAnthropic(key: string, question: string, context: string): Promise<OracleAnswer> {
  const model = await pickAnthropicModel(key);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: "user", content: `${context}\n\n${question}` }],
    }),
  });
  if (!r.ok) {
    if (r.status === 401) throw new Error("the key was not accepted (401) — check it in Oracle setup");
    throw new Error(`cloud engine: ${r.status}`);
  }
  const j = (await r.json()) as { stop_reason: string; content: { type: string; text?: string }[] };
  if (j.stop_reason === "refusal") {
    return { text: "The Oracle declined this question.", engine: "cloud", model };
  }
  const text = j.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return { text, engine: "cloud", model };
}

async function askOpenAICompat(p: CloudProvider, key: string, question: string, context: string): Promise<OracleAnswer> {
  const auth = { Authorization: `Bearer ${key}`, "X-Title": "CODEX" };
  const models = await fetch(`${p.base}/models`, { headers: auth });
  if (models.status === 401 || models.status === 403) throw new Error(`the ${p.label} key was not accepted — check it in Oracle setup`);
  if (!models.ok) throw new Error(`cloud engine (${p.id} models): ${models.status}`);
  const list = ((await models.json()) as { data: { id: string }[] }).data.map((m) => m.id);
  const model = p.pick(list);
  if (!model) throw new Error(`this ${p.label} key can see no models`);

  const r = await fetch(`${p.base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `${context}\n\n${question}` },
      ],
    }),
  });
  if (!r.ok) throw new Error(`cloud engine (${p.id}): ${r.status}`);
  const j = (await r.json()) as { choices: { message: { content: string } }[] };
  return { text: j.choices[0]?.message?.content ?? "", engine: "cloud", model: model.replace(/^models\//, "") };
}

async function askCloud(question: string, context: string): Promise<OracleAnswer> {
  const key = getState().settings.oracle.anthropicKey;
  const p = cloudProvider(key);
  if (!p) throw new Error("no usable key — paste a key from Gemini, Groq, OpenRouter, Anthropic or xAI in Oracle setup");
  return p.id === "anthropic"
    ? askAnthropic(key, question, context)
    : askOpenAICompat(p, key, question, context);
}

// ── the door ───────────────────────────────────────────────────────────
export async function askOracle(question: string, context: string): Promise<OracleAnswer> {
  const { engine } = getState().settings.oracle;
  if (!engine) throw new Error("no engine chosen — open Oracle setup");
  try {
    const out = engine === "local" ? await askLocal(question, context) : await askCloud(question, context);
    record("oracle", `${engine} ok`);
    return out;
  } catch (e) {
    record("oracle", `${engine} failed: ${String(e).slice(0, 80)}`);
    throw e;
  }
}
