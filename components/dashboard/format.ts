import type { KnowledgeDiff } from "./data";

export const AGENT_LABEL: Record<string, string> = {
  input: "Input",
  knowledge: "Knowledge",
  opportunity: "Opportunity",
  patterns: "Patterns",
  advisor: "Advisor",
};
export const agentLabel = (a: string | null | undefined) => (a ? AGENT_LABEL[a] ?? a : "?");

export const METHODS = ["practice", "project", "reading", "video"] as const;

// est_hours × pace multiplier for the node's category (>1 = slower than average).
export function paceHours(estHours: number, multiplier: number | undefined) {
  const m = multiplier && multiplier > 0 ? multiplier : 1;
  return { hours: Math.round(estHours * m * 10) / 10, multiplier: m };
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function formatDate(d: string | null | undefined) {
  if (!d) return null;
  const date = new Date(`${d.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function daysUntil(d: string | null | undefined, now = new Date()) {
  if (!d) return null;
  const date = new Date(`${d.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export function timeAgo(iso: string, now = new Date()) {
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

export function describeDiff(diff: KnowledgeDiff | undefined, nameOf: (id: string) => string): string[] {
  if (!diff) return [];
  if (!diff.previous_id) return ["First learning plan: every item in it is new."];
  const lines: string[] = [];
  for (const n of diff.new_items) lines.push(`Added ${nameOf(n)} to your plan.`);
  for (const n of diff.removed_items) lines.push(`Dropped ${nameOf(n)} from your plan.`);
  for (const r of diff.rank_changes) {
    lines.push(`${nameOf(r.node_id)} moved ${r.to < r.from ? "up" : "down"} from #${r.from} to #${r.to}.`);
  }
  if (!lines.length) lines.push("Your learning plan stayed the same since the last update.");
  return lines;
}
