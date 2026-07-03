import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { markQueueEntryDone } from "@/server/services/office-hours";

export async function POST(_: Request, context: { params: Promise<{ entryId: string }> }) {
  try {
    const user = await requireUser();
    const { entryId } = await context.params;
    return ok(await markQueueEntryDone(user.id, entryId));
  } catch (e) { return fail(e, "Could not mark queue entry done"); }
}
