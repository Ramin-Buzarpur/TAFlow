import { fail, ok } from "@/server/utils/api";
import { verifyCertificatePublic } from "@/server/services/certificates";
export async function GET(_: Request, context: { params: Promise<{ code: string }> }) { try { const { code } = await context.params; return ok(await verifyCertificatePublic(code)); } catch (e) { return fail(e, "Could not verify certificate"); } }
