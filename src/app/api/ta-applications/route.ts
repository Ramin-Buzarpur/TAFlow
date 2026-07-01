import { requireUser } from "@/server/auth/session";
import { fail, ok, pageParams } from "@/server/utils/api";
import { listApplications } from "@/server/services/ta-workflow";

export async function GET(request: Request) {
  try { const user = await requireUser(); const p = pageParams(request); return ok({ items: await listApplications(user.id, { mine: true, skip: p.skip, take: p.take }), page: p.page, pageSize: p.pageSize }); }
  catch (e) { return fail(e, "Could not list my applications"); }
}
