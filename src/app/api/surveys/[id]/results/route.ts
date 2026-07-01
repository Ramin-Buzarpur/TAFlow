import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { getSurveyResults } from "@/server/services/surveys";
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; return ok(await getSurveyResults(user.id, id)); } catch (e) { return fail(e, "Could not load survey results"); } }
