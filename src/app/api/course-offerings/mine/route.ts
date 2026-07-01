import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { listMyCourseOfferings } from "@/server/services/rbac";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listMyCourseOfferings(user.id));
  } catch (e) { return fail(e, "Could not list my course offerings"); }
}
