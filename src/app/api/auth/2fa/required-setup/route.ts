import { z } from "zod";
import { ok, fail } from "@/server/utils/api";
import { confirmRequiredTwoFactorSetup, createRequiredTwoFactorSetup } from "@/server/services/two-factor";

const startSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
  label: z.string().trim().min(2).max(80).default("Authenticator app")
});

const confirmSchema = z.object({
  methodId: z.string().min(10).max(40),
  setupToken: z.string().min(20).max(256),
  code: z.string().regex(/^\d{6}$/)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body?.setupToken) return ok(await confirmRequiredTwoFactorSetup(confirmSchema.parse(body)));
    return ok(await createRequiredTwoFactorSetup(startSchema.parse(body)));
  } catch (e) {
    return fail(e, "Invalid 2FA enrollment request");
  }
}
