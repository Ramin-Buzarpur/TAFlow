import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { created, fail, ok } from "@/server/utils/api";
import { closeThread, getThread, replyThread } from "@/server/services/messaging";
const replySchema = z.object({ body: z.string().min(1).max(5000) });
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; return ok(await getThread(user.id, id)); } catch (e) { return fail(e, "Could not load thread"); } }
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; const body = replySchema.parse(await request.json()); return created(await replyThread(user.id, id, body.body)); } catch (e) { return fail(e, "Could not reply"); } }
export async function PATCH(_: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; return ok(await closeThread(user.id, id)); } catch (e) { return fail(e, "Could not close thread"); } }
