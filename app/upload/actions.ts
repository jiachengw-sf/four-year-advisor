"use server";

import { fetchRealOpportunities, type FetchedJob } from "@/lib/jobs";
import { supabase } from "@/lib/supabase";

export async function fetchJobs(
  keywords: string[],
): Promise<{ ok: true; jobs: FetchedJob[] } | { ok: false; error: string }> {
  try {
    return await fetchRealOpportunities(keywords);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function createStudent(
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const db = supabase();
    const { data, error } = await db.from("students").insert({ name: name.trim() || "New student" }).select("id").single();
    if (error) return { ok: false, error: error.message };
    const prof = await db.from("learning_profile").insert({ student_id: data.id });
    if (prof.error) return { ok: false, error: prof.error.message };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
