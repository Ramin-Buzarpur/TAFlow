import { requireGlobalRole } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { listUsers } from "@/server/services/admin";

export async function GET(request: Request) {
  try {
    await requireGlobalRole(["SYSTEM_ADMIN", "EDUCATION_ADMIN"]);
    const q = new URL(request.url).searchParams.get("q") || undefined;
    return ok(await listUsers({ q }));
  } catch (e) { return fail(e, "Could not list users"); }
}
