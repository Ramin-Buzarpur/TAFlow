import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { created, fail, ok } from "@/server/utils/api";
import { createAnnouncement, listAnnouncements } from "@/server/services/content";
const schema = z.object({ title: z.string().min(3).max(200), body: z.string().min(3).max(5000), priority: z.string().optional(), courseOfferingId: z.string().optional(), departmentId: z.string().optional(), publishedAt: z.coerce.date().optional(), expiresAt: z.coerce.date().optional() });
export async function GET(request: Request) { try { const user = await requireUser(); const url = new URL(request.url); return ok(await listAnnouncements(user.id, { courseOfferingId: url.searchParams.get("courseOfferingId") || undefined })); } catch (e) { return fail(e, "Could not list announcements"); } }
export async function POST(request: Request) { try { const user = await requireUser(); const body = schema.parse(await request.json()); return created(await createAnnouncement(user.id, body)); } catch (e) { return fail(e, "Could not create announcement"); } }
