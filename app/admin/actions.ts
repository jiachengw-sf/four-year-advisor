"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { resetDemo, type ImportResult } from "@/lib/seed";

const seedFile = (name: string) => readFile(path.join(process.cwd(), "seed", name), "utf8");

export async function resetDemoAction(studentId: string): Promise<ImportResult> {
  try {
    return await resetDemo(studentId, {
      skills: await seedFile("skills.csv"),
      opportunities: await seedFile("opportunities.csv"),
      events: await seedFile("events.json"),
    });
  } catch (e) {
    return { ok: false, message: (e as Error).message, errors: [] };
  }
}
