import "server-only";
import { supabase } from "./supabase";
import type { AgentName } from "./contracts";

type Res<T> = { data: T | null; error: { message: string } | null };
function rows<T>(res: Res<T>, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

const STUDENT_FIELDS = "id, name, year, major, career_goals, interests, weekly_hours";
const SKILL_FIELDS = "node_id, mastery, confidence, evidence, last_practiced";
const PROFILE_FIELDS = "pace_by_category, method_scores, tips, updated_at";

async function student(id: string) {
  return rows(await supabase().from("students").select(STUDENT_FIELDS).eq("id", id).maybeSingle(), "Reading student");
}
async function studentSkills(id: string) {
  return rows(
    await supabase().from("student_skills").select(SKILL_FIELDS).eq("student_id", id).order("node_id"),
    "Reading student skills",
  );
}
async function learningProfile(id: string) {
  return rows(
    await supabase().from("learning_profile").select(PROFILE_FIELDS).eq("student_id", id).maybeSingle(),
    "Reading learning profile",
  );
}

// The "Agent context" block each Superhuman agent receives.
export async function buildContext(agent: AgentName, studentId: string): Promise<object> {
  const db = supabase();
  switch (agent) {
    case "input": {
      const catalog = rows(
        await db.from("skill_nodes").select("node_id, name, category").order("category").order("node_id"),
        "Reading skill catalog",
      );
      return { skill_catalog: catalog };
    }
    case "knowledge": {
      const [s, catalog, skills, profile, edges, handoffs, events] = await Promise.all([
        student(studentId),
        db
          .from("skill_nodes")
          .select("node_id, name, category, base_hours")
          .order("category")
          .order("node_id")
          .then((r) => rows(r, "Reading skill catalog")),
        studentSkills(studentId),
        learningProfile(studentId),
        db.from("skill_edges").select("from_node, to_node").then((r) => rows(r, "Reading skill edges")),
        db
          .from("agent_outputs")
          .select("id, agent, payload, created_at")
          .eq("student_id", studentId)
          .eq("kind", "handoff")
          .eq("to_agent", "knowledge")
          .eq("consumed", false)
          .order("created_at")
          .then((r) => rows(r, "Reading handoffs")),
        db
          .from("events")
          .select("type, node_id, payload, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(10)
          .then((r) => rows(r, "Reading events")),
      ]);
      return {
        student: s,
        skill_catalog: catalog,
        student_skills: skills,
        learning_profile: profile,
        skill_edges: edges,
        unconsumed_handoffs: (handoffs as { id: string; agent: string; payload: object; created_at: string }[]).map(
          (h) => ({ id: h.id, from_agent: h.agent, ...h.payload, created_at: h.created_at }),
        ),
        recent_events: (events as { type: string; node_id: string | null; payload: Record<string, unknown>; created_at: string }[]).map(
          // The check-in's model_update/summary are site bookkeeping; the agent only needs what the student reported.
          ({ payload: { model_update: _u, summary: _s, ...reported }, ...e }) => ({ ...e, payload: reported }),
        ),
      };
    }
    case "opportunity": {
      const [s, skills, opps] = await Promise.all([
        student(studentId),
        studentSkills(studentId),
        db
          .from("opportunities")
          .select("opportunity_id, type, title, required_nodes, deadline, link, tags")
          .order("opportunity_id")
          .then((r) => rows(r, "Reading opportunities")),
      ]);
      return { student: s, student_skills: skills, opportunities: opps };
    }
    case "patterns": {
      const [skills, profile, events] = await Promise.all([
        studentSkills(studentId),
        learningProfile(studentId),
        db
          .from("events")
          .select("type, node_id, payload, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(20)
          .then((r) => rows(r, "Reading events")),
      ]);
      return { student_skills: skills, learning_profile: profile, recent_events: events };
    }
    case "advisor": {
      const s = (await student(studentId)) as { weekly_hours: number } | null;
      const others: AgentName[] = ["input", "knowledge", "opportunity", "patterns"];
      const latest = await Promise.all(
        others.map(async (a) => {
          const r = rows(
            await db
              .from("agent_outputs")
              .select("payload, created_at")
              .eq("student_id", studentId)
              .eq("agent", a)
              .eq("kind", "result")
              .order("created_at", { ascending: false })
              .limit(1),
            `Reading latest ${a} output`,
          ) as { payload: object; created_at: string }[];
          return [a, r[0] ? { ...r[0].payload, saved_at: r[0].created_at } : null] as const;
        }),
      );
      return { weekly_hours: s?.weekly_hours ?? null, latest_outputs: Object.fromEntries(latest) };
    }
  }
}
