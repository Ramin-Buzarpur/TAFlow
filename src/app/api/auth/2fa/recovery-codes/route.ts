import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { regenerateRecoveryCodes } from "@/server/services/two-factor";

export async function POST() {
  try {
    const user = await requireUser();
    return ok(await regenerateRecoveryCodes(user.id));
  } catch (e) {
    return fail(e, "Could not regenerate recovery codes");
  }
}
