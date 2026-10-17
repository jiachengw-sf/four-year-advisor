// Shared building blocks for the dashboard cards. Server-safe (no hooks).

export function Card({
  step,
  title,
  source,
  golden,
  className = "",
  children,
}: {
  step: number;
  title: string;
  source?: string;
  golden?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none ${className}`}
    >
      <header className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {step}
        </span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="ml-auto flex items-center gap-1.5">
          {source && (
            <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {source}
            </span>
          )}
          {golden && (
            <span
              title="Saved demo output"
              className="h-2 w-2 rounded-full bg-amber-400"
              aria-label="Saved demo output"
            />
          )}
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      {children}
    </p>
  );
}

const TONES = {
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
} as const;
export type Tone = keyof typeof TONES;

export function Pill({ tone = "zinc", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export const METHOD_STYLE: Record<string, { bar: string; tone: Tone }> = {
  practice: { bar: "bg-emerald-500", tone: "emerald" },
  project: { bar: "bg-indigo-500", tone: "indigo" },
  reading: { bar: "bg-amber-500", tone: "amber" },
  video: { bar: "bg-rose-400", tone: "rose" },
};

export function Bar({ value, className = "bg-indigo-500" }: { value: number; className?: string }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${w}%` }} />
    </div>
  );
}
