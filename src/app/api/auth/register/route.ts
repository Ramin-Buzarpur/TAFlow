import { created, fail } from "@/server/utils/api";
import { registerUser } from "@/server/services/users";

export async function POST(request: Request) {
  try {
    return created(await registerUser(await request.json()));
  } catch (e) { return fail(e, "Unexpected registration error"); }
}
