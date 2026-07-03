import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { submitTaskSchema } from "@/server/validation/tasks";
import { submitTask } from "@/server/services/tasks";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = submitTaskSchema.parse(await request.json());
    return ok(await submitTask(user.id, id, body.fileId, body.note));
  } catch (e) { return fail(e, "Could not submit task"); }
}
