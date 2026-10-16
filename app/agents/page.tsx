"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AgentName } from "@/lib/contracts";
import { useStudentId } from "@/lib/useStudent";
import { getContext, submitAgentReply } from "../actions";
import { Button, Card, CopyButton, StatusMessage, textareaClass, type Status } from "../ui";

const CARDS: { agent: AgentName; title: string; owner: string; description: string }[] = [
  { agent: "input", title: "Input agent", owner: "A", description: "Attach or paste the student's documents (resume, LinkedIn, transcript, essays) along with this context." },
  { agent: "knowledge", title: "Knowledge Retrieval agent", owner: "A", description: "What to learn next. Consumes handoffs." },
  { agent: "opportunity", title: "Opportunity Retrieval agent", owner: "C", description: "Ready, almost, and long-term opportunities." },
  { agent: "patterns", title: "Learning Patterns agent", owner: "B", description: "Updates mastery, pace, and method scores from events." },
  { agent: "advisor", title: "Advisor agent", owner: "D", description: "This week's plan and what changed." },
];

function AgentCard({
  agent,
  title,
  owner,
  description,
  studentId,
  version,
  onSaved,
}: (typeof CARDS)[number] & { studentId: string; version: number; onSaved: () => void }) {
  const [context, setContext] = useState<string>("Loading...");
  const [reply, setReply] = useState("");
  const [golden, setGolden] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getContext(agent, studentId).then((r) =>
      setContext(r.ok ? JSON.stringify(r.context, null, 2) : `Error loading context: ${r.error}`),
    );
  }, [agent, studentId, version]);

  return (
    <Card title={title} subtitle={`Owner ${owner}. ${description}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Agent context</h3>
        <CopyButton text={context} />
      </div>
      <pre className="max-h-72 overflow-auto rounded-md bg-zinc-100 p-3 text-xs dark:bg-zinc-950">{context}</pre>

      <label className="block text-sm font-medium" htmlFor={`reply-${agent}`}>
        Paste agent reply
      </label>
      <textarea
        id={`reply-${agent}`}
        className={textareaClass}
        rows={8}
        placeholder="Paste the whole reply. The last ```json block is used."
        value={reply}
        onChange={(e) => setReply(e.target.value)}
      />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={golden} onChange={(e) => setGolden(e.target.checked)} />
          Mark as golden
        </label>
        <Button
          disabled={busy || !reply.trim()}
          onClick={async () => {
            setBusy(true);
            const r = await submitAgentReply(agent, studentId, reply, golden);
            if (r.ok) {
              setStatus({ kind: "ok", message: `Saved (${r.id}).`, details: r.warnings });
              setReply("");
              onSaved();
            } else {
              setStatus({ kind: "error", message: "Not saved. Fix these and paste again:", details: r.errors });
            }
            setBusy(false);
          }}
        >
          {busy ? "Saving..." : "Validate and save"}
        </Button>
      </div>
      <StatusMessage status={status} />
    </Card>
  );
}

export default function AgentsPage() {
  const { studentId, ready } = useStudentId();
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  if (!ready) return null;
  if (!studentId) {
    return (
      <p>
        No demo student yet. <Link href="/admin" className="underline">Create one in Admin</Link> first.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Agents</h1>
      {CARDS.map((c) => (
        <AgentCard key={c.agent} {...c} studentId={studentId} version={version} onSaved={refresh} />
      ))}
    </div>
  );
}
