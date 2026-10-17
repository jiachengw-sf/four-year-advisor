import { supabase } from "@/lib/supabase";

// Real internship postings from companies' public Greenhouse job boards
// (boards-api.greenhouse.io, the public API the boards themselves use). They replace the
// previously fetched rows (ids start with JOB_PREFIX) in `opportunities`, so the Opportunity
// agent's context lists them and its reply validates against them.
// Indeed and LinkedIn block automated access, so they are not used.
export const JOB_PREFIX = "opp_job_";
const BOARDS = ["stripe", "databricks", "coinbase", "robinhood", "figma", "duolingo", "airbnb", "reddit"];
const MAX_ROWS = 10;

type GhJob = { id: number; title: string; absolute_url: string; location?: { name?: string }; company_name?: string };

export type FetchedJob = {
  opportunity_id: string;
  type: "internship";
  title: string;
  required_nodes: string[];
  deadline: null;
  link: string;
  tags: string[];
};

// Heuristic: which catalog skills a posting plausibly needs, from its title.
function requiredNodes(title: string): string[] {
  const t = title.toLowerCase();
  if (/machine learning|\bml\b|\bai\b|data scien|research/.test(t)) return ["python_basics", "linear_algebra", "ml_basics"];
  if (/software|engineer|developer|backend|full.?stack|infrastructure|swe/.test(t)) return ["python_basics", "graph_algorithms"];
  return ["python_basics"];
}

function score(title: string, keywords: string[]): number {
  const t = title.toLowerCase();
  return keywords.reduce((n, k) => n + (k && t.includes(k) ? 1 : 0), 0);
}

async function board(name: string): Promise<FetchedJob[]> {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${name}/jobs`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const { jobs } = (await res.json()) as { jobs: GhJob[] };
    return jobs
      .filter((j) => /\bintern(ship)?\b/i.test(j.title) && !/high school/i.test(j.title))
      .map((j) => ({
        opportunity_id: `${JOB_PREFIX}${name}_${j.id}`,
        type: "internship" as const,
        title: `${j.company_name ?? name}: ${j.title}`,
        required_nodes: requiredNodes(j.title),
        deadline: null,
        link: j.absolute_url,
        tags: [name, ...(j.location?.name ? [j.location.name.toLowerCase()] : [])],
      }));
  } catch {
    return [];
  }
}

export async function fetchRealOpportunities(
  keywords: string[],
): Promise<{ ok: true; jobs: FetchedJob[] } | { ok: false; error: string }> {
  const kws = keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
  const all = (await Promise.all(BOARDS.map(board))).flat();
  if (all.length === 0) return { ok: false, error: "No postings came back from the job boards. Check the internet connection." };

  // Best keyword match first; ties favor software/ML roles over unrelated ones.
  const scored = all
    .map((j) => ({ j, s: score(j.title, kws) * 10 + (j.required_nodes.length > 1 ? 1 : 0) }))
    .sort((a, b) => b.s - a.s);
  // Spread across companies: at most 2 postings per company, no repeated titles.
  const perCompany: Record<string, number> = {};
  const seen = new Set<string>();
  const picked: FetchedJob[] = [];
  for (const { j } of scored) {
    const c = j.tags[0];
    const key = j.title.trim().toLowerCase();
    if ((perCompany[c] ?? 0) >= 2 || seen.has(key)) continue;
    perCompany[c] = (perCompany[c] ?? 0) + 1;
    seen.add(key);
    picked.push(j);
    if (picked.length >= MAX_ROWS) break;
  }

  const db = supabase();
  const del = await db.from("opportunities").delete().like("opportunity_id", `${JOB_PREFIX}%`);
  if (del.error) return { ok: false, error: `Clearing old postings failed: ${del.error.message}` };
  const up = await db.from("opportunities").upsert(picked, { onConflict: "opportunity_id" });
  if (up.error) return { ok: false, error: `Saving postings failed: ${up.error.message}` };
  return { ok: true, jobs: picked };
}
