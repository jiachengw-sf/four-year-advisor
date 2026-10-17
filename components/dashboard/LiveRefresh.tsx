"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Re-renders the server dashboard when an agent output or skill row changes for this student.
export function LiveRefresh({ studentId }: { studentId: string }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    let channel: ReturnType<ReturnType<typeof supabase>["channel"]> | undefined;
    try {
      channel = supabase()
        .channel(`dash-${studentId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "agent_outputs", filter: `student_id=eq.${studentId}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "student_skills", filter: `student_id=eq.${studentId}` }, refresh)
        .subscribe();
    } catch {
      // Missing env vars: the page already shows the load error.
    }
    return () => {
      clearTimeout(timer);
      if (channel) supabase().removeChannel(channel);
    };
  }, [studentId, router]);

  return null;
}
