import { requireUser } from "@/server/auth/session";
import { created, fail, ok, pageParams } from "@/server/utils/api";
import { submitTAApplicationSchema } from "@/server/validation/ta";
import { listApplications, submitTAApplication } from "@/server/services/ta-workflow";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await context.params; const p = pageParams(request); const url = new URL(request.url); return ok({ items: await listApplications(user.id, { opportunityId: id, status: (url.searchParams.get("status") || undefined) as any, skip: p.skip, take: p.take }), page: p.page, pageSize: p.pageSize }); }
  catch (e) { return fail(e, "Could not list applications"); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await context.params; const body = submitTAApplicationSchema.omit({ opportunityId: true }).parse(await request.json()); return created(await submitTAApplication(user.id, { ...body, opportunityId: id })); }
  catch (e) { return fail(e, "Could not submit application"); }
}
