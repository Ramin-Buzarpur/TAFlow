import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { getApplicantContext } from "@/server/services/ta-workflow";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await getApplicantContext(user.id, id));
  } catch (e) { return fail(e, "Could not load applicant context"); }
}
