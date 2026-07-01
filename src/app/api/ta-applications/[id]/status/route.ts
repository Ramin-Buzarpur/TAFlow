import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { updateApplicationStatus } from "@/server/services/ta-workflow";

const schema = z.object({ status: z.enum(["UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_INVITED", "ACCEPTED", "REJECTED"]), note: z.string().max(2000).optional(), score: z.coerce.number().min(0).max(100).optional() });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await context.params; const body = schema.parse(await request.json()); return ok(await updateApplicationStatus(user.id, id, body.status, body.note, body.score)); }
  catch (e) { return fail(e, "Could not change application status"); }
}
