import { requireGlobalRole } from "@/server/auth/session";
import { ok, created, fail } from "@/server/utils/api";
import { createSemesterSchema } from "@/server/validation/admin";
import { listSemesters, createSemester } from "@/server/services/admin";

export async function GET() {
  try { await requireGlobalRole(["SYSTEM_ADMIN", "EDUCATION_ADMIN"]); return ok(await listSemesters()); }
  catch (e) { return fail(e, "Could not list semesters"); }
}

export async function POST(request: Request) {
  try {
    const user = await requireGlobalRole(["SYSTEM_ADMIN", "EDUCATION_ADMIN"]);
    const body = createSemesterSchema.parse(await request.json());
    return created(await createSemester(user.id, body));
  } catch (e) { return fail(e, "Could not create semester"); }
}
