import "server-only";
import { z } from "zod";
import { parseCsv, splitList } from "./csv";
import { supabase } from "./supabase";

export type ImportResult = { ok: boolean; message: string; errors: string[] };

const NODE_ID = /^[a-z0-9_]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(message: string, errors: string[] = []): ImportResult {
  return { ok: false, message, errors };
}

// seed/skills.csv -> skill_nodes, and the prerequisites column -> skill_edges (prerequisite -> node).
export async function importSkills(csv: string): Promise<ImportResult> {
  const db = supabase();
  const parsed = parseCsv(csv);
  if (parsed.length === 0) return fail("No rows found. The CSV needs a header and at least one row.");

  const errors: string[] = [];
  const nodes: { node_id: string; name: string; category: string; base_hours: number }[] = [];
  const prereqs = new Map<string, string[]>();
  parsed.forEach((r, i) => {
    const line = i + 2;
    const id = r.node_id;
    if (!id || !NODE_ID.test(id)) return errors.push(`Row ${line}: node_id "${id ?? ""}" must be snake_case.`);
    if (!r.name) return errors.push(`Row ${line} (${id}): name is required.`);
    if (!r.category) return errors.push(`Row ${line} (${id}): category is required.`);
    const hours = r.base_hours ? Number(r.base_hours) : 5;
    if (!Number.isFinite(hours) || hours < 0) return errors.push(`Row ${line} (${id}): base_hours "${r.base_hours}" is not a number.`);
    nodes.push({ node_id: id, name: r.name, category: r.category, base_hours: hours });
    prereqs.set(id, splitList(r.prerequisites));
  });
  if (nodes.length === 0) return fail("No valid rows to import.", errors);

  const up = await db.from("skill_nodes").upsert(nodes, { onConflict: "node_id" });
  if (up.error) return fail(`Saving skill nodes failed: ${up.error.message}`, errors);

  const all = await db.from("skill_nodes").select("node_id");
  if (all.error) return fail(`Reading skill nodes failed: ${all.error.message}`, errors);
  const known = new Set(all.data.map((r: { node_id: string }) => r.node_id));

  const edges: { from_node: string; to_node: string }[] = [];
  for (const [to, froms] of prereqs) {
    for (const from of froms) {
      if (!known.has(from)) errors.push(`${to}: prerequisite "${from}" is not a node_id in the catalog, skipped.`);
      else if (from === to) errors.push(`${to}: lists itself as a prerequisite, skipped.`);
      else edges.push({ from_node: from, to_node: to });
    }
  }
  // Replace the incoming edges of every node in this CSV so removed prerequisites disappear.
  const del = await db.from("skill_edges").delete().in("to_node", [...prereqs.keys()]);
  if (del.error) return fail(`Clearing old edges failed: ${del.error.message}`, errors);
  if (edges.length) {
    const ins = await db.from("skill_edges").upsert(edges, { onConflict: "from_node,to_node" });
    if (ins.error) return fail(`Saving skill edges failed: ${ins.error.message}`, errors);
  }
  return { ok: true, message: `Imported ${nodes.length} skill nodes and ${edges.length} prerequisite edges.`, errors };
}

// seed/opportunities.csv -> opportunities.
export async function importOpportunities(csv: string): Promise<ImportResult> {
  const db = supabase();
  const parsed = parseCsv(csv);
  if (parsed.length === 0) return fail("No rows found. The CSV needs a header and at least one row.");

  const errors: string[] = [];
  const rows: object[] = [];
  const required = new Set<string>();
  parsed.forEach((r, i) => {
    const line = i + 2;
    const id = r.opportunity_id;
    if (!id) return errors.push(`Row ${line}: opportunity_id is required.`);
    if (!["club", "research", "internship"].includes(r.type)) {
      return errors.push(`Row ${line} (${id}): type "${r.type}" must be club, research, or internship.`);
    }
    if (!r.title) return errors.push(`Row ${line} (${id}): title is required.`);
    if (r.deadline && !ISO_DATE.test(r.deadline)) {
      return errors.push(`Row ${line} (${id}): deadline "${r.deadline}" must look like 2026-11-15.`);
    }
    const nodes = splitList(r.required_nodes);
    nodes.forEach((n) => required.add(n));
    rows.push({
      opportunity_id: id,
      type: r.type,
      title: r.title,
      required_nodes: nodes,
      deadline: r.deadline || null,
      link: r.link || null,
      tags: splitList(r.tags),
    });
  });
  if (rows.length === 0) return fail("No valid rows to import.", errors);

  const up = await db.from("opportunities").upsert(rows, { onConflict: "opportunity_id" });
  if (up.error) return fail(`Saving opportunities failed: ${up.error.message}`, errors);

  if (required.size) {
    const found = await db.from("skill_nodes").select("node_id").in("node_id", [...required]);
    if (!found.error) {
      const known = new Set(found.data.map((r: { node_id: string }) => r.node_id));
      const unknown = [...required].filter((n) => !known.has(n));
      if (unknown.length) errors.push(`Warning: required_nodes not in the skill catalog yet: ${unknown.join(", ")}`);
    }
  }
  return { ok: true, message: `Imported ${rows.length} opportunities.`, errors };
}

const eventSchema = z.object({
  type: z.enum(["checkin", "quiz", "resource_feedback", "goal_change"]),
  node_id: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().optional(),
});

// seed/events.json -> events for the demo student. Replaces that student's existing events.
export async function importEvents(studentId: string, json: string): Promise<ImportResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return fail(`events.json is not valid JSON: ${(e as Error).message}`);
  }
  const parsed = z.array(eventSchema).safeParse(raw);
  if (!parsed.success) {
    return fail(
      "events.json doesn't match the format in docs/agent-contracts.md.",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  }
  if (parsed.data.length === 0) return fail("events.json is an empty array. Add events first (owner: B).");

  const db = supabase();
  const del = await db.from("events").delete().eq("student_id", studentId);
  if (del.error) return fail(`Clearing old events failed: ${del.error.message}`);
  const ins = await db.from("events").insert(
    parsed.data.map((e) => ({
      student_id: studentId,
      type: e.type,
      node_id: e.node_id ?? null,
      payload: e.payload,
      ...(e.created_at ? { created_at: e.created_at } : {}),
    })),
  );
  if (ins.error) return fail(`Saving events failed: ${ins.error.message}`);
  return { ok: true, message: `Loaded ${parsed.data.length} events for the demo student.`, errors: [] };
}

// Clears the student's agent outputs, skills, and learning profile, then reloads seed/events.json.
// Catalog and opportunities are re-imported too, so the demo starts from the repo's seed files.
export async function resetDemo(
  studentId: string,
  files: { skills: string; opportunities: string; events: string },
): Promise<ImportResult> {
  const db = supabase();
  for (const table of ["agent_outputs", "student_skills"] as const) {
    const del = await db.from(table).delete().eq("student_id", studentId);
    if (del.error) return fail(`Clearing ${table} failed: ${del.error.message}`);
  }
  const prof = await db.from("learning_profile").upsert(
    { student_id: studentId, pace_by_category: {}, method_scores: {}, tips: [], updated_at: new Date().toISOString() },
    { onConflict: "student_id" },
  );
  if (prof.error) return fail(`Resetting learning profile failed: ${prof.error.message}`);

  const steps = [
    await importSkills(files.skills),
    await importOpportunities(files.opportunities),
    await importEvents(studentId, files.events),
  ];
  const failed = steps.find((s) => !s.ok);
  const errors = steps.flatMap((s) => s.errors);
  if (failed) return fail(`Cleared the demo, but reseeding failed: ${failed.message}`, errors);
  return { ok: true, message: `Cleared outputs, skills, and profile. ${steps.map((s) => s.message).join(" ")}`, errors };
}
