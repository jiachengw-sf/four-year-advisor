import "server-only";
import type {
  AdvisorOutput,
  AgentName,
  KnowledgeOutput,
  OpportunityOutput,
  PatternsOutput,
} from "./contracts";
import type { KnowledgeDiff } from "./save";
import { supabase } from "./supabase";

export type SkillNode = { node_id: string; name: string; category: string; base_hours: number };
export type SkillEdge = { from_node: string; to_node: string };
export type StudentSkill = { node_id: string; mastery: number; confidence: number };
export type Opportunity = {
  opportunity_id: string;
  type: string;
  title: string;
  deadline: string | null;
  link: string | null;
};
export type Handoff = {
  id: string;
  agent: AgentName;
  to_agent: AgentName | null;
  consumed: boolean;
  is_golden: boolean;
  created_at: string;
  payload: { opportunity_id?: string; missing_nodes?: string[]; deadline?: string | null };
};
export type Saved<T> = { id: string; is_golden: boolean; created_at: string; payload: T } | null;

export type Dashboard = {
  student: { id: string; name: string | null; year: number | null; major: string | null; weekly_hours: number | null } | null;
  advisor: Saved<AdvisorOutput>;
  knowledge: Saved<KnowledgeOutput & { _diff?: KnowledgeDiff }>;
  opportunity: Saved<OpportunityOutput>;
  patterns: Saved<PatternsOutput>;
  profile: { pace_by_category: Record<string, number>; method_scores: Record<string, number>; tips: string[] } | null;
  nodes: SkillNode[];
  edges: SkillEdge[];
  skills: StudentSkill[];
  opportunities: Opportunity[];
  handoffs: Handoff[];
};

type Res<T> = { data: T | null; error: { message: string } | null };
function rows<T>(res: Res<T>, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

// Latest result for an agent. In demo mode, the latest golden row wins if there is one.
async function latest<T>(studentId: string, agent: AgentName, demoMode: boolean): Promise<Saved<T>> {
  const base = () =>
    supabase()
      .from("agent_outputs")
      .select("id, is_golden, created_at, payload")
      .eq("student_id", studentId)
      .eq("agent", agent)
      .eq("kind", "result")
      .order("created_at", { ascending: false })
      .limit(1);
  if (demoMode) {
    const golden = rows(await base().eq("is_golden", true), `Reading golden ${agent} output`) as NonNullable<Saved<T>>[];
    if (golden[0]) return golden[0];
  }
  const any = rows(await base(), `Reading ${agent} output`) as NonNullable<Saved<T>>[];
  return any[0] ?? null;
}

export async function buildDashboard(studentId: string, demoMode: boolean): Promise<Dashboard> {
  const db = supabase();

  const handoffQuery = () =>
    db
      .from("agent_outputs")
      .select("id, agent, to_agent, consumed, is_golden, created_at, payload")
      .eq("student_id", studentId)
      .eq("kind", "handoff")
      .order("created_at", { ascending: false })
      .limit(10);

  const [student, advisor, knowledge, opportunity, patterns, profile, nodes, edges, skills, opportunities, handoffsAll] =
    await Promise.all([
      db
        .from("students")
        .select("id, name, year, major, weekly_hours")
        .eq("id", studentId)
        .maybeSingle()
        .then((r) => rows(r, "Reading student")),
      latest<AdvisorOutput>(studentId, "advisor", demoMode),
      latest<KnowledgeOutput & { _diff?: KnowledgeDiff }>(studentId, "knowledge", demoMode),
      latest<OpportunityOutput>(studentId, "opportunity", demoMode),
      latest<PatternsOutput>(studentId, "patterns", demoMode),
      db
        .from("learning_profile")
        .select("pace_by_category, method_scores, tips")
        .eq("student_id", studentId)
        .maybeSingle()
        .then((r) => rows(r, "Reading learning profile")),
      db.from("skill_nodes").select("node_id, name, category, base_hours").then((r) => rows(r, "Reading skill nodes")),
      db.from("skill_edges").select("from_node, to_node").then((r) => rows(r, "Reading skill edges")),
      db
        .from("student_skills")
        .select("node_id, mastery, confidence")
        .eq("student_id", studentId)
        .then((r) => rows(r, "Reading student skills")),
      db
        .from("opportunities")
        .select("opportunity_id, type, title, deadline, link")
        .then((r) => rows(r, "Reading opportunities")),
      handoffQuery().then((r) => rows(r, "Reading handoffs")),
    ]);

  let handoffs = handoffsAll as Handoff[];
  if (demoMode) {
    const golden = rows(await handoffQuery().eq("is_golden", true), "Reading golden handoffs") as Handoff[];
    if (golden.length) handoffs = golden;
  }

  return {
    student: student as Dashboard["student"],
    advisor,
    knowledge,
    opportunity,
    patterns,
    profile: profile as Dashboard["profile"],
    nodes: (nodes as SkillNode[]).map((n) => ({ ...n, base_hours: Number(n.base_hours) })),
    edges: edges as SkillEdge[],
    skills: (skills as StudentSkill[]).map((s) => ({ ...s, mastery: Number(s.mastery), confidence: Number(s.confidence) })),
    opportunities: opportunities as Opportunity[],
    handoffs,
  };
}
