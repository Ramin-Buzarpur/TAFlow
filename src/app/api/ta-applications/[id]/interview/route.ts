import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { scheduleApplicationInterview } from "@/server/services/ta-workflow";

const schema = z.object({ startsAt: z.coerce.date(), endsAt: z.coerce.date(), meetingUrl: z.string().url().optional(), location: z.string().max(300).optional(), notes: z.string().max(2000).optional() }).refine((v) => v.endsAt > v.startsAt, { path: ["endsAt"] });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await context.params; const body = schema.parse(await request.json()); return ok(await scheduleApplicationInterview(user.id, { applicationId: id, ...body })); }
  catch (e) { return fail(e, "Could not schedule interview"); }
}
