import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { dashboardSummary } from "@/server/services/dashboard";
export async function GET() { try { const user = await requireUser(); return ok(await dashboardSummary(user.id)); } catch (e) { return fail(e, "Could not load dashboard"); } }
