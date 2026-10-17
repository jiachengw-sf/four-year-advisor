import "server-only";
import { getDemoStudentId } from "@/lib/student";
import { supabase } from "@/lib/supabase";
import type {
  AdvisorOutput,
  AgentName,
  AgentOutputRow,
  KnowledgeOutput,
  LearningProfile,
  OpportunityOutput,
  PatternsOutput,
  Opportunity as OpportunityRow,
  SkillNode as SkillNodeRow,
  Student as StudentRow,
  StudentSkill as StudentSkillRow,
} from "@/lib/types";

// Everything the dashboard reads lives here.

// Shape of knowledge payload._diff, written by lib/save.ts.
export type KnowledgeDiff = {
  previous_id: string | null;
  new_items: string[];
  removed_items: string[];
  rank_changes: { node_id: string; from: number; to: number }[];
};

export type Saved<T> = (Pick<AgentOutputRow, "id" | "is_golden" | "created_at"> & { payload: T }) | null;

export type Student = Pick<StudentRow, "id" | "name" | "year" | "major" | "career_goals" | "weekly_hours">;
export type SkillNode = Pick<SkillNodeRow, "node_id" | "name" | "category">;
export type StudentSkill = Pick<StudentSkillRow, "node_id" | "mastery" | "confidence">;
export type Opportunity = Pick<OpportunityRow, "opportunity_id" | "type" | "title" | "deadline" | "link">;
export type Handoff = Pick<AgentOutputRow, "id" | "agent" | "to_agent" | "consumed" | "created_at"> & {
  payload: { opportunity_id?: string; missing_nodes?: string[]; deadline?: string | null };
};
export type Profile = Pick<LearningProfile, "pace_by_category" | "method_scores" | "tips">;

export type DashboardData = {
  student: Student;
  advisor: Saved<AdvisorOutput>;
  knowledge: Saved<KnowledgeOutput & { _diff?: KnowledgeDiff }>;
  opportunity: Saved<OpportunityOutput>;
  patterns: Saved<PatternsOutput>;
  profile: Profile | null;
  nodes: SkillNode[];
  skills: StudentSkill[];
  opportunities: Opportunity[];
  handoffs: Handoff[];
};

type Res<T> = { data: T | null; error: { message: string } | null };
function rows<T>(res: Res<T>, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

async function demoStudent(): Promise<Student | null> {
  const id = await getDemoStudentId();
  if (!id) return null;
  const res = await supabase()
    .from("students")
    .select("id, name, year, major, career_goals, weekly_hours")
    .eq("id", id)
    .maybeSingle();
  return rows(res, "Reading student") as Student | null;
}

// Latest result for an agent; a golden row wins when one exists.
async function latest<T>(studentId: string, agent: AgentName): Promise<Saved<T>> {
  const base = () =>
    supabase()
      .from("agent_outputs")
      .select("id, is_golden, created_at, payload")
      .eq("student_id", studentId)
      .eq("agent", agent)
      .eq("kind", "result")
      .order("created_at", { ascending: false })
      .limit(1);
  const golden = rows(await base().eq("is_golden", true), `Reading golden ${agent} output`) as NonNullable<Saved<T>>[];
  if (golden[0]) return golden[0];
  const any = rows(await base(), `Reading ${agent} output`) as NonNullable<Saved<T>>[];
  return any[0] ?? null;
}

async function handoffs(studentId: string): Promise<Handoff[]> {
  const base = () =>
    supabase()
      .from("agent_outputs")
      .select("id, agent, to_agent, consumed, created_at, payload")
      .eq("student_id", studentId)
      .eq("kind", "handoff")
      .order("created_at", { ascending: false })
      .limit(10);
  const golden = rows(await base().eq("is_golden", true), "Reading golden handoffs") as Handoff[];
  if (golden.length) return golden;
  return rows(await base(), "Reading handoffs") as Handoff[];
}

export async function loadDashboard(): Promise<DashboardData | null> {
  const student = await demoStudent();
  if (!student) return null;
  const db = supabase();
  const id = student.id;

  const [advisor, knowledge, opportunity, patterns, profile, nodes, skills, opportunities, feed] = await Promise.all([
    latest<AdvisorOutput>(id, "advisor"),
    latest<KnowledgeOutput & { _diff?: KnowledgeDiff }>(id, "knowledge"),
    latest<OpportunityOutput>(id, "opportunity"),
    latest<PatternsOutput>(id, "patterns"),
    db
      .from("learning_profile")
      .select("pace_by_category, method_scores, tips")
      .eq("student_id", id)
      .maybeSingle()
      .then((r) => rows(r, "Reading learning profile")),
    db.from("skill_nodes").select("node_id, name, category").then((r) => rows(r, "Reading skill nodes")),
    db
      .from("student_skills")
      .select("node_id, mastery, confidence")
      .eq("student_id", id)
      .then((r) => rows(r, "Reading student skills")),
    db
      .from("opportunities")
      .select("opportunity_id, type, title, deadline, link")
      .then((r) => rows(r, "Reading opportunities")),
    handoffs(id),
  ]);

  return {
    student,
    advisor,
    knowledge,
    opportunity,
    patterns,
    profile: profile as Profile | null,
    nodes: nodes as SkillNode[],
    skills: (skills as StudentSkill[]).map((s) => ({ ...s, mastery: Number(s.mastery), confidence: Number(s.confidence) })),
    opportunities: opportunities as Opportunity[],
    handoffs: feed,
  };
}
