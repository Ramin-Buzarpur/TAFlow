import { requireUser } from "@/server/auth/session";
import { created, ok, fail } from "@/server/utils/api";
import { joinQueue, leaveQueue, listQueue } from "@/server/services/office-hours";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await listQueue(user.id, id));
  } catch (e) { return fail(e, "Could not list queue"); }
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return created(await joinQueue(user.id, id));
  } catch (e) { return fail(e, "Could not join queue"); }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await leaveQueue(user.id, id));
  } catch (e) { return fail(e, "Could not leave queue"); }
}
