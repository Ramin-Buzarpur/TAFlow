import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { createGradeCategorySchema } from "@/server/validation/grades";
import { createGradeCategoryFull } from "@/server/services/gradebook-full";
export async function POST(request: Request) { try { const user = await requireUser(); const body = createGradeCategorySchema.parse(await request.json()); return created(await createGradeCategoryFull(user.id, body)); } catch (e) { return fail(e, "Could not create grade category"); } }
