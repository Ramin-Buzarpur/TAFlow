import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { updateTaskStatusSchema } from "@/server/validation/tasks";
import { updateTaskStatus } from "@/server/services/tasks";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = updateTaskStatusSchema.parse(await request.json());
    return ok(await updateTaskStatus(user.id, id, body.status));
  } catch (e) { return fail(e, "Could not update task status"); }
}
