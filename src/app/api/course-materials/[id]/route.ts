import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { deleteCourseMaterial } from "@/server/services/course-materials";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await deleteCourseMaterial(user.id, id));
  } catch (e) { return fail(e, "Could not delete course material"); }
}
