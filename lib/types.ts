// Row types for the Supabase tables in db/schema.sql. Agent output types live in lib/contracts.ts
// and are re-exported here so callers can import everything from one place.
export type {
  AgentName,
  AgentOutput,
  InputOutput,
  KnowledgeOutput,
  OpportunityOutput,
  PatternsOutput,
  AdvisorOutput,
} from "./contracts";
import type { AgentName } from "./contracts";

export type Student = {
  id: string;
  name: string | null;
  year: number | null;
  major: string | null;
  career_goals: string[];
  interests: string[];
  weekly_hours: number;
  created_at: string;
};

export type SkillNode = { node_id: string; name: string; category: string; base_hours: number };

// Learn from_node before to_node.
export type SkillEdge = { from_node: string; to_node: string };

export type StudentSkill = {
  student_id: string;
  node_id: string;
  mastery: number;
  confidence: number;
  evidence: string[];
  last_practiced: string;
};

export type MethodScores = Record<"practice" | "video" | "reading" | "project", number>;

export type LearningProfile = {
  student_id: string;
  pace_by_category: Record<string, number>;
  method_scores: Partial<MethodScores>;
  tips: string[];
  updated_at: string;
};

export type Opportunity = {
  opportunity_id: string;
  type: "club" | "research" | "internship";
  title: string;
  required_nodes: string[];
  deadline: string | null;
  link: string | null;
  tags: string[];
};

export type EventType = "checkin" | "quiz" | "resource_feedback" | "goal_change";

// payload: checkin {minutes, confidence 1-5, note?}, quiz {score 0-100}, resource_feedback {resource_type, helped}.
// Events written by the check-in math also carry payload.model_update and payload.summary.
export type StudentEvent = {
  id: string;
  student_id: string;
  type: EventType;
  node_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AgentOutputRow = {
  id: string;
  student_id: string;
  agent: AgentName;
  kind: "result" | "handoff";
  to_agent: AgentName | null;
  payload: Record<string, unknown>;
  consumed: boolean;
  is_golden: boolean;
  created_at: string;
};
