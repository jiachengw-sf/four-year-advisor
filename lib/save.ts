import "server-only";
import { supabase } from "./supabase";
import type {
  AdvisorOutput,
  AgentName,
  AgentOutput,
  InputOutput,
  KnowledgeOutput,
  OpportunityOutput,
  PatternsOutput,
} from "./contracts";

export type SaveResult =
  | { ok: true; id: string; warnings: string[]; handoffIds?: string[] }
  | { ok: false; errors: string[] };

class SaveError extends Error {}

// Unwraps a Supabase response, turning its error into a readable SaveError.
function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new SaveError(`${what}: ${res.error.message}`);
  return res.data as T;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function referencedNodes(out: AgentOutput): string[] {
  switch (out.agent) {
    case "input":
      return [...out.skills.map((s) => s.node_id), ...out.verify_nodes];
    case "knowledge":
      return out.learn_next.map((l) => l.node_id);
    case "opportunity":
      return [...out.almost.flatMap((a) => a.missing_nodes), ...out.handoffs.flatMap((h) => h.missing_nodes)];
    case "patterns":
      return out.skill_deltas.map((d) => d.node_id);
    case "advisor":
      return out.this_week.map((t) => t.node_id);
  }
}

function referencedOpportunities(out: AgentOutput): string[] {
  if (out.agent !== "opportunity") return [];
  return [...out.ready, ...out.almost, ...out.long_term, ...out.handoffs].map((o) => o.opportunity_id);
}

// "Never invent new ids": every node_id / opportunity_id must already be in the catalog.
async function checkIds(out: AgentOutput): Promise<string[]> {
  const db = supabase();
  const errors: string[] = [];
  const nodes = [...new Set(referencedNodes(out))];
  if (nodes.length) {
    const found = must(await db.from("skill_nodes").select("node_id").in("node_id", nodes), "Checking node_ids");
    const known = new Set(found.map((r: { node_id: string }) => r.node_id));
    const missing = nodes.filter((n) => !known.has(n));
    if (missing.length) {
      errors.push(
        `Unknown node_id(s) not in the skill catalog: ${missing.join(", ")}. Load seed/skills.csv in /admin, or fix the agent's ids.`,
      );
    }
  }
  const opps = [...new Set(referencedOpportunities(out))];
  if (opps.length) {
    const found = must(
      await db.from("opportunities").select("opportunity_id").in("opportunity_id", opps),
      "Checking opportunity_ids",
    );
    const known = new Set(found.map((r: { opportunity_id: string }) => r.opportunity_id));
    const missing = opps.filter((o) => !known.has(o));
    if (missing.length) {
      errors.push(
        `Unknown opportunity_id(s) not in the opportunities list: ${missing.join(", ")}. Load seed/opportunities.csv in /admin, or fix the agent's ids.`,
      );
    }
  }
  return errors;
}

async function insertResult(studentId: string, agent: AgentName, payload: object, isGolden: boolean) {
  const row = must<{ id: string }>(
    await supabase()
      .from("agent_outputs")
      .insert({ student_id: studentId, agent, kind: "result", payload, is_golden: isGolden })
      .select("id")
      .single(),
    "Saving agent output",
  );
  return row.id;
}

async function saveInput(studentId: string, out: InputOutput, isGolden: boolean): Promise<SaveResult> {
  const db = supabase();
  must(
    await db
      .from("students")
      .update({
        name: out.student.name,
        year: out.student.year,
        major: out.student.major,
        career_goals: out.student.career_goals,
        interests: out.student.interests,
        weekly_hours: Math.round(out.student.weekly_hours),
      })
      .eq("id", studentId),
    "Updating student",
  );

  const nodeIds = out.skills.map((s) => s.node_id);
  const existing = nodeIds.length
    ? must(
        await db.from("student_skills").select("node_id, evidence").eq("student_id", studentId).in("node_id", nodeIds),
        "Reading student skills",
      )
    : [];
  const evidenceByNode = new Map<string, string[]>(
    existing.map((r: { node_id: string; evidence: string[] | null }) => [r.node_id, r.evidence ?? []]),
  );
  const rows = out.skills.map((s) => {
    const prior = evidenceByNode.get(s.node_id) ?? [];
    const evidence = s.evidence && !prior.includes(s.evidence) ? [...prior, s.evidence] : prior;
    return {
      student_id: studentId,
      node_id: s.node_id,
      mastery: s.mastery,
      confidence: s.confidence,
      evidence,
      last_practiced: new Date().toISOString(),
    };
  });
  if (rows.length) {
    must(await db.from("student_skills").upsert(rows, { onConflict: "student_id,node_id" }), "Saving student skills");
  }

  const id = await insertResult(studentId, "input", out, isGolden);
  return { ok: true, id, warnings: [] };
}

export type KnowledgeDiff = {
  previous_id: string | null;
  new_items: string[];
  removed_items: string[];
  rank_changes: { node_id: string; from: number; to: number }[];
};

export function diffLearnNext(prev: string[], next: string[], previousId: string | null): KnowledgeDiff {
  const prevRank = new Map(prev.map((n, i) => [n, i + 1]));
  const nextRank = new Map(next.map((n, i) => [n, i + 1]));
  return {
    previous_id: previousId,
    new_items: next.filter((n) => !prevRank.has(n)),
    removed_items: prev.filter((n) => !nextRank.has(n)),
    rank_changes: next
      .filter((n) => prevRank.has(n) && prevRank.get(n) !== nextRank.get(n))
      .map((n) => ({ node_id: n, from: prevRank.get(n)!, to: nextRank.get(n)! })),
  };
}

async function saveKnowledge(studentId: string, out: KnowledgeOutput, isGolden: boolean): Promise<SaveResult> {
  const db = supabase();
  const warnings: string[] = [];

  const prevRows = must(
    await db
      .from("agent_outputs")
      .select("id, payload")
      .eq("student_id", studentId)
      .eq("agent", "knowledge")
      .eq("kind", "result")
      .order("created_at", { ascending: false })
      .limit(1),
    "Reading previous knowledge output",
  ) as { id: string; payload: KnowledgeOutput }[];
  const prev = prevRows[0];
  const _diff = diffLearnNext(
    prev?.payload?.learn_next?.map((l) => l.node_id) ?? [],
    out.learn_next.map((l) => l.node_id),
    prev?.id ?? null,
  );

  const requested = [...new Set(out.consumed_handoffs)];
  const malformed = requested.filter((h) => !UUID.test(h));
  if (malformed.length) warnings.push(`Ignored handoff ids that aren't valid ids: ${malformed.join(", ")}`);
  const valid = requested.filter((h) => UUID.test(h));
  if (valid.length) {
    const updated = must(
      await db
        .from("agent_outputs")
        .update({ consumed: true })
        .eq("student_id", studentId)
        .eq("kind", "handoff")
        .in("id", valid)
        .select("id"),
      "Marking handoffs consumed",
    ) as { id: string }[];
    const done = new Set(updated.map((r) => r.id));
    const notFound = valid.filter((h) => !done.has(h));
    if (notFound.length) warnings.push(`No handoff found for this student with id(s): ${notFound.join(", ")}`);
  }

  const id = await insertResult(studentId, "knowledge", { ...out, _diff }, isGolden);
  return { ok: true, id, warnings };
}

async function saveOpportunity(studentId: string, out: OpportunityOutput, isGolden: boolean): Promise<SaveResult> {
  const id = await insertResult(studentId, "opportunity", out, isGolden);
  let handoffIds: string[] = [];
  if (out.handoffs.length) {
    const rows = must(
      await supabase()
        .from("agent_outputs")
        .insert(
          out.handoffs.map((h) => ({
            student_id: studentId,
            agent: "opportunity",
            kind: "handoff",
            to_agent: h.to_agent,
            payload: h,
            is_golden: isGolden,
          })),
        )
        .select("id"),
      "Saving handoffs",
    ) as { id: string }[];
    handoffIds = rows.map((r) => r.id);
  }
  return { ok: true, id, warnings: [], handoffIds };
}

async function savePatterns(studentId: string, out: PatternsOutput, isGolden: boolean): Promise<SaveResult> {
  const db = supabase();
  const nodeIds = out.skill_deltas.map((d) => d.node_id);
  if (nodeIds.length) {
    const current = must(
      await db.from("student_skills").select("node_id, mastery, confidence").eq("student_id", studentId).in("node_id", nodeIds),
      "Reading student skills",
    ) as { node_id: string; mastery: number; confidence: number }[];
    const byNode = new Map(current.map((r) => [r.node_id, r]));
    const rows = out.skill_deltas.map((d) => {
      const cur = byNode.get(d.node_id);
      return {
        student_id: studentId,
        node_id: d.node_id,
        mastery: clamp01(Number(cur?.mastery ?? 0) + d.mastery_delta),
        confidence: clamp01(Number(cur?.confidence ?? 0) + d.confidence_delta),
        last_practiced: new Date().toISOString(),
      };
    });
    must(await db.from("student_skills").upsert(rows, { onConflict: "student_id,node_id" }), "Applying skill deltas");
  }

  const profile = must(
    await db.from("learning_profile").select("pace_by_category").eq("student_id", studentId).maybeSingle(),
    "Reading learning profile",
  ) as { pace_by_category: Record<string, number> | null } | null;
  const pace = { ...(profile?.pace_by_category ?? {}) };
  for (const p of out.pace_updates) pace[p.category] = p.multiplier;
  must(
    await db.from("learning_profile").upsert(
      {
        student_id: studentId,
        pace_by_category: pace,
        method_scores: out.method_scores,
        tips: out.tips,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    ),
    "Updating learning profile",
  );

  const id = await insertResult(studentId, "patterns", out, isGolden);
  return { ok: true, id, warnings: [] };
}

async function saveAdvisor(studentId: string, out: AdvisorOutput, isGolden: boolean): Promise<SaveResult> {
  const warnings: string[] = [];
  const student = must(
    await supabase().from("students").select("weekly_hours").eq("id", studentId).maybeSingle(),
    "Reading weekly hours",
  ) as { weekly_hours: number | null } | null;
  const total = out.this_week.reduce((sum, t) => sum + t.hours, 0);
  if (student?.weekly_hours && total > student.weekly_hours) {
    warnings.push(`This week's plan is ${total}h but the student has ${student.weekly_hours}h a week.`);
  }
  const id = await insertResult(studentId, "advisor", out, isGolden);
  return { ok: true, id, warnings };
}

export async function saveOutput(studentId: string, out: AgentOutput, isGolden: boolean): Promise<SaveResult> {
  try {
    const student = must(
      await supabase().from("students").select("id").eq("id", studentId).maybeSingle(),
      "Finding student",
    );
    if (!student) return { ok: false, errors: ["No demo student with this id. Create one in /admin."] };

    const idErrors = await checkIds(out);
    if (idErrors.length) return { ok: false, errors: idErrors };

    switch (out.agent) {
      case "input":
        return await saveInput(studentId, out, isGolden);
      case "knowledge":
        return await saveKnowledge(studentId, out, isGolden);
      case "opportunity":
        return await saveOpportunity(studentId, out, isGolden);
      case "patterns":
        return await savePatterns(studentId, out, isGolden);
      case "advisor":
        return await saveAdvisor(studentId, out, isGolden);
    }
  } catch (e) {
    return { ok: false, errors: [(e as Error).message] };
  }
}
