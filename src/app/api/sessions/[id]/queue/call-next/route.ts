import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { callNextInQueue } from "@/server/services/office-hours";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await callNextInQueue(user.id, id));
  } catch (e) { return fail(e, "Could not call next in queue"); }
}
