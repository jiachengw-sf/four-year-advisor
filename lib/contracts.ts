import { z } from "zod";

// Zod versions of docs/agent-contracts.md. Keep the two in sync.

export const AGENTS = ["input", "knowledge", "opportunity", "patterns", "advisor"] as const;
export type AgentName = (typeof AGENTS)[number];

const nodeId = z.string().regex(/^[a-z0-9_]+$/, "must be a snake_case node_id from the skill catalog");
const opportunityId = z.string().min(1, "opportunity_id is required");
const unit = z.number().min(0).max(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date like 2026-11-15");
const delta = z.number().min(-0.3).max(0.3);
const text = z.string().min(1);

export const inputSchema = z.object({
  agent: z.literal("input"),
  student: z.object({
    name: text,
    year: z.number().int().min(1).max(6),
    major: text,
    career_goals: z.array(z.string()),
    interests: z.array(z.string()),
    weekly_hours: z.number().positive(),
  }),
  skills: z.array(
    z.object({ node_id: nodeId, mastery: unit, confidence: unit, evidence: z.string() }),
  ),
  verify_nodes: z.array(nodeId).default([]),
});

export const knowledgeSchema = z.object({
  agent: z.literal("knowledge"),
  learn_next: z.array(
    z.object({
      node_id: nodeId,
      reason: text,
      est_hours: z.number().positive(),
      resources: z.array(
        z.object({
          title: text,
          url: text,
          type: z.enum(["practice", "video", "reading", "project"]),
        }),
      ),
      milestones: z.array(z.string()),
    }),
  ),
  consumed_handoffs: z.array(z.string()).default([]),
});

const handoffSchema = z.object({
  to_agent: z.enum(AGENTS),
  opportunity_id: opportunityId,
  missing_nodes: z.array(nodeId).min(1),
  deadline: isoDate.nullable().optional(),
});

export const opportunitySchema = z
  .object({
    agent: z.literal("opportunity"),
    ready: z.array(z.object({ opportunity_id: opportunityId, reason: text })),
    almost: z.array(
      z.object({
        opportunity_id: opportunityId,
        reason: text,
        missing_nodes: z.array(nodeId).min(1),
        deadline: isoDate.nullable().optional(),
      }),
    ),
    long_term: z.array(z.object({ opportunity_id: opportunityId, reason: text })),
    handoffs: z.array(handoffSchema),
  })
  .superRefine((v, ctx) => {
    const handedOff = new Set(v.handoffs.map((h) => h.opportunity_id));
    v.almost.forEach((a, i) => {
      if (!handedOff.has(a.opportunity_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["almost", i, "opportunity_id"],
          message: `"${a.opportunity_id}" is in "almost" but has no matching item in "handoffs"`,
        });
      }
    });
  });

export const patternsSchema = z.object({
  agent: z.literal("patterns"),
  skill_deltas: z.array(
    z.object({ node_id: nodeId, mastery_delta: delta, confidence_delta: delta }),
  ),
  pace_updates: z.array(z.object({ category: text, multiplier: z.number().positive() })),
  method_scores: z.object({ practice: unit, video: unit, reading: unit, project: unit }),
  tips: z.array(z.string()),
});

export const advisorSchema = z.object({
  agent: z.literal("advisor"),
  this_week: z.array(
    z.object({ title: text, node_id: nodeId, hours: z.number().positive(), reason: text }),
  ),
  what_changed: z.array(z.string()),
});

export const schemas = {
  input: inputSchema,
  knowledge: knowledgeSchema,
  opportunity: opportunitySchema,
  patterns: patternsSchema,
  advisor: advisorSchema,
} as const;

export type InputOutput = z.infer<typeof inputSchema>;
export type KnowledgeOutput = z.infer<typeof knowledgeSchema>;
export type OpportunityOutput = z.infer<typeof opportunitySchema>;
export type PatternsOutput = z.infer<typeof patternsSchema>;
export type AdvisorOutput = z.infer<typeof advisorSchema>;
export type AgentOutput =
  | InputOutput
  | KnowledgeOutput
  | OpportunityOutput
  | PatternsOutput
  | AdvisorOutput;

export type ParseResult =
  | { ok: true; data: AgentOutput }
  | { ok: false; errors: string[] };

// Pulls the last ```json fenced block out of an agent reply, or treats the whole reply as JSON.
export function extractJson(reply: string): string {
  const fences = [...reply.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/gi)];
  if (fences.length > 0) return fences[fences.length - 1][1].trim();
  return reply.trim();
}

export function parseAgentReply(agent: AgentName, reply: string): ParseResult {
  if (!reply.trim()) return { ok: false, errors: ["The reply is empty."] };
  let raw: unknown;
  try {
    raw = JSON.parse(extractJson(reply));
  } catch (e) {
    return {
      ok: false,
      errors: [`Could not read JSON: ${(e as Error).message}. Paste the agent's whole reply, or just its \`\`\`json block.`],
    };
  }
  if (raw && typeof raw === "object" && "agent" in raw && (raw as { agent: unknown }).agent !== agent) {
    return {
      ok: false,
      errors: [`This reply says "agent": "${String((raw as { agent: unknown }).agent)}", but this is the ${agent} card.`],
    };
  }
  const result = schemas[agent].safeParse(raw);
  if (result.success) return { ok: true, data: result.data as AgentOutput };
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`),
  };
}
