import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { createTwoFactorSetup } from "@/server/services/two-factor";

const schema = z.object({ label: z.string().trim().min(2).max(80).default("Authenticator app") });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
    const input = schema.parse(body);
    return created(await createTwoFactorSetup(user.id, input.label));
  } catch (e) { return fail(e, "Invalid 2FA setup request"); }
}
