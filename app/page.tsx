"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Dashboard } from "@/lib/dashboard";
import { useDemoMode } from "@/lib/useDemoMode";
import { useRealtime } from "@/lib/useRealtime";
import { useStudentId } from "@/lib/useStudent";
import { getDashboard } from "./actions";
import { CheckIn } from "./CheckIn";
import { DashboardView } from "./DashboardView";

export default function DashboardPage() {
  const { studentId, ready } = useStudentId();
  const [demoMode] = useDemoMode();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    const r = await getDashboard(studentId, demoMode);
    if (r.ok) {
      setData(r.data);
      setError(null);
    } else {
      setError(r.error);
    }
  }, [studentId, demoMode]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(studentId, load);

  if (!ready) return null;
  if (!studentId) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">4-Year Advisor</h1>
        <p>
          No demo student yet. <Link href="/admin" className="underline">Create one in Admin</Link>, then load
          samples or paste agent replies in <Link href="/agents" className="underline">Agents</Link>.
        </p>
      </div>
    );
  }
  if (error) return <p className="text-red-600">Could not load the dashboard: {error}</p>;
  if (!data) return <p className="text-zinc-500">Loading...</p>;

  return (
    <>
      <DashboardView data={data} />
      <CheckIn
        studentId={studentId}
        nodes={data.nodes}
        defaultNode={data.knowledge?.payload.learn_next[0]?.node_id}
        onSaved={load}
      />
    </>
  );
}

