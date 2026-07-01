import { requireUser } from "@/server/auth/session";
import { ok, created, fail } from "@/server/utils/api";
import { submitProfessorEvaluationSchema } from "@/server/validation/evaluations";
import { submitProfessorEvaluation, listEvaluableCourseOfferings } from "@/server/services/evaluations";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listEvaluableCourseOfferings(user.id));
  } catch (e) { return fail(e, "Could not list evaluable courses"); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = submitProfessorEvaluationSchema.parse(await request.json());
    return created(await submitProfessorEvaluation(user.id, body));
  } catch (e) { return fail(e, "Could not submit evaluation"); }
}
