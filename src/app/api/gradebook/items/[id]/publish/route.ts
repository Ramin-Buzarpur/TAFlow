import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { publishGradeItem } from "@/server/services/gradebook";
export async function POST(_: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; return ok(await publishGradeItem(user.id, id)); } catch (e) { return fail(e, "Could not publish grade item"); } }
