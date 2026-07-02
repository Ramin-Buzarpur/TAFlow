import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { markAttendance } from "@/server/services/office-hours";

const schema = z.object({ attended: z.boolean() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    return ok(await markAttendance(user.id, id, body.attended));
  } catch (e) { return fail(e, "Could not update attendance"); }
}
