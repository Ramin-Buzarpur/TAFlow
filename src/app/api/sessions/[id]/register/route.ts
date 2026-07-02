import { requireUser } from "@/server/auth/session";
import { created, ok, fail } from "@/server/utils/api";
import { registerForSession, cancelRegistration } from "@/server/services/office-hours";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return created(await registerForSession(user.id, id));
  } catch (e) { return fail(e, "Could not register for session"); }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await cancelRegistration(user.id, id));
  } catch (e) { return fail(e, "Could not cancel registration"); }
}
