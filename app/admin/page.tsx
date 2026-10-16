"use client";

import { useEffect, useState } from "react";
import {
  createDemoStudent,
  getStudent,
  importEventsAction,
  importOpportunitiesAction,
  importSkillsAction,
  loadSamples,
  readSeedFile,
  type SampleResult,
} from "../actions";
import { useStudentId } from "@/lib/useStudent";
import { Button, Card, StatusMessage, textareaClass, type Status } from "../ui";
import type { ImportResult } from "@/lib/seed";

const toStatus = (r: ImportResult): Status => ({
  kind: r.ok ? "ok" : "error",
  message: r.message,
  details: r.errors,
});

function CsvImport({
  title,
  file,
  onImport,
}: {
  title: string;
  file: "skills.csv" | "opportunities.csv";
  onImport: (csv: string) => Promise<ImportResult>;
}) {
  const [csv, setCsv] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card title={title} subtitle={`Paste seed/${file}, upload it, or load the copy in the repo.`}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={async () => setCsv(await readSeedFile(file))}>
          Load seed/{file} from repo
        </Button>
        <input
          type="file"
          accept=".csv,text/csv"
          className="text-sm"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setCsv(await f.text());
          }}
        />
      </div>
      <textarea className={textareaClass} rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} />
      <Button
        disabled={busy || !csv.trim()}
        onClick={async () => {
          setBusy(true);
          setStatus(toStatus(await onImport(csv)));
          setBusy(false);
        }}
      >
        {busy ? "Importing..." : "Import"}
      </Button>
      <StatusMessage status={status} />
    </Card>
  );
}

export default function AdminPage() {
  const { studentId, setStudentId, ready } = useStudentId();
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentStatus, setStudentStatus] = useState<Status>(null);
  const [eventsStatus, setEventsStatus] = useState<Status>(null);
  const [samples, setSamples] = useState<SampleResult[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    getStudent(studentId).then((r) => {
      if (!r.ok) setStudentStatus({ kind: "error", message: r.error });
      else if (!r.student) setStudentStatus({ kind: "error", message: "The saved demo student no longer exists. Create a new one." });
      else setStudentName(r.student.name);
    });
  }, [studentId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <Card title="Demo student" subtitle="One student for the whole demo. Its id is stored in this browser.">
        {ready && (
          <p className="text-sm">
            {studentId ? (
              <>
                Current: <span className="font-medium">{studentName ?? "..."}</span>{" "}
                <code className="text-xs text-zinc-500">{studentId}</code>
              </>
            ) : (
              "No demo student yet."
            )}
          </p>
        )}
        <Button
          disabled={busy !== null}
          onClick={async () => {
            setBusy("student");
            const r = await createDemoStudent();
            if (r.ok) {
              setStudentId(r.id);
              setStudentName("Demo student");
              setSamples(null);
              setStudentStatus({ kind: "ok", message: "Created a new demo student." });
            } else {
              setStudentStatus({ kind: "error", message: r.error });
            }
            setBusy(null);
          }}
        >
          Create demo student
        </Button>
        <StatusMessage status={studentStatus} />
      </Card>

      <CsvImport title="Skill catalog" file="skills.csv" onImport={importSkillsAction} />
      <CsvImport title="Opportunities" file="opportunities.csv" onImport={importOpportunitiesAction} />

      <Card title="Events" subtitle="Loads seed/events.json for the demo student, replacing its existing events.">
        <Button
          disabled={!studentId || busy !== null}
          onClick={async () => {
            setBusy("events");
            setEventsStatus(toStatus(await importEventsAction(studentId!)));
            setBusy(null);
          }}
        >
          Load seed/events.json
        </Button>
        <StatusMessage status={eventsStatus} />
      </Card>

      <Card
        title="Samples"
        subtitle="Saves every file in samples/ through the same validation and save logic as a pasted reply, marked golden."
      >
        <Button
          disabled={!studentId || busy !== null}
          onClick={async () => {
            setBusy("samples");
            setSamples(await loadSamples(studentId!));
            setBusy(null);
          }}
        >
          {busy === "samples" ? "Loading..." : "Load samples"}
        </Button>
        {samples?.map((s) => (
          <StatusMessage
            key={s.file}
            status={
              s.result.ok
                ? { kind: "ok", message: `${s.file}: saved`, details: s.result.warnings }
                : { kind: "error", message: `${s.file}: not saved`, details: s.result.errors }
            }
          />
        ))}
      </Card>
    </div>
  );
}
