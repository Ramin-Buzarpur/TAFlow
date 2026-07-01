import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { getApplication } from "@/server/services/ta-workflow";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await context.params; return ok(await getApplication(user.id, id)); }
  catch (e) { return fail(e, "Could not load application"); }
}
