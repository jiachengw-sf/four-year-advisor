"use server";

import { fetchRealOpportunities, type FetchedJob } from "@/lib/jobs";

export async function fetchJobs(
  keywords: string[],
): Promise<{ ok: true; jobs: FetchedJob[] } | { ok: false; error: string }> {
  try {
    return await fetchRealOpportunities(keywords);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
