"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStudentId } from "@/lib/useStudent";
import { getContext } from "../actions";
import { Card, CopyButton, textareaClass } from "../ui";

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
  const { studentId, ready } = useStudentId();
  const [context, setContext] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) return;
    getContext("input", studentId).then((r) =>
      r.ok ? setContext(JSON.stringify(r.context, null, 2)) : setError(`Error loading context: ${r.error}`),
    );
  }, [studentId]);

  if (!ready) return null;
  if (!studentId) {
    return (
      <p>
        No demo student yet. <Link href="/admin" className="underline">Create one in Admin</Link> first.
      </p>
    );
  }

  const combined = [
    "Agent context:",
    context,
    ...docs.filter((d) => d.text.trim()).map((d) => `--- DOCUMENT: ${d.name} ---\n${d.text.trim()}`),
  ].join("\n\n");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Upload documents</h1>
      <Card
        title="1. Add the student's documents"
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
      <Card title="2. Copy into the Input agent" subtitle="Paste this into the Input agent's chat in Superhuman Go.">
        {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <div className="flex items-center justify-between">
          <span className="text-sm">{docs.filter((d) => d.text.trim()).length} document(s) included</span>
          <CopyButton text={combined} />
        </div>
        <pre className="max-h-96 overflow-auto rounded-md bg-zinc-100 p-3 text-xs dark:bg-zinc-950">{combined}</pre>
      </Card>
      <p className="text-sm">
        Then paste the agent's reply on <Link href="/agents" className="underline">/agents</Link>.
      </p>
    </div>
  );
}
