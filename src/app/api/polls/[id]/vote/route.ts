import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { votePollFull } from "@/server/services/survey-full";
const schema = z.object({ optionId: z.string() });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; const body = schema.parse(await request.json()); return created(await votePollFull(user.id, id, body.optionId)); } catch (e) { return fail(e, "Could not vote"); } }
