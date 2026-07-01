import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { globalSearch } from "@/server/services/search";
export async function GET(request: Request) { try { const user = await requireUser(); const q = new URL(request.url).searchParams.get("q") || ""; return ok(await globalSearch(user.id, q)); } catch (e) { return fail(e, "Could not search"); } }
