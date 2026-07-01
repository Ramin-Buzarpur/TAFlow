import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { markNotificationRead } from "@/server/services/notifications";
export async function POST(_: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; return ok(await markNotificationRead(user.id, id)); } catch (e) { return fail(e, "Could not read notification"); } }
