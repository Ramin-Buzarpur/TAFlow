import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { listRegistrations } from "@/server/services/office-hours";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await listRegistrations(user.id, id));
  } catch (e) { return fail(e, "Could not list registrations"); }
}
