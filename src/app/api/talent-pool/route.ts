import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { listTalentPool } from "@/server/services/ta-workflow";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listTalentPool(user.id));
  } catch (e) { return fail(e, "Could not list talent pool"); }
}
