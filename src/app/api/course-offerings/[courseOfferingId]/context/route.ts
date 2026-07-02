import { ok, fail } from "@/server/utils/api";
import { requireUser } from "@/server/auth/session";
import { getCoursePermissions } from "@/server/services/rbac";
import { getCourseOfferingIdentity } from "@/server/services/course-roles";

export async function GET(_request: Request, context: { params: Promise<{ courseOfferingId: string }> }) {
  try {
    const user = await requireUser();
    const { courseOfferingId } = await context.params;
    const [offering, permissions] = await Promise.all([
      getCourseOfferingIdentity(courseOfferingId),
      getCoursePermissions(user.id, courseOfferingId)
    ]);
    return ok({ offering, permissions: Array.from(permissions) });
  } catch (e) { return fail(e, "Unexpected course context error"); }
}
