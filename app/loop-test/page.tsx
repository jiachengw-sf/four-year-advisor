import { CheckinButton } from "@/components/checkin/CheckinButton";
import { KnowledgeGraph } from "@/components/graph/KnowledgeGraph";
import { loadGraph } from "@/lib/model";
import { supabase } from "@/lib/supabase";

// Standalone test page for the check-in loop. Pick a student with ?student=<uuid>;
// without one, the most recently created student is used.
export default async function LoopTestPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const requested = (await searchParams).student;
  const { data: students, error } = await supabase()
    .from("students")
    .select("id, name")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Reading students: ${error.message}`);

  const student = (students ?? []).find((s) => s.id === requested) ?? students?.[0];
  if (!student) {
    return <main className="p-6 text-sm">No students yet. Create one on the dashboard first.</main>;
  }

  const { nodes, edges } = await loadGraph(student.id);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold">Check-in loop test</h1>
        <p className="text-sm text-zinc-500">
          Student: {student.name ?? "Unnamed"} <code className="text-xs">{student.id}</code>
        </p>
      </header>
      <KnowledgeGraph nodes={nodes} edges={edges} />
      <CheckinButton studentId={student.id} skills={nodes.map((n) => ({ node_id: n.node_id, name: n.name }))} />
    </main>
  );
}
