import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { getMyProfile, updateMyProfile } from "@/server/services/users";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getMyProfile(user.id));
  } catch (e) { return fail(e, "Could not load profile"); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    return ok(await updateMyProfile(user.id, await request.json()));
  } catch (e) { return fail(e, "Could not update profile"); }
}
