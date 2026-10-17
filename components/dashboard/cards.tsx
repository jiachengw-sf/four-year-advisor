import type { DashboardData, Opportunity, SkillNode, StudentSkill } from "./data";
import { METHODS, agentLabel, daysUntil, describeDiff, formatDate, paceHours, pct, timeAgo } from "./format";
import { Bar, Card, Empty, METHOD_STYLE, Pill } from "./ui";

export type Lookups = {
  node: (id: string) => SkillNode | undefined;
  name: (id: string) => string;
  skill: (id: string) => StudentSkill | undefined;
  opp: (id: string) => Opportunity | undefined;
  pace: Record<string, number>;
  methodScores: Record<string, number>;
  now: Date;
};

export function makeLookups(d: DashboardData): Lookups {
  const nodes = new Map(d.nodes.map((n) => [n.node_id, n]));
  const skills = new Map(d.skills.map((s) => [s.node_id, s]));
  const opps = new Map(d.opportunities.map((o) => [o.opportunity_id, o]));
  return {
    node: (id) => nodes.get(id),
    name: (id) => nodes.get(id)?.name ?? id,
    skill: (id) => skills.get(id),
    opp: (id) => opps.get(id),
    pace: d.profile?.pace_by_category ?? {},
    methodScores: d.patterns?.payload.method_scores ?? d.profile?.method_scores ?? {},
    now: new Date(),
  };
}

function Deadline({ date, now }: { date: string | null | undefined; now: Date }) {
  const days = daysUntil(date, now);
  if (days === null) return null;
  const tone = days < 0 ? "zinc" : days <= 28 ? "rose" : "zinc";
  const when = days < 0 ? "closed" : days === 0 ? "today" : `in ${days}d`;
  return (
    <Pill tone={tone}>
      Due {formatDate(date)} · {when}
    </Pill>
  );
}

/* 1. This week */
export function ThisWeek({ d, l }: { d: DashboardData; l: Lookups }) {
  const items = d.advisor?.payload.this_week ?? [];
  const total = Math.round(items.reduce((s, t) => s + t.hours, 0) * 10) / 10;
  const budget = d.student.weekly_hours;
  return (
    <Card step={1} title="This week" source="Advisor" golden={d.advisor?.is_golden}>
      {items.length ? (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((t, i) => (
              <li
                key={i}
                className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium leading-snug">{t.title}</p>
                  <span className="shrink-0 text-lg font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                    {t.hours}h
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">{l.name(t.node_id)}</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t.reason}</p>
              </li>
            ))}
          </ul>
          {budget ? (
            <div className="mt-4 flex items-center gap-3 text-sm text-zinc-500">
              <div className="max-w-xs flex-1">
                <Bar value={total / budget} className={total > budget ? "bg-rose-500" : "bg-indigo-500"} />
              </div>
              <span className="tabular-nums">
                {total}h of {budget}h available
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <Empty>No plan for this week yet. Run the Advisor agent.</Empty>
      )}
    </Card>
  );
}

/* 2. What changed and why */
export function WhatChanged({ d, l }: { d: DashboardData; l: Lookups }) {
  const lines = [
    ...describeDiff(d.knowledge?.payload._diff, l.name).map((text) => ({ from: "Knowledge", text })),
    ...(d.advisor?.payload.what_changed ?? []).map((text) => ({ from: "Advisor", text })),
  ];
  return (
    <Card step={2} title="What changed and why" golden={d.knowledge?.is_golden || d.advisor?.is_golden}>
      {lines.length ? (
        <ol className="relative space-y-3 border-l border-zinc-200 pl-5 dark:border-zinc-800">
          {lines.map((c, i) => (
            <li key={i} className="relative text-sm">
              <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500 dark:border-zinc-900" />
              <span className="mr-2 text-xs font-medium text-zinc-400">{c.from}</span>
              {c.text}
            </li>
          ))}
        </ol>
      ) : (
        <Empty>Nothing has changed yet. Changes appear after a check-in and a re-run.</Empty>
      )}
    </Card>
  );
}

/* 3. What should I learn */
export function LearnNext({ d, l }: { d: DashboardData; l: Lookups }) {
  const items = d.knowledge?.payload.learn_next ?? [];
  return (
    <Card step={3} title="What should I learn" source="Knowledge" golden={d.knowledge?.is_golden}>
      {items.length ? (
        <ol className="space-y-4">
          {items.map((it, i) => {
            const category = l.node(it.node_id)?.category;
            const { hours, multiplier } = paceHours(it.est_hours, category ? l.pace[category] : undefined);
            const mastery = l.skill(it.node_id)?.mastery;
            return (
              <li key={it.node_id} className="flex gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="font-semibold">{l.name(it.node_id)}</p>
                    <p className="text-sm tabular-nums">
                      <span className="font-semibold">~{hours}h</span>
                      {multiplier !== 1 && (
                        <span className="text-zinc-500">
                          {" "}
                          ({it.est_hours}h × {multiplier} {category} pace)
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{it.reason}</p>
                  {mastery !== undefined && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                      <span className="w-14">Mastery</span>
                      <div className="max-w-40 flex-1">
                        <Bar
                          value={mastery}
                          className={mastery < 0.4 ? "bg-rose-500" : mastery < 0.7 ? "bg-amber-500" : "bg-emerald-500"}
                        />
                      </div>
                      <span className="tabular-nums">{pct(mastery)}</span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <Empty>No learning plan yet. Run the Knowledge agent.</Empty>
      )}
    </Card>
  );
}

/* 4. How should I learn it */
export function HowToLearn({ d, l }: { d: DashboardData; l: Lookups }) {
  const items = d.knowledge?.payload.learn_next ?? [];
  const score = (type: string) => l.methodScores[type] ?? 0;
  return (
    <Card step={4} title="How should I learn it" source="Knowledge + Patterns" golden={d.knowledge?.is_golden}>
      {items.length ? (
        <div className="space-y-5">
          {items.map((it) => (
            <div key={it.node_id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{l.name(it.node_id)}</p>
              <ul className="space-y-1.5">
                {[...it.resources]
                  .sort((a, b) => score(b.type) - score(a.type))
                  .map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Pill tone={METHOD_STYLE[r.type]?.tone ?? "zinc"}>{r.type}</Pill>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
                      >
                        {r.title}
                      </a>
                      {l.methodScores[r.type] !== undefined && (
                        <span className="ml-auto shrink-0 text-xs tabular-nums text-zinc-500">
                          {pct(l.methodScores[r.type])} fit
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
              {it.milestones.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {it.milestones.map((m, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                    >
                      ◻ {m}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty>No resources yet. Run the Knowledge agent.</Empty>
      )}
    </Card>
  );
}

/* 5. What else do I need */
export function WhatElse({ d, l }: { d: DashboardData; l: Lookups }) {
  const o = d.opportunity?.payload;
  const columns = o
    ? ([
        { label: "Ready", dot: "bg-emerald-500", items: o.ready.map((x) => ({ ...x, missing: [] as string[], deadline: undefined })) },
        { label: "Almost ready", dot: "bg-amber-500", items: o.almost.map((x) => ({ ...x, missing: x.missing_nodes })) },
        { label: "Long term", dot: "bg-zinc-400", items: o.long_term.map((x) => ({ ...x, missing: [] as string[], deadline: undefined })) },
      ] as const)
    : [];
  return (
    <Card step={5} title="What else do I need" source="Opportunity" golden={d.opportunity?.is_golden}>
      {o ? (
        <div className="grid gap-5 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.label}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                {col.label}
                <span className="font-normal text-zinc-400">{col.items.length}</span>
              </h3>
              {col.items.length === 0 ? (
                <p className="text-sm text-zinc-400">None right now.</p>
              ) : (
                <ul className="space-y-2">
                  {col.items.map((it) => {
                    const opp = l.opp(it.opportunity_id);
                    const title = opp?.title ?? it.opportunity_id;
                    return (
                      <li
                        key={it.opportunity_id}
                        className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div className="flex items-start justify-between gap-2">
                          {opp?.link ? (
                            <a
                              href={opp.link}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium underline-offset-4 hover:underline"
                            >
                              {title} <span className="text-zinc-400">↗</span>
                            </a>
                          ) : (
                            <span className="font-medium">{title}</span>
                          )}
                          {opp?.type && <span className="shrink-0 text-xs capitalize text-zinc-400">{opp.type}</span>}
                        </div>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{it.reason}</p>
                        {(it.missing.length > 0 || it.deadline || opp?.deadline) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {it.missing.map((n) => (
                              <Pill key={n} tone="amber">
                                Missing: {l.name(n)}
                              </Pill>
                            ))}
                            <Deadline date={it.deadline ?? opp?.deadline} now={l.now} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty>No opportunities yet. Run the Opportunity agent.</Empty>
      )}
    </Card>
  );
}

/* 6. Handoff feed */
export function HandoffFeed({ d, l }: { d: DashboardData; l: Lookups }) {
  return (
    <Card step={6} title="Handoff feed" source="Agent to agent">
      {d.handoffs.length ? (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {d.handoffs.map((h) => {
            const missing = h.payload.missing_nodes ?? [];
            const title = h.payload.opportunity_id
              ? l.opp(h.payload.opportunity_id)?.title ?? h.payload.opportunity_id
              : "an opportunity";
            return (
              <li key={h.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1 text-sm">
                  <p>
                    <span className="font-semibold">{agentLabel(h.agent)}</span>
                    <span className="mx-1.5 text-zinc-400">→</span>
                    <span className="font-semibold">{agentLabel(h.to_agent)}</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      : {missing.length} missing skill{missing.length === 1 ? "" : "s"} for {title}
                    </span>
                  </p>
                  {missing.length > 0 && (
                    <p className="mt-0.5 text-xs text-zinc-500">{missing.map(l.name).join(", ")}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Pill tone={h.consumed ? "emerald" : "amber"}>{h.consumed ? "✓ consumed" : "waiting"}</Pill>
                  <span className="text-[11px] text-zinc-400">{timeAgo(h.created_at, l.now)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>No handoffs yet. They appear when the Opportunity agent finds a skill gap.</Empty>
      )}
    </Card>
  );
}

/* 7. Learning patterns */
export function LearningPatterns({ d, l }: { d: DashboardData; l: Lookups }) {
  const tips = d.patterns?.payload.tips ?? d.profile?.tips ?? [];
  const methods = [
    ...METHODS.filter((m) => m in l.methodScores),
    ...Object.keys(l.methodScores).filter((m) => !(METHODS as readonly string[]).includes(m)),
  ].sort((a, b) => (l.methodScores[b] ?? 0) - (l.methodScores[a] ?? 0));
  return (
    <Card step={7} title="Learning patterns" source="Patterns" golden={d.patterns?.is_golden}>
      {tips.length || methods.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold">What works for you</h3>
            {methods.length ? (
              <ul className="space-y-2.5">
                {methods.map((m) => (
                  <li key={m} className="flex items-center gap-3 text-sm">
                    <span className="w-16 capitalize">{m}</span>
                    <div className="flex-1">
                      <Bar value={l.methodScores[m]} className={METHOD_STYLE[m]?.bar ?? "bg-zinc-500"} />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-zinc-500">{pct(l.methodScores[m])}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-400">No method scores yet.</p>
            )}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Tips</h3>
            {tips.length ? (
              <ul className="space-y-2">
                {tips.map((t, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-indigo-50/70 px-3 py-2 text-sm text-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-100"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-400">No tips yet.</p>
            )}
          </div>
        </div>
      ) : (
        <Empty>No learning patterns yet. Run the Learning Patterns agent after a few check-ins.</Empty>
      )}
    </Card>
  );
}
