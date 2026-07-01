import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { changeMyPassword } from "@/server/services/users";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    return ok(await changeMyPassword(user.id, await request.json()));
  } catch (e) { return fail(e, "Could not change password"); }
}
