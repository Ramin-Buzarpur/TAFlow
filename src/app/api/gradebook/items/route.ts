import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { createGradeItemSchema } from "@/server/validation/grades";
import { createGradeItemFull } from "@/server/services/gradebook-full";
export async function POST(request: Request) { try { const user = await requireUser(); const body = createGradeItemSchema.parse(await request.json()); return created(await createGradeItemFull(user.id, body)); } catch (e) { return fail(e, "Could not create grade item"); } }
