import { requireGlobalRole } from "@/server/auth/session";
import { ok, created, fail } from "@/server/utils/api";
import { createDepartmentSchema } from "@/server/validation/admin";
import { listDepartments, createDepartment } from "@/server/services/admin";

export async function GET() {
  try { await requireGlobalRole(["SYSTEM_ADMIN", "EDUCATION_ADMIN"]); return ok(await listDepartments()); }
  catch (e) { return fail(e, "Could not list departments"); }
}

export async function POST(request: Request) {
  try {
    const user = await requireGlobalRole(["SYSTEM_ADMIN", "EDUCATION_ADMIN"]);
    const body = createDepartmentSchema.parse(await request.json());
    return created(await createDepartment(user.id, body));
  } catch (e) { return fail(e, "Could not create department"); }
}
