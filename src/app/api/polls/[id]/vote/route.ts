import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { votePoll } from "@/server/services/surveys";
const schema = z.object({ optionId: z.string() });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; const body = schema.parse(await request.json()); return created(await votePoll(user.id, id, body.optionId)); } catch (e) { return fail(e, "Could not vote"); } }
