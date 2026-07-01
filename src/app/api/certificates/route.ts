import { requireUser } from "@/server/auth/session";
import { created, fail, ok } from "@/server/utils/api";
import { requestCertificateSchema } from "@/server/validation/certificates";
import { listMyCertificates, requestCertificateFull } from "@/server/services/certificates-full";
export async function GET() { try { const user = await requireUser(); return ok(await listMyCertificates(user.id)); } catch (e) { return fail(e, "Could not list certificates"); } }
export async function POST(request: Request) { try { const user = await requireUser(); const body = requestCertificateSchema.parse(await request.json()); return created(await requestCertificateFull(user.id, body)); } catch (e) { return fail(e, "Could not request certificate"); } }
