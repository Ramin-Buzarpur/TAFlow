import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { listTalentPool } from "@/server/services/ta-workflow";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const sort = url.searchParams.get("sort");
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q") || undefined;
    return ok(await listTalentPool(user.id, {
      q,
      status: status === "REJECTED" || status === "WITHDRAWN" ? status : undefined,
      sort: sort === "score" || sort === "course" ? sort : "recent"
    }));
  } catch (e) { return fail(e, "Could not list talent pool"); }
}
