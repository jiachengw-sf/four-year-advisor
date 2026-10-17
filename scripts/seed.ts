// npm run seed: loads the skill catalog, opportunities, the demo student, and its events.
// Uses the same importers as /admin.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { importEvents, importOpportunities, importSkills, type ImportResult } from "../lib/seed";
import { ensureDemoStudent } from "../lib/student";

const seedFile = (name: string) => readFile(path.join(process.cwd(), "seed", name), "utf8");

function report(what: string, r: ImportResult) {
  console.log(`${r.ok ? "ok  " : "FAIL"} ${what}: ${r.message}`);
  for (const e of r.errors) console.log(`     ${e}`);
  return r.ok;
}

async function main() {
  let ok = report("skills", await importSkills(await seedFile("skills.csv")));
  ok = report("opportunities", await importOpportunities(await seedFile("opportunities.csv"))) && ok;
  const student = await ensureDemoStudent();
  console.log(`ok   demo student: ${student.id}${student.created ? " (created)" : ""}`);
  ok = report("events", await importEvents(student.id, await seedFile("events.json"))) && ok;
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
