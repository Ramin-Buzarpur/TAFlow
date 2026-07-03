import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { submitAssignment } from "@/server/services/gradebook";
import { cuidSchema } from "@/server/validation/common";

const schema = z.object({ fileId: cuidSchema, note: z.string().trim().max(2000).optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    return ok(await submitAssignment(user.id, id, body.fileId, body.note));
  } catch (e) { return fail(e, "Could not submit assignment"); }
}
