import { ok, fail } from "@/server/utils/api";
import { resetPassword } from "@/server/services/password-reset";

export async function POST(request: Request) {
  try {
    return ok(await resetPassword(await request.json()));
  } catch (e) { return fail(e, "Invalid password reset request"); }
}
