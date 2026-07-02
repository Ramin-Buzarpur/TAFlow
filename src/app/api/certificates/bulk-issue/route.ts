import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { issueCertificatesBulk } from "@/server/services/certificates";

const schema = z.object({ requestIds: z.array(z.string().min(10).max(40)).min(1).max(100) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());
    return ok(await issueCertificatesBulk(user.id, body.requestIds));
  } catch (e) { return fail(e, "Could not bulk issue certificates"); }
}
