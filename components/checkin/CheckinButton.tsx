"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Skill = { node_id: string; name: string };

// Floating "Check in" button: log study time on a skill, see the model update as a toast.
export function CheckinButton({ studentId, skills }: { studentId: string; skills: Skill[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nodeId, setNodeId] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [confidence, setConfidence] = useState(3);
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          node_id: nodeId,
          minutes: Number(minutes),
          confidence,
          score: score === "" ? null : Number(score),
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Check-in failed (${res.status})`);
      setToast(data.message);
      setOpen(false);
      setScore("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <>
      {toast && (
        <div
          role="status"
          className="fixed bottom-24 right-6 z-50 max-w-sm rounded-lg bg-zinc-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {toast}
        </div>
      )}

      {open && (
        <form
          onSubmit={submit}
          className="fixed bottom-24 right-6 z-50 w-80 space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h2 className="font-semibold">Check in</h2>
          <label className="block space-y-1 text-sm">
            <span>Skill</span>
            <select required value={nodeId} onChange={(e) => setNodeId(e.target.value)} className={input}>
              <option value="">Pick a skill…</option>
              {skills.map((s) => (
                <option key={s.node_id} value={s.node_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Minutes studied</span>
            <input
              required
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={input}
            />
          </label>
          <fieldset className="space-y-1 text-sm">
            <legend>How confident do you feel? (1–5)</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setConfidence(n)}
                  aria-pressed={confidence === n}
                  className={`flex-1 rounded-md border py-1 ${
                    confidence === n
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block space-y-1 text-sm">
            <span>What did you do? (optional)</span>
            <input
              type="text"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. BFS practice problems, still confused"
              className={input}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Quiz score (optional, 0–100)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className={input}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md px-3 py-1.5 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
      >
        {open ? "Close" : "Check in"}
      </button>
    </>
  );
}
