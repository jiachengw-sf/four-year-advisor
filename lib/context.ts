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
      return {
        current_date: new Date().toISOString().slice(0, 10),
        student: s,
        student_skills: skills,
        opportunities: opps,
      };
    }
    case "patterns": {
      const [skills, profile, catalog, lastReview, events] = await Promise.all([
        studentSkills(studentId),
        learningProfile(studentId),
        db
          .from("skill_nodes")
          .select("node_id, category")
          .order("node_id")
          .then((r) => rows(r, "Reading skill catalog")),
        db
          .from("agent_outputs")
          .select("created_at")
          .eq("student_id", studentId)
          .eq("agent", "patterns")
          .eq("kind", "result")
          .order("created_at", { ascending: false })
          .limit(1)
          .then((r) => rows(r, "Reading last patterns review")),
        db
          .from("events")
          .select("type, node_id, payload, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(20)
          .then((r) => rows(r, "Reading events")),
      ]);
      return {
        student_skills: skills,
        learning_profile: profile,
        node_categories: Object.fromEntries(
          (catalog as { node_id: string; category: string }[]).map((n) => [n.node_id, n.category]),
        ),
        // Events before this were already reviewed by an earlier Patterns output (golden included).
        last_review_at: (lastReview as { created_at: string }[])[0]?.created_at ?? null,
        recent_events: (events as { type: string; node_id: string | null; payload: Record<string, unknown>; created_at: string }[]).map(
          // A check-in's model_update means code already applied it to mastery, confidence, and pace.
          ({ payload: { model_update, summary: _s, ...reported }, ...e }) => ({
            ...e,
            payload: reported,
            applied: model_update !== undefined,
          }),
        ),
      };
    }
    case "advisor": {
      const latestOf = async (a: AgentName) => {
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
        return r[0] ? { ...r[0].payload, saved_at: r[0].created_at } : null;
      };
      const others: AgentName[] = ["input", "knowledge", "opportunity", "patterns"];
      const [s, catalog, profile, latest, previousPlan, events] = await Promise.all([
        student(studentId),
        db
          .from("skill_nodes")
          .select("node_id, name, category")
          .order("node_id")
          .then((r) => rows(r, "Reading skill catalog")),
        learningProfile(studentId),
        Promise.all(others.map(async (a) => [a, await latestOf(a)] as const)),
        latestOf("advisor"),
        db
          .from("events")
          .select("type, node_id, payload, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(10)
          .then((r) => rows(r, "Reading events")),
      ]);
      return {
        current_date: new Date().toISOString().slice(0, 10),
        weekly_hours: (s as { weekly_hours: number } | null)?.weekly_hours ?? null,
        student: s,
        skill_catalog: catalog,
        learning_profile: profile,
        latest_outputs: Object.fromEntries(latest),
        previous_plan: previousPlan,
        recent_events: (events as { type: string; node_id: string | null; payload: Record<string, unknown>; created_at: string }[]).map(
          // Keep what the student reported plus the site's one-line summary of how the model moved.
          ({ payload: { model_update: _u, ...reported }, ...e }) => ({ ...e, payload: reported }),
        ),
      };
    }
  }
}
