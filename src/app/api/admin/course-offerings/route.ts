import { requireGlobalRole } from "@/server/auth/session";
import { ok, created, fail } from "@/server/utils/api";
import { createCourseOfferingSchema } from "@/server/validation/admin";
import { listCourseOfferings, createCourseOffering, listProfessors } from "@/server/services/admin";

export async function GET(request: Request) {
  try {
    await requireGlobalRole(["SYSTEM_ADMIN", "EDUCATION_ADMIN"]);
    const url = new URL(request.url);
    if (url.searchParams.get("professors") === "true") return ok(await listProfessors());
    return ok(await listCourseOfferings());
  } catch (e) { return fail(e, "Could not list course offerings"); }
}

export async function POST(request: Request) {
  try {
    const user = await requireGlobalRole(["SYSTEM_ADMIN", "EDUCATION_ADMIN"]);
    const body = createCourseOfferingSchema.parse(await request.json());
    return created(await createCourseOffering(user.id, body));
  } catch (e) { return fail(e, "Could not create course offering"); }
}
