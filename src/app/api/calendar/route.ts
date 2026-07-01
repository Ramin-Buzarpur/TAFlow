import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { created, fail, ok } from "@/server/utils/api";
import { createAcademicEvent, listAcademicEvents } from "@/server/services/content";
const schema = z.object({ title: z.string().min(2).max(200), description: z.string().max(2000).optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date().optional(), eventType: z.string().min(2).max(80), isImportant: z.boolean().optional(), semesterId: z.string().optional(), departmentId: z.string().optional(), courseOfferingId: z.string().optional() });
export async function GET(request: Request) { try { const user = await requireUser(); const url = new URL(request.url); return ok(await listAcademicEvents(user.id, { courseOfferingId: url.searchParams.get("courseOfferingId") || undefined })); } catch (e) { return fail(e, "Could not list calendar"); } }
export async function POST(request: Request) { try { const user = await requireUser(); const body = schema.parse(await request.json()); return created(await createAcademicEvent(user.id, body)); } catch (e) { return fail(e, "Could not create calendar event"); } }
