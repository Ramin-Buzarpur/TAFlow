import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { upsertGradeRecordSchema } from "@/server/validation/grades";
import { upsertGradeRecord } from "@/server/services/gradebook";
export async function POST(request: Request) { try { const user = await requireUser(); const body = upsertGradeRecordSchema.parse(await request.json()); return created(await upsertGradeRecord(user.id, body)); } catch (e) { return fail(e, "Could not save grade"); } }
