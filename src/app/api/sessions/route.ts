import { requireUser } from "@/server/auth/session";
import { created, fail, ok } from "@/server/utils/api";
import { createOfficeHourSessionSchema } from "@/server/validation/sessions";
import { createOfficeHour, listOfficeHours } from "@/server/services/office-hours";

export async function GET(request: Request) {
  try { const user = await requireUser(); const url = new URL(request.url); return ok(await listOfficeHours(user.id, { courseOfferingId: url.searchParams.get("courseOfferingId") || undefined, upcoming: url.searchParams.get("upcoming") !== "false" })); }
  catch (e) { return fail(e, "Could not list sessions"); }
}
export async function POST(request: Request) {
  try { const user = await requireUser(); const body = createOfficeHourSessionSchema.parse(await request.json()); return created(await createOfficeHour(user.id, body)); }
  catch (e) { return fail(e, "Could not create session"); }
}
