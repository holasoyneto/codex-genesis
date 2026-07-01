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

// ── cloud (Anthropic, user's own key, browser-direct) ─────────────────
const CLOUD_MODEL = "claude-opus-4-8";

async function askCloud(question: string, context: string): Promise<OracleAnswer> {
  const key = getState().settings.oracle.anthropicKey;
  if (!key) throw new Error("no key — paste your Anthropic API key in the Oracle setup");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLOUD_MODEL,
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
    return { text: "The Oracle declined this question.", engine: "cloud", model: CLOUD_MODEL };
  }
  const text = j.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return { text, engine: "cloud", model: CLOUD_MODEL };
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
