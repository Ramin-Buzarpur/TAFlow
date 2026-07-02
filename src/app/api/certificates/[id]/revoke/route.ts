import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { revokeCertificate } from "@/server/services/certificates";

const schema = z.object({ reason: z.string().trim().min(3).max(2000) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    return ok(await revokeCertificate(user.id, id, body.reason));
  } catch (e) { return fail(e, "Could not revoke certificate"); }
}
