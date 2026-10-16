import type { KnowledgeDiff } from "./save";

const ordinal = (n: number) => `#${n}`;

// Turns a knowledge payload._diff into sentences for the "What changed and why" card.
export function describeDiff(diff: KnowledgeDiff | undefined, nameOf: (nodeId: string) => string): string[] {
  if (!diff) return [];
  if (!diff.previous_id) return ["This is the first learning plan, so everything in it is new."];
  const lines: string[] = [];
  for (const n of diff.new_items) lines.push(`Added ${nameOf(n)} to your plan.`);
  for (const n of diff.removed_items) lines.push(`Dropped ${nameOf(n)} from your plan.`);
  for (const r of diff.rank_changes) {
    const dir = r.to < r.from ? "up" : "down";
    lines.push(`${nameOf(r.node_id)} moved ${dir} from ${ordinal(r.from)} to ${ordinal(r.to)}.`);
  }
  if (lines.length === 0) lines.push("Your learning plan stayed the same since the last update.");
  return lines;
}

const AGENT_LABEL: Record<string, string> = {
  input: "Input",
  knowledge: "Knowledge",
  opportunity: "Opportunity",
  patterns: "Patterns",
  advisor: "Advisor",
};
export const agentLabel = (a: string | null | undefined) => (a ? AGENT_LABEL[a] ?? a : "?");

export function describeHandoff(
  from: string,
  to: string | null,
  missing: string[] | undefined,
  opportunityTitle: string | undefined,
): string {
  const count = missing?.length ?? 0;
  const skills = `${count} missing skill${count === 1 ? "" : "s"}`;
  return `${agentLabel(from)} → ${agentLabel(to)}: ${skills} for ${opportunityTitle ?? "an opportunity"}`;
}

// est_hours scaled by the student's pace for that node's category (multiplier > 1 = slower).
export function adjustedHours(estHours: number, multiplier: number | undefined): number {
  const m = multiplier && multiplier > 0 ? multiplier : 1;
  return Math.round(estHours * m * 10) / 10;
}
