import { ok, created, fail } from "@/server/utils/api";
import { requireUser } from "@/server/auth/session";
import { assignCourseRole, listCourseRoleAssignments } from "@/server/services/course-roles";

export async function GET(
  request: Request,
  context: { params: Promise<{ courseOfferingId: string }> }
) {
  try {
    const user = await requireUser();
    const { courseOfferingId } = await context.params;
    const url = new URL(request.url);
    return ok(await listCourseRoleAssignments(user.id, {
      courseOfferingId,
      role: url.searchParams.get("role") || undefined,
      includeRevoked: url.searchParams.get("includeRevoked") === "true"
    }));
  } catch (e) { return fail(e, "Unexpected role list error"); }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ courseOfferingId: string }> }
) {
  try {
    const user = await requireUser();
    const { courseOfferingId } = await context.params;
    const body = await request.json();
    return created(await assignCourseRole(user.id, { ...body, courseOfferingId }));
  } catch (e) { return fail(e, "Unexpected role assignment error"); }
}
