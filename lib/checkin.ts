import "server-only";
import { z } from "zod";
import { describeUpdate, updateModel, type ModelUpdate } from "./checkinMath";
import { supabase } from "./supabase";

export const checkinSchema = z.object({
  node_id: z.string().min(1, "Pick a skill"),
  minutes: z.number().int().min(1, "Minutes must be at least 1").max(1440),
  confidence: z.number().int().min(1).max(5),
  score: z.number().min(0).max(100).nullable().optional(),
});
export type CheckinForm = z.infer<typeof checkinSchema>;

export type CheckinResult =
  | { ok: true; summary: string; update: ModelUpdate; node_id: string }
  | { ok: false; errors: string[] };

type Res<T> = { data: T | null; error: { message: string } | null };
function must<T>(res: Res<T>, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export async function recordCheckin(studentId: string, form: CheckinForm): Promise<CheckinResult> {
  const parsed = checkinSchema.safeParse(form);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  const f = parsed.data;
  const hasScore = f.score !== undefined && f.score !== null;
  const db = supabase();

  try {
    const node = must(
      await db.from("skill_nodes").select("node_id, name, category, base_hours").eq("node_id", f.node_id).maybeSingle(),
      "Reading skill",
    ) as { node_id: string; name: string; category: string; base_hours: number } | null;
    if (!node) return { ok: false, errors: [`"${f.node_id}" is not in the skill catalog.`] };

    const [skill, profile] = await Promise.all([
      db
        .from("student_skills")
        .select("mastery, confidence")
        .eq("student_id", studentId)
        .eq("node_id", f.node_id)
        .maybeSingle()
        .then((r) => must(r, "Reading student skill") as { mastery: number; confidence: number } | null),
      db
        .from("learning_profile")
        .select("pace_by_category")
        .eq("student_id", studentId)
        .maybeSingle()
        .then((r) => must(r, "Reading learning profile") as { pace_by_category: Record<string, number> | null } | null),
    ]);

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
    const summary = describeUpdate(node.name, node.category, update);

    must(
      await db.from("events").insert({
        student_id: studentId,
        type: hasScore ? "quiz" : "checkin",
        node_id: f.node_id,
        payload: {
          minutes: f.minutes,
          confidence: f.confidence,
          ...(hasScore ? { score: f.score } : {}),
          model_update: update,
          summary,
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
    // Written last: realtime listeners on student_skills refresh once everything above is saved.
    must(
      await db.from("student_skills").upsert(
        {
          student_id: studentId,
          node_id: f.node_id,
          mastery: update.mastery.to,
          confidence: update.confidence.to,
          last_practiced: new Date().toISOString(),
        },
        { onConflict: "student_id,node_id" },
      ),
      "Updating skill",
    );

    return { ok: true, summary, update, node_id: f.node_id };
  } catch (e) {
    return { ok: false, errors: [(e as Error).message] };
  }
}
