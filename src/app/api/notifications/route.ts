import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { listNotifications } from "@/server/services/notifications";
export async function GET() { try { const user = await requireUser(); return ok(await listNotifications(user.id)); } catch (e) { return fail(e, "Could not list notifications"); } }
