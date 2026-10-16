"use client";

import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

// Calls onChange (debounced) when a teammate writes agent_outputs or student_skills for this student.
// The tables must be in the supabase_realtime publication (see db/schema.sql).
export function useRealtime(studentId: string | null, onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!studentId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 300);
    };
    let channel: ReturnType<ReturnType<typeof supabase>["channel"]> | undefined;
    try {
      channel = supabase()
        .channel(`dashboard-${studentId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "agent_outputs", filter: `student_id=eq.${studentId}` }, fire)
        .on("postgres_changes", { event: "*", schema: "public", table: "student_skills", filter: `student_id=eq.${studentId}` }, fire)
        .subscribe();
    } catch {
      // Missing env vars: the dashboard shows the error from its own fetch.
    }
    return () => {
      clearTimeout(timer);
      if (channel) supabase().removeChannel(channel);
    };
  }, [studentId]);
}
