import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { createTaTeamThread } from "@/server/services/messaging";

export async function POST(_request: Request, context: { params: Promise<{ courseOfferingId: string }> }) {
  try {
    const user = await requireUser();
    const { courseOfferingId } = await context.params;
    return ok(await createTaTeamThread(user.id, courseOfferingId));
  } catch (e) { return fail(e, "Could not create/sync TA team thread"); }
}
