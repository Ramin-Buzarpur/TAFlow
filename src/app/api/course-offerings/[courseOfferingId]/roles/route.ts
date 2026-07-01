import { NextResponse } from "next/server";
import { AppError } from "@/server/errors";
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
    const result = await listCourseRoleAssignments(user.id, {
      courseOfferingId,
      role: url.searchParams.get("role") || undefined,
      includeRevoked: url.searchParams.get("includeRevoked") === "true"
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.code, message: error.message, details: error.details }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Unexpected role list error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ courseOfferingId: string }> }
) {
  try {
    const user = await requireUser();
    const { courseOfferingId } = await context.params;
    const body = await request.json();
    const assignment = await assignCourseRole(user.id, { ...body, courseOfferingId });
    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.code, message: error.message, details: error.details }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Unexpected role assignment error" }, { status: 500 });
  }
}
