import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { disableTwoFactor } from "@/server/services/two-factor";

export async function POST() {
  try {
    const user = await requireUser();
    return ok(await disableTwoFactor(user.id));
  } catch (e) { return fail(e, "Unexpected 2FA disable error"); }
}
