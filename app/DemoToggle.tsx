"use client";

import { useDemoMode } from "@/lib/useDemoMode";

export function DemoToggle() {
  const [on, setOn] = useDemoMode();
  return (
    <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm" title="Prefer golden outputs in every panel">
      <span className="text-zinc-600 dark:text-zinc-400">Demo mode</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn(!on)}
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-4" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}
