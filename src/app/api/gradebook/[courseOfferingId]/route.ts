import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { getGradebook } from "@/server/services/gradebook";
export async function GET(_: Request, context: { params: Promise<{ courseOfferingId: string }> }) { try { const user = await requireUser(); const { courseOfferingId } = await context.params; return ok(await getGradebook(user.id, courseOfferingId)); } catch (e) { return fail(e, "Could not load gradebook"); } }
