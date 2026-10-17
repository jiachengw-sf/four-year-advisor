import { z } from "zod";
import { applyCheckin, checkinInput } from "@/lib/model";

const body = checkinInput.extend({ student_id: z.string().uuid("Missing student id") });

// POST { student_id, node_id, minutes, confidence, score?, note? } → the model update.
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }
  const { student_id, ...input } = parsed.data;
  try {
    return Response.json(await applyCheckin(student_id, input));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
