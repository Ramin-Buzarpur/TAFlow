import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { created, fail, ok } from "@/server/utils/api";
import { createThread, listThreads } from "@/server/services/messaging";
const schema = z.object({ courseOfferingId: z.string().optional(), participantIds: z.array(z.string()).min(1), subject: z.string().min(3).max(200), body: z.string().min(1).max(5000), type: z.enum(["COURSE_GENERAL", "PRIVATE_STAFF", "GRADE_APPEAL", "OFFICE_HOUR", "ADMIN_SUPPORT"]) });
export async function GET(request: Request) { try { const user = await requireUser(); const url = new URL(request.url); return ok(await listThreads(user.id, { courseOfferingId: url.searchParams.get("courseOfferingId") || undefined, closed: url.searchParams.has("closed") ? url.searchParams.get("closed") === "true" : undefined })); } catch (e) { return fail(e, "Could not list messages"); } }
export async function POST(request: Request) { try { const user = await requireUser(); const body = schema.parse(await request.json()); return created(await createThread(user.id, body)); } catch (e) { return fail(e, "Could not create thread"); } }
