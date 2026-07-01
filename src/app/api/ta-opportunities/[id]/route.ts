import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { closeTAOpportunity, getTAOpportunity } from "@/server/services/ta-workflow";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await context.params; return ok(await getTAOpportunity(user.id, id)); }
  catch (e) { return fail(e, "Could not load opportunity"); }
}

export async function PATCH(_: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await context.params; return ok(await closeTAOpportunity(user.id, id)); }
  catch (e) { return fail(e, "Could not update opportunity"); }
}
