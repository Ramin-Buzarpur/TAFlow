import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { upsertGradeRecordSchema } from "@/server/validation/grades";
import { upsertGradeRecordFull } from "@/server/services/gradebook-full";
export async function POST(request: Request) { try { const user = await requireUser(); const body = upsertGradeRecordSchema.parse(await request.json()); return created(await upsertGradeRecordFull(user.id, body)); } catch (e) { return fail(e, "Could not save grade"); } }
