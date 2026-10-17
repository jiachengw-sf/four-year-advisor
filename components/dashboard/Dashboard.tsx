import Link from "next/link";
import { connection } from "next/server";
import { CheckinButton } from "@/components/checkin/CheckinButton";
import { KnowledgeGraph } from "@/components/graph/KnowledgeGraph";
import { loadGraph } from "@/lib/model";
import {
  HandoffFeed,
  HowToLearn,
  LearnNext,
  LearningPatterns,
  ThisWeek,
  WhatChanged,
  WhatElse,
  makeLookups,
} from "./cards";
import { loadDashboard } from "./data";
import { LiveRefresh } from "./LiveRefresh";
import { Card } from "./ui";

export async function Dashboard() {
  await connection();

  let data;
  let graph;
  try {
    data = await loadDashboard();
    if (data) graph = await loadGraph(data.student.id);
  } catch (e) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
        Could not load the dashboard: {(e as Error).message}
      </p>
    );
  }
  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <h1 className="text-xl font-semibold">No demo student yet</h1>
        <p className="mt-2 text-sm text-zinc-500">
          <Link href="/admin" className="underline underline-offset-4">
            Create one in Admin
          </Link>
          , then load samples or run the agents.
        </p>
      </div>
    );
  }

  const l = makeLookups(data);
  const s = data.student;

  return (
    <div className="space-y-6">
      <LiveRefresh studentId={s.id} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Your 4-year advisor</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{s.name ?? "Demo student"}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {[s.year && `Year ${s.year}`, s.major, s.career_goals?.[0] && `Goal: ${s.career_goals[0]}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {s.weekly_hours ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-right dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-2xl font-semibold tabular-nums">{s.weekly_hours}h</p>
            <p className="text-xs text-zinc-500">available per week</p>
          </div>
        ) : null}
      </div>

      <ThisWeek d={data} l={l} />

      <WhatChanged d={data} l={l} />

      <div className="grid gap-6 lg:grid-cols-2">
        <LearnNext d={data} l={l} />
        <HowToLearn d={data} l={l} />
      </div>

      {/* Agent D's knowledge graph */}
      <div id="graph-slot">
        {graph && (
          <Card title="Knowledge map" source="Live model">
            <KnowledgeGraph nodes={graph.nodes} edges={graph.edges} />
          </Card>
        )}
      </div>

      <WhatElse d={data} l={l} />

      <div className="grid gap-6 lg:grid-cols-2">
        <HandoffFeed d={data} l={l} />
        <LearningPatterns d={data} l={l} />
      </div>

      {/* Agent D's check-in button: positions itself fixed bottom-right */}
      <div id="checkin-slot">
        {graph && (
          <CheckinButton studentId={s.id} skills={graph.nodes.map((n) => ({ node_id: n.node_id, name: n.name }))} />
        )}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-16 w-64 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-48 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-32 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
