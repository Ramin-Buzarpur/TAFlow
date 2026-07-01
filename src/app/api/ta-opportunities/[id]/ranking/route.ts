import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { rankApplications } from "@/server/services/scoring";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await rankApplications(user.id, id));
  } catch (e) { return fail(e, "Could not rank applications"); }
}
