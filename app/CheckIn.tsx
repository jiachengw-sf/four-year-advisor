"use client";

import { useEffect, useState } from "react";
import type { SkillNode } from "@/lib/dashboard";
import { submitCheckin } from "./actions";

const field =
  "w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950";

export function CheckIn({
  studentId,
  nodes,
  defaultNode,
  onSaved,
}: {
  studentId: string;
  nodes: SkillNode[];
  defaultNode?: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [nodeId, setNodeId] = useState(defaultNode ?? "");
  const [minutes, setMinutes] = useState("45");
  const [confidence, setConfidence] = useState(3);
  const [score, setScore] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!nodeId && defaultNode) setNodeId(defaultNode);
  }, [defaultNode, nodeId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  const sorted = [...nodes].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  async function submit() {
    setBusy(true);
    setErrors([]);
    const r = await submitCheckin(studentId, {
      node_id: nodeId,
      minutes: Number(minutes),
      confidence,
      score: score.trim() === "" ? null : Number(score),
    });
    setBusy(false);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setOpen(false);
    setScore("");
    setToast(r.summary);
    onSaved();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        ✓ Check in
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Check in"
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Check in</h2>
            {nodes.length === 0 ? (
              <p className="text-sm text-zinc-500">No skill catalog yet. Import seed/skills.csv in Admin.</p>
            ) : (
              <>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Skill</span>
                  <select className={field} value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
                    <option value="">Pick a skill</option>
                    {sorted.map((n) => (
                      <option key={n.node_id} value={n.node_id}>
                        {n.name} ({n.category})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Minutes studied</span>
                  <input
                    className={field}
                    type="number"
                    min={1}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                  />
                </label>
                <fieldset className="space-y-1 text-sm">
                  <legend className="font-medium">How confident do you feel?</legend>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setConfidence(c)}
                        className={`h-9 flex-1 rounded-md border text-sm font-medium ${
                          confidence === c
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                            : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Lost</span>
                    <span>Got it</span>
                  </div>
                </fieldset>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">
                    Quiz score <span className="font-normal text-zinc-500">(optional, 0–100)</span>
                  </span>
                  <input
                    className={field}
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </label>
              </>
            )}
            {errors.length > 0 && (
              <ul className="list-disc rounded-md bg-red-50 py-2 pl-8 pr-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !nodeId || nodes.length === 0}
                onClick={submit}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
              >
                {busy ? "Saving..." : "Save check-in"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-20 right-6 z-50 max-w-sm rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 shadow-lg dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
        >
          <p className="font-medium">Model updated</p>
          <p className="mt-0.5">{toast}</p>
        </div>
      )}
    </>
  );
}
