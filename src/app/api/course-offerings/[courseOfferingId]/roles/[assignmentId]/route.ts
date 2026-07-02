import { ok, fail } from "@/server/utils/api";
import { requireUser } from "@/server/auth/session";
import { revokeCourseRoleAssignment, updateCourseRoleAssignment } from "@/server/services/course-roles";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ courseOfferingId: string; assignmentId: string }> }
) {
  try {
    const user = await requireUser();
    const { courseOfferingId, assignmentId } = await context.params;
    const body = await request.json();
    return ok(await updateCourseRoleAssignment(user.id, { ...body, courseOfferingId, assignmentId }));
  } catch (e) { return fail(e, "Unexpected role update error"); }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ courseOfferingId: string; assignmentId: string }> }
) {
  try {
    const user = await requireUser();
    const { courseOfferingId, assignmentId } = await context.params;
    const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
    return ok(await revokeCourseRoleAssignment(user.id, { ...body, courseOfferingId, assignmentId }));
  } catch (e) { return fail(e, "Unexpected role revoke error"); }
}
