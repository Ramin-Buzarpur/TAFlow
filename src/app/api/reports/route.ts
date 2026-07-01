import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { getManagementReport } from "@/server/services/reports";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getManagementReport(user.id));
  } catch (e) { return fail(e, "Could not load management report"); }
}
