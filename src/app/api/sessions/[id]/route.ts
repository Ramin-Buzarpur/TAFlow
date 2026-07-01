import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { getJoinableSession, updateOfficeHourStatus } from "@/server/services/office-hours";
const schema = z.object({ status: z.enum(["LIVE", "COMPLETED", "CANCELLED"]) });
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; return ok(await getJoinableSession(user.id, id)); } catch (e) { return fail(e, "Could not load session"); } }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; const body = schema.parse(await request.json()); return ok(await updateOfficeHourStatus(user.id, id, body.status)); } catch (e) { return fail(e, "Could not update session"); } }
