import { NextResponse } from "next/server";
import { AppError } from "@/server/errors";
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
    const updated = await updateCourseRoleAssignment(user.id, { ...body, courseOfferingId, assignmentId });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.code, message: error.message, details: error.details }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Unexpected role update error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ courseOfferingId: string; assignmentId: string }> }
) {
  try {
    const user = await requireUser();
    const { courseOfferingId, assignmentId } = await context.params;
    const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
    const revoked = await revokeCourseRoleAssignment(user.id, { ...body, courseOfferingId, assignmentId });
    return NextResponse.json({ data: revoked });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.code, message: error.message, details: error.details }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Unexpected role revoke error" }, { status: 500 });
  }
}
