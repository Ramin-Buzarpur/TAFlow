import { requireUser } from "@/server/auth/session";
import { fail, ok } from "@/server/utils/api";
import { decideCertificateRequestSchema } from "@/server/validation/certificates";
import { professorDecideCertificate } from "@/server/services/certificates-full";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await requireUser(); const { id } = await context.params; const body = decideCertificateRequestSchema.omit({ requestId: true }).parse(await request.json()); return ok(await professorDecideCertificate(user.id, id, body.decision, body.rejectionReason)); } catch (e) { return fail(e, "Could not decide certificate"); } }
