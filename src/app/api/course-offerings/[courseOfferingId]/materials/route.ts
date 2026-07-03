import { requireUser } from "@/server/auth/session";
import { created, fail, ok } from "@/server/utils/api";
import { uploadCourseMaterialSchema } from "@/server/validation/course-materials";
import { listCourseMaterials, uploadCourseMaterial } from "@/server/services/course-materials";

export async function GET(_request: Request, context: { params: Promise<{ courseOfferingId: string }> }) {
  try {
    const user = await requireUser();
    const { courseOfferingId } = await context.params;
    return ok(await listCourseMaterials(user.id, courseOfferingId));
  } catch (e) { return fail(e, "Could not list course materials"); }
}

export async function POST(request: Request, context: { params: Promise<{ courseOfferingId: string }> }) {
  try {
    const user = await requireUser();
    const { courseOfferingId } = await context.params;
    const body = uploadCourseMaterialSchema.parse(await request.json());
    return created(await uploadCourseMaterial(user.id, courseOfferingId, body.fileId, body.title));
  } catch (e) { return fail(e, "Could not upload course material"); }
}
