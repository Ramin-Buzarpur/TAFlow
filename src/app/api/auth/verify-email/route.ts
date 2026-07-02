import { z } from "zod";
import { ok, fail } from "@/server/utils/api";
import { markEmailVerified } from "@/server/services/users";
import { emailSchema } from "@/server/validation/common";

const verifySchema = z.object({
  email: emailSchema,
  token: z.string().min(20).max(256)
});

export async function POST(request: Request) {
  try {
    const input = verifySchema.parse(await request.json());
    await markEmailVerified(input.email, input.token);
    return ok({ ok: true });
  } catch (e) { return fail(e, "Invalid verification request"); }
}
