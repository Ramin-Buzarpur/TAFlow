import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { getProfessorEvaluationSummary } from "@/server/services/evaluations";

export async function GET(_: Request, context: { params: Promise<{ courseOfferingId: string }> }) {
  try {
    const user = await requireUser();
    const { courseOfferingId } = await context.params;
    return ok(await getProfessorEvaluationSummary(user.id, courseOfferingId));
  } catch (e) { return fail(e, "Could not load evaluation summary"); }
}
