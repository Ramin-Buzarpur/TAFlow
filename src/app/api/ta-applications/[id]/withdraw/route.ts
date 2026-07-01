import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { withdrawApplication } from "@/server/services/ta-workflow";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await context.params; return ok(await withdrawApplication(user.id, id)); }
  catch (e) { return fail(e, "Could not withdraw application"); }
}
