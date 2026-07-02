import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { respondToRegradeRequest } from "@/server/services/gradebook";
import { scoreSchema } from "@/server/validation/common";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  response: z.string().trim().min(3).max(2000),
  newScore: scoreSchema.optional()
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    return ok(await respondToRegradeRequest(user.id, id, body));
  } catch (e) { return fail(e, "Could not respond to regrade request"); }
}
