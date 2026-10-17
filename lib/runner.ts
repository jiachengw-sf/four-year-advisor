import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseAgentReply, type AgentName } from "@/lib/contracts";
import { buildContext } from "@/lib/context";
import { saveOutput } from "@/lib/save";

// Local stand-in for running the agents in Superhuman Go: the same instructions
// (prompts/<agent>.md, the text below the first `---`) are sent to the Claude API, and the
// reply goes through the same validate-and-save path as a pasted reply.
const MODEL = process.env.ADVISOR_MODEL || "claude-sonnet-5-5";

async function instructions(agent: AgentName): Promise<string> {
  const file = await readFile(path.join(process.cwd(), "prompts", `${agent}.md`), "utf8");
  const i = file.indexOf("\n---\n");
  return i === -1 ? file : file.slice(i + 5).trim();
}

async function callClaude(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(240000),
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
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await callClaude(system, user);
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
