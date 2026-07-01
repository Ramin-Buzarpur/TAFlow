import { requireGlobalRole } from "@/server/auth/session";
import { ok, created, fail } from "@/server/utils/api";
import { createCourseSchema } from "@/server/validation/admin";
import { listCourses, createCourse } from "@/server/services/admin";

export async function GET() {
  try { await requireGlobalRole(["SYSTEM_ADMIN", "EDUCATION_ADMIN"]); return ok(await listCourses()); }
  catch (e) { return fail(e, "Could not list courses"); }
}

export async function POST(request: Request) {
  try {
    const user = await requireGlobalRole(["SYSTEM_ADMIN", "EDUCATION_ADMIN"]);
    const body = createCourseSchema.parse(await request.json());
    return created(await createCourse(user.id, body));
  } catch (e) { return fail(e, "Could not create course"); }
}
