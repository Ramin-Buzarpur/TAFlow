import { NextResponse } from "next/server";
import { AppError } from "@/server/errors";
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
    return NextResponse.json({
      data: {
        offering,
        permissions: Array.from(permissions)
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.code, message: error.message, details: error.details }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Unexpected course context error" }, { status: 500 });
  }
}
