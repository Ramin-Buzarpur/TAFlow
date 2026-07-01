import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { submitSurveyAnswer } from "@/server/services/surveys";
const schema = z.object({ answers: z.array(z.object({ questionId: z.string(), valueJson: z.unknown() })).min(1) });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; const body = schema.parse(await request.json()); return created(await submitSurveyAnswer(user.id, id, body.answers)); } catch (e) { return fail(e, "Could not submit survey"); } }
