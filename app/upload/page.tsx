"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStudentId } from "@/lib/useStudent";
import { getContext, getStudent, submitAgentReply } from "../actions";
import { Button, Card, CopyButton, StatusMessage, textareaClass, type Status } from "../ui";
import { createStudent, fetchJobs } from "./actions";
import type { FetchedJob } from "@/lib/jobs";

type Doc = { name: string; text: string; note?: string };

const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

async function pdfText(file: File): Promise<string> {
  // Loaded from a CDN at runtime so there is no new dependency.
  const pdfjs = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ PDFJS);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map((it: { str?: string }) => it.str ?? "").join(" "));
  }
  return pages.join("\n\n");
}

async function readFile(file: File): Promise<Doc> {
  try {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const text = isPdf ? await pdfText(file) : await file.text();
    if (!text.trim()) return { name: file.name, text: "", note: "No text found (scanned PDF?). Paste it below." };
    return { name: file.name, text };
  } catch {
    return { name: file.name, text: "", note: "Could not read this file. Paste its text below." };
  }
}

export default function UploadPage() {
  const { studentId, setStudentId, ready } = useStudentId();
  const [context, setContext] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState("");
  const [keywords, setKeywords] = useState("software, machine learning, data");
  const [jobs, setJobs] = useState<FetchedJob[]>([]);
  const [jobStatus, setJobStatus] = useState("");
  const [fetching, setFetching] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [reply, setReply] = useState("");
  const [saveStatus, setSaveStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    getStudent(studentId).then((r) => setStudentName(r.ok && r.student ? r.student.name : ""));
    getContext("input", studentId).then((r) =>
      r.ok ? setContext(JSON.stringify(r.context, null, 2)) : setError(`Error loading context: ${r.error}`),
    );
  }, [studentId]);

  if (!ready) return null;

  const combined = [
    "Agent context:",
    context,
    ...docs.filter((d) => d.text.trim()).map((d) => `--- DOCUMENT: ${d.name} ---\n${d.text.trim()}`),
  ].join("\n\n");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Start: add a student's real information</h1>
      <Card
        title="1. Pick the student"
        subtitle="Everything below is saved to this student. Create a new one for each real person; don't reuse the demo student."
      >
        <p className="text-sm">
          Current student: <strong>{studentId ? studentName || "(unnamed)" : "none"}</strong>
          {studentId && <span className="ml-2 text-xs text-zinc-500">{studentId}</span>}
        </p>
        <div className="flex items-center gap-2">
          <input
            className={textareaClass}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (the Input agent will fill in the rest from the documents)"
          />
          <Button
            disabled={creating}
            onClick={async () => {
              setCreating(true);
              setCreateError("");
              const r = await createStudent(newName);
              if (r.ok) {
                setStudentId(r.id);
                setNewName("");
                setJobs([]);
                setReply("");
                setSaveStatus(null);
              } else setCreateError(r.error);
              setCreating(false);
            }}
          >
            {creating ? "Creating..." : "Create new student"}
          </Button>
        </div>
        {createError && <p className="text-sm text-red-700 dark:text-red-300">{createError}</p>}
      </Card>
      {!studentId ? (
        <p className="text-sm">Create a student to continue.</p>
      ) : (
      <>
      <Card
        title="2. Add the student's documents"
        subtitle="Resume, UC PIQs, transcript, LinkedIn. PDF, .txt or .md. Text is read in your browser and goes nowhere until you paste it into the Input agent."
      >
        <input
          type="file"
          multiple
          accept=".pdf,.txt,.md,text/plain,application/pdf"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            const read = await Promise.all(files.map(readFile));
            setDocs((prev) => [...prev, ...read]);
            e.target.value = "";
          }}
        />
        {docs.map((d, i) => (
          <div key={`${d.name}-${i}`} className="space-y-1">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{d.name}</span>
              <button className="text-xs underline" onClick={() => setDocs((p) => p.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
            {d.note && <p className="text-xs text-red-700 dark:text-red-300">{d.note}</p>}
            <textarea
              className={textareaClass}
              rows={5}
              value={d.text}
              onChange={(e) => setDocs((p) => p.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
            />
          </div>
        ))}
      </Card>
      <Card title="3. Copy into the Input agent" subtitle="Paste this into the Input agent's chat in Superhuman Go.">
        {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <div className="flex items-center justify-between">
          <span className="text-sm">{docs.filter((d) => d.text.trim()).length} document(s) included</span>
          <CopyButton text={combined} />
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer text-zinc-500">Show what will be copied</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-zinc-100 p-3 dark:bg-zinc-950">{combined}</pre>
        </details>
      </Card>
      <Card title="4. Paste the Input agent's reply" subtitle="Copy the agent's whole reply in Go, then click the button. It reads your clipboard, validates it and saves it. No pasting needed.">
        <textarea
          className={textareaClass}
          rows={3}
          placeholder="(Optional) or paste the reply here instead."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <Button
          disabled={saving}
          onClick={async () => {
            let text = reply;
            if (!text.trim()) {
              try {
                text = await navigator.clipboard.readText();
              } catch {
                setSaveStatus({ kind: "error", message: "Couldn't read the clipboard. Paste the reply into the box." });
                return;
              }
            }
            setSaving(true);
            const r = await submitAgentReply("input", studentId, text, false);
            if (r.ok) {
              setSaveStatus({ kind: "ok", message: `Saved (${r.id}).`, details: r.warnings });
              setReply("");
              getStudent(studentId).then((x) => setStudentName(x.ok && x.student ? x.student.name : ""));
            } else {
              setSaveStatus({ kind: "error", message: "Not saved. Fix these and paste again:", details: r.errors });
            }
            setSaving(false);
          }}
        >
          {saving ? "Saving..." : reply.trim() ? "Validate and save" : "Save reply from clipboard"}
        </Button>
        <StatusMessage status={saveStatus} />
      </Card>
      <Card
        title="5. Fetch real opportunities"
        subtitle="Run this after Input and before the Opportunity agent. It pulls current internship postings from company job boards (Greenhouse) and puts the best keyword matches in the opportunity list the agent sees."
      >
        <input
          className={textareaClass}
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Comma-separated keywords, e.g. software, machine learning"
        />
        <Button
          disabled={fetching}
          onClick={async () => {
            setFetching(true);
            setJobStatus("Fetching...");
            const r = await fetchJobs(keywords.split(","));
            if (r.ok) {
              setJobs(r.jobs);
              setJobStatus(`Saved ${r.jobs.length} postings. Now run the Opportunity agent.`);
            } else {
              setJobStatus(r.error);
            }
            setFetching(false);
          }}
        >
          {fetching ? "Fetching..." : "Fetch real opportunities"}
        </Button>
        {jobStatus && <p className="text-sm">{jobStatus}</p>}
        <ul className="space-y-1 text-sm">
          {jobs.map((j) => (
            <li key={j.opportunity_id}>
              <a href={j.link} target="_blank" rel="noreferrer" className="underline">
                {j.title}
              </a>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="6. Run the rest" subtitle="Patterns, Opportunity, Knowledge, then Advisor, in that order.">
        <p className="text-sm">
          <Link href="/agents" className="underline">Open Agents</Link> to copy each context and paste each reply. Then{" "}
          <Link href={`/?student=${studentId}`} className="underline">open this student's dashboard</Link>.
        </p>
      </Card>
      </>
      )}
    </div>
  );
}
