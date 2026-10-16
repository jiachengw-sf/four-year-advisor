"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseAgentReply, type AgentName, type AgentOutput } from "@/lib/contracts";
import { recordCheckin, type CheckinForm, type CheckinResult } from "@/lib/checkin";
import { buildContext } from "@/lib/context";
import { buildDashboard, type Dashboard } from "@/lib/dashboard";
import { saveOutput, type SaveResult } from "@/lib/save";
import { importEvents, importOpportunities, importSkills, type ImportResult } from "@/lib/seed";
import { supabase } from "@/lib/supabase";

const seedFile = (name: string) => readFile(path.join(process.cwd(), "seed", name), "utf8");
const sampleFile = (name: string) => readFile(path.join(process.cwd(), "samples", name), "utf8");

export async function readSeedFile(name: "skills.csv" | "opportunities.csv" | "events.json"): Promise<string> {
  return seedFile(name);
}

export async function importSkillsAction(csv: string): Promise<ImportResult> {
  try {
    return await importSkills(csv);
  } catch (e) {
    return { ok: false, message: (e as Error).message, errors: [] };
  }
}

export async function importOpportunitiesAction(csv: string): Promise<ImportResult> {
  try {
    return await importOpportunities(csv);
  } catch (e) {
    return { ok: false, message: (e as Error).message, errors: [] };
  }
}

export async function importEventsAction(studentId: string, json?: string): Promise<ImportResult> {
  try {
    return await importEvents(studentId, json ?? (await seedFile("events.json")));
  } catch (e) {
    return { ok: false, message: (e as Error).message, errors: [] };
  }
}

export async function createDemoStudent(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const db = supabase();
    const { data, error } = await db.from("students").insert({ name: "Demo student" }).select("id").single();
    if (error) return { ok: false, error: error.message };
    const prof = await db.from("learning_profile").insert({ student_id: data.id });
    if (prof.error) return { ok: false, error: prof.error.message };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getStudent(studentId: string) {
  try {
    const { data, error } = await supabase()
      .from("students")
      .select("id, name, year, major, weekly_hours")
      .eq("id", studentId)
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, student: data };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function getContext(
  agent: AgentName,
  studentId: string,
): Promise<{ ok: true; context: object } | { ok: false; error: string }> {
  try {
    return { ok: true, context: await buildContext(agent, studentId) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// The paste path: extract JSON, validate with zod, then save.
export async function submitAgentReply(
  agent: AgentName,
  studentId: string,
  reply: string,
  isGolden: boolean,
): Promise<SaveResult> {
  const parsed = parseAgentReply(agent, reply);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  return saveOutput(studentId, parsed.data, isGolden);
}

export type SampleResult = { agent: AgentName; file: string; result: SaveResult };

// Saves samples/*.json through the same parse + save path as a pasted reply, marked golden.
// Order matters: opportunity runs before knowledge so the sample's placeholder handoff ids
// ("handoff-1", "handoff-2", ...) can be swapped for the real ids of the handoffs it just created.
export async function loadSamples(studentId: string): Promise<SampleResult[]> {
  const order: AgentName[] = ["input", "opportunity", "knowledge", "patterns", "advisor"];
  const results: SampleResult[] = [];
  let handoffIds: string[] = [];

  for (const agent of order) {
    const file = `samples/${agent}.json`;
    let text: string;
    try {
      text = await sampleFile(`${agent}.json`);
    } catch {
      results.push({ agent, file, result: { ok: false, errors: [`Could not read ${file}`] } });
      continue;
    }
    const parsed = parseAgentReply(agent, text);
    if (!parsed.ok) {
      results.push({ agent, file, result: { ok: false, errors: parsed.errors } });
      continue;
    }
    let data: AgentOutput = parsed.data;
    if (data.agent === "knowledge") {
      data = {
        ...data,
        consumed_handoffs: data.consumed_handoffs.map((h) => {
          const m = /^handoff-(\d+)$/.exec(h);
          return m && handoffIds[Number(m[1]) - 1] ? handoffIds[Number(m[1]) - 1] : h;
        }),
      };
    }
    const result = await saveOutput(studentId, data, true);
    if (result.ok && result.handoffIds) handoffIds = result.handoffIds;
    results.push({ agent, file, result });
  }
  return results;
}

export async function getDashboard(
  studentId: string,
  demoMode: boolean,
): Promise<{ ok: true; data: Dashboard } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await buildDashboard(studentId, demoMode) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function submitCheckin(studentId: string, form: CheckinForm): Promise<CheckinResult> {
  return recordCheckin(studentId, form);
}
