import { ok, fail } from "@/server/utils/api";
import { resendVerificationEmail } from "@/server/services/users";

export async function POST(request: Request) {
  try {
    return ok(await resendVerificationEmail(await request.json()));
  } catch (e) { return fail(e, "Invalid verification resend request"); }
}
