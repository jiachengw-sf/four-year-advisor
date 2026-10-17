import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseAgentReply, type AgentName } from "@/lib/contracts";
import { buildContext } from "@/lib/context";
import { saveOutput } from "@/lib/save";

// Local stand-in for running the agents in Superhuman Go: the same instructions
// (prompts/<agent>.md, the text below the first `---`) are sent to the NVIDIA or Claude API, and the
// reply goes through the same validate-and-save path as a pasted reply.
// Provider: NVIDIA (OpenAI-compatible) when NVIDIA_API_KEY is set, otherwise Anthropic.
// ADVISOR_MODEL overrides the default model for whichever provider is used.
const NVIDIA_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const CLAUDE_MODEL = "claude-sonnet-5-5";

async function instructions(agent: AgentName): Promise<string> {
  const file = await readFile(path.join(process.cwd(), "prompts", `${agent}.md`), "utf8");
  const i = file.indexOf("\n---\n");
  return i === -1 ? file : file.slice(i + 5).trim();
}

async function callNvidia(key: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ADVISOR_MODEL || NVIDIA_MODEL,
      max_tokens: 4096,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`NVIDIA API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { choices: { message: { content: string } }[] };
  return body.choices[0]?.message?.content ?? "";
}

async function callClaude(system: string, user: string): Promise<string> {
  const nvidia = process.env.NVIDIA_API_KEY;
  if (nvidia) return callNvidia(nvidia, system, user);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Set NVIDIA_API_KEY (or ANTHROPIC_API_KEY) in .env.local and restart the dev server.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.ADVISOR_MODEL || CLAUDE_MODEL, max_tokens: 8000, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { content: { type: string; text?: string }[] };
  return body.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
}

export type StepResult = { ok: true; id: string; warnings: string[] } | { ok: false; errors: string[] };

export async function runAgentStep(agent: AgentName, studentId: string, documents = ""): Promise<StepResult> {
  const system = await instructions(agent);
  const context = JSON.stringify(await buildContext(agent, studentId), null, 2);
  const base = `Agent context:\n\`\`\`json\n${context}\n\`\`\`${documents.trim() ? `\n\nStudent documents:\n\n${documents.trim()}` : ""}`;

  let user = base;
  let lastErrors: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    let reply: string;
    try {
      reply = await callClaude(system, user);
    } catch (e) {
      // A slow or dropped model call is retried; the third failure is reported.
      lastErrors = [(e as Error).message];
      if (attempt === 2) break;
      continue;
    }
    const parsed = parseAgentReply(agent, reply);
    if (parsed.ok) {
      const saved = await saveOutput(studentId, parsed.data, false);
      if (saved.ok) return { ok: true, id: saved.id, warnings: saved.warnings };
      lastErrors = saved.errors;
    } else {
      lastErrors = parsed.errors;
    }
    user = `${base}\n\nYour previous reply was rejected:\n- ${lastErrors.join("\n- ")}\nFix these and reply again, ending with one json block.`;
  }
  return { ok: false, errors: lastErrors };
}
