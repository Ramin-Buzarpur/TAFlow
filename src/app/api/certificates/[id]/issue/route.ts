import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { issueCertificate } from "@/server/services/certificates-full";
export async function POST(_: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; return ok(await issueCertificate(user.id, id)); } catch (e) { return fail(e, "Could not issue certificate"); } }
