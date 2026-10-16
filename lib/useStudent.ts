"use client";

import { useEffect, useState } from "react";

const KEY = "demoStudentId";

// The single demo student's id lives in localStorage so every page uses the same one.
export function useStudentId() {
  const [id, setIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setIdState(localStorage.getItem(KEY));
    } catch {
      // Storage blocked: fall back to no student.
    }
    setReady(true);
  }, []);

  const setId = (next: string | null) => {
    try {
      if (next) localStorage.setItem(KEY, next);
      else localStorage.removeItem(KEY);
    } catch {
      // Storage blocked: keep it in memory for this page.
    }
    setIdState(next);
  };

  return { studentId: id, setStudentId: setId, ready };
}
