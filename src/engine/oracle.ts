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

// ═══════════════════════════════════════════════════════════════════════
// The analyst's door (PALANTIR §4) — streaming, tool-driving, remembering.
// The model works the app's own engines through the kernel; every tool
// call is surfaced to the caller so the analyst SEES the work.
// ═══════════════════════════════════════════════════════════════════════

import { KERNEL_TOOLS, callTool } from "./kernel";

export interface ChatTurn { role: "user" | "assistant"; content: string }

export interface OracleStreamEvents {
  onDelta: (text: string) => void;
  onTool: (name: string, args: Record<string, unknown>) => void;
}

export type Effort = "low" | "medium" | "high";
const THINKING_BUDGET: Record<Effort, number> = { low: 0, medium: 4_000, high: 16_000 };
const MAX_TOOL_ROUNDS = 8;

const TOOL_SYSTEM =
  " You have TOOLS over the app's own engines — search, cross-references," +
  " translation comparison, entity dossiers, graph paths, and the reader" +
  " itself. Use them to ground answers in the corpus instead of memory," +
  " and cite what they return.";

/** Read an SSE stream, yielding each `data:` payload (skipping [DONE]). */
async function* sse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      for (const line of part.split("\n")) {
        if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          if (data && data !== "[DONE]") yield data;
        }
      }
    }
  }
}

/** The user's discovered/chooseable models, for the panel's picker. */
export async function listModels(): Promise<{ provider: string; models: string[] }> {
  const key = getState().settings.oracle.anthropicKey;
  const p = cloudProvider(key);
  if (!p) return { provider: "none", models: [] };
  try {
    if (p.id === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models", { headers: anthHeaders(key) });
      if (!r.ok) return { provider: p.id, models: [] };
      const data = ((await r.json()) as { data: { id: string }[] }).data;
      return { provider: p.id, models: data.map((m) => m.id) };
    }
    const r = await fetch(`${p.base}/models`, { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) return { provider: p.id, models: [] };
    const data = ((await r.json()) as { data: { id: string }[] }).data;
    return { provider: p.id, models: data.map((m) => m.id) };
  } catch {
    return { provider: p.id, models: [] };
  }
}

// ── Anthropic: native tool use, streamed ───────────────────────────────
interface AnthBlock { type: string; id?: string; name?: string; text?: string; input?: unknown }

async function streamAnthropic(
  key: string, question: string, transcript: ChatTurn[], ev: OracleStreamEvents
): Promise<OracleAnswer> {
  const oracle = getState().settings.oracle;
  const discovered = await discoverAnthropic(key);
  const model = oracle.model || discovered.model;
  const budget = discovered.budget;
  const effort: Effort = oracle.effort ?? "low";
  let ctx = await buildContext(getState().cursor, budget);
  const position = await positionLine();

  const messages: { role: string; content: unknown }[] = [
    ...transcript.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: `${position}\n\n${question}` },
  ];
  const tools = KERNEL_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));

  let fullText = "";
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const thinking = THINKING_BUDGET[effort];
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthHeaders(key),
      body: JSON.stringify({
        model,
        max_tokens: thinking ? thinking + 8_192 : 4_096,
        stream: true,
        ...(thinking ? { thinking: { type: "enabled", budget_tokens: thinking } } : {}),
        tools,
        system: [
          { type: "text", text: SYSTEM + TOOL_SYSTEM },
          { type: "text", text: ctx.text, cache_control: { type: "ephemeral", ttl: "1h" } },
        ],
        messages,
      }),
    });
    if (!r.ok || !r.body) {
      const body = await r.text();
      const lower = shallower(ctx.level);
      if ((r.status === 400 || r.status === 413) && sizeError(body) && lower) {
        ctx = await buildContext(getState().cursor, ctx.approxTokens / 3);
        continue;
      }
      if (r.status === 401) throw new Error("the key was not accepted (401) — check it in Oracle setup");
      throw new Error(`cloud engine: ${r.status}`);
    }

    // Reassemble this turn's content blocks from the stream.
    const blocks: AnthBlock[] = [];
    const partialJson: Record<number, string> = {};
    let stopReason = "";
    for await (const data of sse(r.body)) {
      const j = JSON.parse(data) as {
        type: string; index?: number;
        content_block?: AnthBlock;
        delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string };
      };
      if (j.type === "content_block_start" && j.content_block) {
        blocks[j.index!] = { ...j.content_block };
        if (j.content_block.type === "tool_use") partialJson[j.index!] = "";
      } else if (j.type === "content_block_delta" && j.delta) {
        const b = blocks[j.index!];
        if (j.delta.type === "text_delta" && j.delta.text) {
          if (b) b.text = (b.text ?? "") + j.delta.text;
          fullText += j.delta.text;
          ev.onDelta(j.delta.text);
        } else if (j.delta.type === "input_json_delta" && j.delta.partial_json != null) {
          partialJson[j.index!] += j.delta.partial_json;
        }
      } else if (j.type === "message_delta" && j.delta?.stop_reason) {
        stopReason = j.delta.stop_reason;
      }
    }

    const meta = { engine: "cloud" as const, model, context: { level: ctx.level, approxTokens: ctx.approxTokens } };
    if (stopReason !== "tool_use") {
      if (stopReason === "refusal") return { text: fullText || "The Oracle declined this question.", ...meta };
      return { text: fullText, ...meta };
    }

    // Execute the requested tools locally; hand back tool_results; loop.
    const inputFor = (idx: number): Record<string, unknown> =>
      (safeParse(partialJson[idx] ?? "") ?? blocks[idx]?.input ?? {}) as Record<string, unknown>;
    const assistantContent = blocks
      .map((b, idx) => {
        if (!b) return null;
        if (b.type === "tool_use") return { type: "tool_use", id: b.id, name: b.name, input: inputFor(idx) };
        return b.text ? { type: "text", text: b.text } : null;
      })
      .filter((b): b is NonNullable<typeof b> => !!b);
    const results = [];
    for (let idx = 0; idx < blocks.length; idx++) {
      const b = blocks[idx];
      if (!b || b.type !== "tool_use") continue;
      const args = inputFor(idx);
      ev.onTool(b.name!, args);
      record("kernel", `${b.name}`);
      results.push({ type: "tool_result", tool_use_id: b.id, content: await callTool(b.name!, args) });
    }
    messages.push({ role: "assistant", content: assistantContent });
    messages.push({ role: "user", content: results });
    if (fullText && !fullText.endsWith("\n")) { fullText += "\n"; ev.onDelta("\n"); }
  }
  throw new Error("the Oracle looped too long on tools");
}

const safeParse = (s: string): unknown => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

// ── OpenAI-compatible: function calling, streamed ──────────────────────
interface CompatToolCall { id: string; name: string; args: string }

async function streamCompat(
  base: string, headers: Record<string, string>, model: string, budget: number,
  engine: "local" | "cloud", question: string, transcript: ChatTurn[], ev: OracleStreamEvents
): Promise<OracleAnswer> {
  let ctx = await buildContext(getState().cursor, budget);
  const position = await positionLine();
  const messages: Record<string, unknown>[] = [
    { role: "system", content: SYSTEM + TOOL_SYSTEM },
    { role: "user", content: ctx.text },
    ...transcript.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: `${position}\n\n${question}` },
  ];
  const tools = KERNEL_TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));

  let fullText = "";
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ model, max_tokens: 4096, stream: true, tools, messages }),
    });
    if (!r.ok || !r.body) {
      const body = await r.text();
      const lower = shallower(ctx.level);
      if ((r.status === 400 || r.status === 413 || r.status === 422) && sizeError(body) && lower) {
        ctx = await buildContext(getState().cursor, ctx.approxTokens / 3);
        messages[1] = { role: "user", content: ctx.text };
        continue;
      }
      throw new Error(`${engine} engine (${model}): ${r.status}`);
    }

    const calls: CompatToolCall[] = [];
    let finish = "";
    for await (const data of sse(r.body)) {
      const j = safeParse(data) as {
        choices?: {
          delta?: { content?: string; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] };
          finish_reason?: string;
        }[];
      } | null;
      const c = j?.choices?.[0];
      if (!c) continue;
      if (c.delta?.content) { fullText += c.delta.content; ev.onDelta(c.delta.content); }
      for (const tc of c.delta?.tool_calls ?? []) {
        const slot = (calls[tc.index] ??= { id: "", name: "", args: "" });
        if (tc.id) slot.id = tc.id;
        if (tc.function?.name) slot.name += tc.function.name;
        if (tc.function?.arguments) slot.args += tc.function.arguments;
      }
      if (c.finish_reason) finish = c.finish_reason;
    }

    const meta = {
      engine, model: model.replace(/^models\//, ""),
      context: { level: ctx.level, approxTokens: ctx.approxTokens },
    };
    if (finish !== "tool_calls" || !calls.length) return { text: fullText, ...meta };

    messages.push({
      role: "assistant",
      content: fullText || null,
      tool_calls: calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args } })),
    });
    for (const c of calls) {
      const args = (safeParse(c.args) ?? {}) as Record<string, unknown>;
      ev.onTool(c.name, args);
      record("kernel", c.name);
      messages.push({ role: "tool", tool_call_id: c.id, content: await callTool(c.name, args) });
    }
    if (fullText && !fullText.endsWith("\n")) { fullText += "\n"; ev.onDelta("\n"); }
  }
  throw new Error("the Oracle looped too long on tools");
}

/** The streaming door — transcript-aware, tool-driving, honest. */
export async function askOracleStream(
  question: string, transcript: ChatTurn[], ev: OracleStreamEvents
): Promise<OracleAnswer> {
  const { engine, anthropicKey, localUrl, model: chosen } = getState().settings.oracle;
  if (!engine) throw new Error("no engine chosen — open Oracle setup");
  try {
    let out: OracleAnswer;
    if (engine === "local") {
      const base = localUrl.replace(/\/$/, "");
      const probe = await probeLocal(base);
      if (!probe.ok || !probe.model) throw new Error("local engine unreachable — " + (probe.why ?? ""));
      out = await streamCompat(base, {}, chosen || probe.model, 6_000, "local", question, transcript, ev);
    } else {
      const p = cloudProvider(anthropicKey);
      if (!p) throw new Error("no usable key — paste a key from Gemini, Groq, OpenRouter, Anthropic or xAI in Oracle setup");
      if (p.id === "anthropic") {
        out = await streamAnthropic(anthropicKey, question, transcript, ev);
      } else {
        const auth = { Authorization: `Bearer ${anthropicKey}`, "X-Title": "CODEX" };
        const models = await fetch(`${p.base}/models`, { headers: auth });
        if (models.status === 401 || models.status === 403) throw new Error(`the ${p.label} key was not accepted — check it in Oracle setup`);
        if (!models.ok) throw new Error(`cloud engine (${p.id} models): ${models.status}`);
        const list = ((await models.json()) as { data: { id: string }[] }).data.map((m) => m.id);
        const model = chosen && list.includes(chosen) ? chosen : p.pick(list);
        if (!model) throw new Error(`this ${p.label} key can see no models`);
        out = await streamCompat(p.base, auth, model, p.budget, "cloud", question, transcript, ev);
      }
    }
    record("oracle", `${engine} ok · ${out.model} · ${out.context.level}`);
    return out;
  } catch (e) {
    record("oracle", `${engine} failed: ${String(e).slice(0, 80)}`);
    throw e;
  }
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
