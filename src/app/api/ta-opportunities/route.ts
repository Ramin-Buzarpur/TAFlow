import { requireUser } from "@/server/auth/session";
import { created, fail, ok, pageParams } from "@/server/utils/api";
import { createTAOpportunitySchema } from "@/server/validation/ta";
import { createTAOpportunity, listTAOpportunities } from "@/server/services/ta-workflow";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const p = pageParams(request);
    const data = await listTAOpportunities(user.id, { courseOfferingId: url.searchParams.get("courseOfferingId") || undefined, openOnly: url.searchParams.get("openOnly") !== "false", q: url.searchParams.get("q") || undefined, skip: p.skip, take: p.take });
    return ok({ items: data, page: p.page, pageSize: p.pageSize });
  } catch (e) { return fail(e, "Could not list TA opportunities"); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createTAOpportunitySchema.parse(await request.json());
    return created(await createTAOpportunity(user.id, body));
  } catch (e) { return fail(e, "Could not create TA opportunity"); }
}
