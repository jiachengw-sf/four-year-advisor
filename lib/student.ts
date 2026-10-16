import "server-only";
import { supabase } from "./supabase";

// The demo student is the first row of students (oldest first). Null if there isn't one yet.
export async function getDemoStudentId(): Promise<string | null> {
  const { data, error } = await supabase()
    .from("students")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Reading demo student: ${error.message}`);
  return data?.id ?? null;
}

// Returns the demo student's id, creating the student and an empty learning profile if needed.
export async function ensureDemoStudent(): Promise<{ id: string; created: boolean }> {
  const existing = await getDemoStudentId();
  if (existing) return { id: existing, created: false };
  const db = supabase();
  const { data, error } = await db.from("students").insert({ name: "Demo student" }).select("id").single();
  if (error) throw new Error(`Creating demo student: ${error.message}`);
  const prof = await db.from("learning_profile").insert({ student_id: data.id });
  if (prof.error) throw new Error(`Creating learning profile: ${prof.error.message}`);
  return { id: data.id, created: true };
}
