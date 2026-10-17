import "server-only";
import { z } from "zod";
import { describeUpdate, updateModel } from "./checkinMath";
import { supabase } from "./supabase";

// The student model loop: a check-in or quiz updates mastery and pace, and the graph reads it back.

export const checkinInput = z.object({
  node_id: z.string().min(1, "Pick a skill"),
  minutes: z.number().int().min(1, "Minutes must be at least 1").max(1440),
  confidence: z.number().int().min(1).max(5),
  score: z.number().min(0).max(100).nullable().optional(),
});
export type CheckinInput = z.infer<typeof checkinInput>;

export type CheckinResult = {
  node: { node_id: string; name: string; category: string };
  mastery_before: number;
  mastery_after: number;
  est_before: number;
  est_after: number;
  message: string;
};

export type GraphNode = {
  node_id: string;
  name: string;
  category: string;
  base_hours: number;
  mastery: number | null; // null: no data for this student yet
  confidence: number | null;
  evidence: string[];
  est_hours: number;
};
export type GraphEdge = { from_node: string; to_node: string };

type Res<T> = { data: T | null; error: { message: string } | null };
function must<T>(res: Res<T>, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;
const MAX_EVIDENCE = 10;

export async function applyCheckin(studentId: string, input: CheckinInput): Promise<CheckinResult> {
  const f = checkinInput.parse(input);
  const hasScore = f.score !== undefined && f.score !== null;
  const db = supabase();

  const node = must(
    await db.from("skill_nodes").select("node_id, name, category, base_hours").eq("node_id", f.node_id).maybeSingle(),
    "Reading skill",
  ) as { node_id: string; name: string; category: string; base_hours: number } | null;
  if (!node) throw new Error(`"${f.node_id}" is not in the skill catalog.`);

  const [skill, profile] = await Promise.all([
    db
      .from("student_skills")
      .select("mastery, confidence, evidence")
      .eq("student_id", studentId)
      .eq("node_id", f.node_id)
      .maybeSingle()
      .then((r) => must(r, "Reading student skill") as { mastery: number; confidence: number; evidence: string[] | null } | null),
    db
      .from("learning_profile")
      .select("pace_by_category")
      .eq("student_id", studentId)
      .maybeSingle()
      .then((r) => must(r, "Reading learning profile") as { pace_by_category: Record<string, number> | null } | null),
  ]);

  // The update math lives in lib/checkinMath.ts so every check-in path agrees on it.
  const paceByCategory = { ...(profile?.pace_by_category ?? {}) };
  const update = updateModel(
    {
      mastery: Number(skill?.mastery ?? 0),
      confidence: Number(skill?.confidence ?? 0),
      pace: Number(paceByCategory[node.category] ?? 1),
      baseHours: Number(node.base_hours),
    },
    { minutes: f.minutes, confidence: f.confidence, score: hasScore ? f.score : null },
  );

  const result: CheckinResult = {
    node: { node_id: node.node_id, name: node.name, category: node.category },
    mastery_before: update.mastery.from,
    mastery_after: update.mastery.to,
    est_before: update.estimate.from,
    est_after: update.estimate.to,
    message: describeUpdate(node.name, node.category, update),
  };

  must(
    await db.from("events").insert({
      student_id: studentId,
      type: hasScore ? "quiz" : "checkin",
      node_id: f.node_id,
      payload: {
        minutes: f.minutes,
        confidence: f.confidence,
        ...(hasScore ? { score: f.score } : {}),
        // Marks the event as already applied, so the Patterns agent doesn't count it again.
        model_update: update,
        summary: result.message,
      },
    }),
    "Saving check-in",
  );

  paceByCategory[node.category] = update.pace.to;
  must(
    await db.from("learning_profile").upsert(
      { student_id: studentId, pace_by_category: paceByCategory, updated_at: new Date().toISOString() },
      { onConflict: "student_id" },
    ),
    "Updating pace",
  );

  const line = hasScore
    ? `Quiz ${f.score}/100 after ${f.minutes} min`
    : `Check-in: ${f.minutes} min, confidence ${f.confidence}/5`;
  must(
    await db.from("student_skills").upsert(
      {
        student_id: studentId,
        node_id: f.node_id,
        mastery: update.mastery.to,
        confidence: update.confidence.to,
        evidence: [line, ...(skill?.evidence ?? [])].slice(0, MAX_EVIDENCE),
        last_practiced: new Date().toISOString(),
      },
      { onConflict: "student_id,node_id" },
    ),
    "Updating skill",
  );

  return result;
}

// Everything the knowledge graph needs for one student.
export async function loadGraph(studentId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const db = supabase();
  const [nodes, edges, skills, profile] = await Promise.all([
    db.from("skill_nodes").select("node_id, name, category, base_hours").order("node_id"),
    db.from("skill_edges").select("from_node, to_node"),
    db.from("student_skills").select("node_id, mastery, confidence, evidence").eq("student_id", studentId),
    db.from("learning_profile").select("pace_by_category").eq("student_id", studentId).maybeSingle(),
  ]);
  const byNode = new Map(
    (must(skills, "Reading student skills") as { node_id: string; mastery: number; confidence: number; evidence: string[] | null }[]).map(
      (s) => [s.node_id, s],
    ),
  );
  const pace = (must(profile, "Reading learning profile") as { pace_by_category: Record<string, number> | null } | null)
    ?.pace_by_category ?? {};

  return {
    nodes: (must(nodes, "Reading skills") as { node_id: string; name: string; category: string; base_hours: number }[]).map((n) => {
      const s = byNode.get(n.node_id);
      return {
        ...n,
        base_hours: Number(n.base_hours),
        mastery: s ? Number(s.mastery) : null,
        confidence: s ? Number(s.confidence) : null,
        evidence: s?.evidence ?? [],
        est_hours: round(Number(n.base_hours) * Number(pace[n.category] ?? 1), 1),
      };
    }),
    edges: must(edges, "Reading skill edges") as GraphEdge[],
  };
}
