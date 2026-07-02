import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { assignGradeItem } from "@/server/services/gradebook";
import { cuidSchema } from "@/server/validation/common";

const schema = z.object({ assigneeId: cuidSchema.nullable() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    return ok(await assignGradeItem(user.id, id, body.assigneeId));
  } catch (e) { return fail(e, "Could not assign grade item"); }
}
