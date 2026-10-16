"use client";

import { useMemo } from "react";
import type { Dashboard } from "@/lib/dashboard";
import { adjustedHours, describeDiff, describeHandoff } from "@/lib/describe";
import { KnowledgeGraph } from "./KnowledgeGraph";

function Panel({
  title,
  children,
  golden,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  golden?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {golden && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            golden
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-zinc-500 dark:text-zinc-400">{children}</p>
);

const METHOD_COLOR: Record<string, string> = {
  practice: "bg-emerald-500",
  video: "bg-sky-500",
  reading: "bg-violet-500",
  project: "bg-amber-500",
};

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  const date = new Date(`${d}T00:00:00`);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardView({ data }: { data: Dashboard }) {
  const lookups = useMemo(() => {
    const nodes = new Map((data?.nodes ?? []).map((n) => [n.node_id, n]));
    const opps = new Map((data?.opportunities ?? []).map((o) => [o.opportunity_id, o]));
    return {
      nodeName: (id: string) => nodes.get(id)?.name ?? id,
      nodeCategory: (id: string) => nodes.get(id)?.category,
      opp: (id: string) => opps.get(id),
    };
  }, [data]);

  const { advisor, knowledge, opportunity, patterns, profile } = data;
  const pace = profile?.pace_by_category ?? {};
  const methodScores: Record<string, number> = patterns?.payload.method_scores ?? profile?.method_scores ?? {};
  const tips = patterns?.payload.tips ?? profile?.tips ?? [];
  const learnNext = knowledge?.payload.learn_next ?? [];
  const top = learnNext[0];
  const changes = [
    ...(data.lastCheckin ? [`Check-in: ${data.lastCheckin.summary}`] : []),
    ...describeDiff(knowledge?.payload._diff, lookups.nodeName),
    ...(advisor?.payload.what_changed ?? []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">
          {data.student?.name ?? "Demo student"}
          {data.student?.major && (
            <span className="ml-2 text-base font-normal text-zinc-500">
              Year {data.student.year} · {data.student.major}
            </span>
          )}
        </h1>
        {data.student?.weekly_hours && (
          <span className="text-sm text-zinc-500">{data.student.weekly_hours} hours/week available</span>
        )}
      </div>

      {/* 1. This week */}
      {advisor && advisor.payload.this_week.length > 0 && (
        <Panel title="This week" golden={advisor.is_golden}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {advisor.payload.this_week.map((t, i) => (
              <li key={i} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{t.title}</p>
                  <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{t.hours}h</span>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.reason}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* 2. What changed and why */}
      <Panel title="What changed and why" golden={knowledge?.is_golden || advisor?.is_golden}>
        {changes.length ? (
          <ul className="space-y-1.5 text-sm">
            {changes.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-500">●</span>
                {c}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No changes yet. Save a knowledge or advisor output to see what changed.</Empty>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 3. What should I learn */}
        <Panel title="What should I learn" golden={knowledge?.is_golden}>
          {learnNext.length ? (
            <ol className="space-y-3">
              {learnNext.map((l, i) => {
                const category = lookups.nodeCategory(l.node_id);
                const mult = category ? pace[category] : undefined;
                const hours = adjustedHours(l.est_hours, mult);
                return (
                  <li key={l.node_id} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium">
                        {lookups.nodeName(l.node_id)}{" "}
                        <span className="text-sm font-normal text-zinc-500">
                          ~{hours}h
                          {mult && mult !== 1 && (
                            <> (base {l.est_hours}h × {mult} pace for {category})</>
                          )}
                        </span>
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{l.reason}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty>No learning plan yet. Run the Knowledge agent.</Empty>
          )}
        </Panel>

        {/* 4. How should I learn it */}
        <Panel title="How should I learn it" golden={knowledge?.is_golden}>
          {top ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500">For {lookups.nodeName(top.node_id)}, best methods first:</p>
              <ul className="space-y-2">
                {[...top.resources]
                  .sort((a, b) => (methodScores[b.type] ?? 0) - (methodScores[a.type] ?? 0))
                  .map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium text-white ${METHOD_COLOR[r.type] ?? "bg-zinc-500"}`}
                      >
                        {r.type}
                      </span>
                      <a href={r.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                        {r.title}
                      </a>
                      {methodScores[r.type] !== undefined && (
                        <span className="ml-auto text-xs text-zinc-500">
                          works {Math.round(methodScores[r.type] * 100)}% for you
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
              {top.milestones.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">Milestones</p>
                  <ul className="space-y-1 text-sm">
                    {top.milestones.map((m, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-zinc-400">☐</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Empty>No resources yet.</Empty>
          )}
        </Panel>
      </div>

      {/* 5. What else do I need */}
      <Panel title="What else do I need" golden={opportunity?.is_golden}>
        {opportunity ? (
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                ["Ready now", opportunity.payload.ready, "border-emerald-400"],
                ["Almost ready", opportunity.payload.almost, "border-amber-400"],
                ["Long term", opportunity.payload.long_term, "border-zinc-300 dark:border-zinc-700"],
              ] as const
            ).map(([label, items, border]) => (
              <div key={label}>
                <h3 className="mb-2 text-sm font-medium text-zinc-500">{label}</h3>
                {items.length === 0 && <Empty>None</Empty>}
                <ul className="space-y-2">
                  {items.map((it) => {
                    const o = lookups.opp(it.opportunity_id);
                    const deadline = formatDate(("deadline" in it && it.deadline) || o?.deadline);
                    const missing = "missing_nodes" in it ? it.missing_nodes : [];
                    return (
                      <li key={it.opportunity_id} className={`rounded-lg border-l-4 bg-zinc-50 p-3 dark:bg-zinc-950 ${border}`}>
                        <div className="flex items-start justify-between gap-2">
                          {o?.link ? (
                            <a href={o.link} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                              {o.title}
                            </a>
                          ) : (
                            <span className="font-medium">{o?.title ?? it.opportunity_id}</span>
                          )}
                          {deadline && <span className="shrink-0 text-xs text-zinc-500">due {deadline}</span>}
                        </div>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{it.reason}</p>
                        {missing.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {missing.map((n) => (
                              <span
                                key={n}
                                className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300"
                              >
                                needs {lookups.nodeName(n)}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No opportunities yet. Run the Opportunity agent.</Empty>
        )}
      </Panel>

      {/* 6. Handoff feed */}
      <Panel title="Handoff feed">
        {data.handoffs.length ? (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.handoffs.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  {describeHandoff(
                    h.agent,
                    h.to_agent,
                    h.payload.missing_nodes,
                    h.payload.opportunity_id ? lookups.opp(h.payload.opportunity_id)?.title : undefined,
                  )}
                  {h.payload.missing_nodes && h.payload.missing_nodes.length > 0 && (
                    <span className="text-zinc-500"> ({h.payload.missing_nodes.map(lookups.nodeName).join(", ")})</span>
                  )}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    h.consumed
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {h.consumed ? "consumed" : "waiting"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No handoffs yet.</Empty>
        )}
      </Panel>

      {/* 7. Knowledge graph */}
      <Panel title="Knowledge graph">
        <div className="mb-2 flex flex-wrap gap-3 text-xs text-zinc-500">
          <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" /> below 40%</span>
          <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" /> 40–69%</span>
          <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" /> 70%+</span>
          <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-300" /> no data</span>
        </div>
        <KnowledgeGraph nodes={data.nodes} edges={data.edges} skills={data.skills} />
      </Panel>

      {/* 8. Learning patterns */}
      <Panel title="Learning patterns" golden={patterns?.is_golden}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-500">Tips</h3>
            {tips.length ? (
              <ul className="space-y-1.5 text-sm">
                {tips.map((t, i) => (
                  <li key={i}>💡 {t}</li>
                ))}
              </ul>
            ) : (
              <Empty>No tips yet. Run the Learning Patterns agent.</Empty>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-500">What works for you</h3>
            {Object.keys(methodScores).length ? (
              <ul className="space-y-2">
                {Object.entries(methodScores)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, score]) => (
                    <li key={method} className="flex items-center gap-2 text-sm">
                      <span className="w-16 capitalize">{method}</span>
                      <div className="h-2.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-2.5 rounded-full ${METHOD_COLOR[method] ?? "bg-zinc-500"}`}
                          style={{ width: `${Math.round(score * 100)}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs text-zinc-500">{Math.round(score * 100)}%</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <Empty>No method scores yet.</Empty>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
