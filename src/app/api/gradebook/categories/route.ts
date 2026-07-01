import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { createGradeCategorySchema } from "@/server/validation/grades";
import { createGradeCategory } from "@/server/services/gradebook";
export async function POST(request: Request) { try { const user = await requireUser(); const body = createGradeCategorySchema.parse(await request.json()); return created(await createGradeCategory(user.id, body)); } catch (e) { return fail(e, "Could not create grade category"); } }
