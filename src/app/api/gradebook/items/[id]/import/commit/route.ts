import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { commitGradeImport } from "@/server/services/gradebook";
import { cuidSchema } from "@/server/validation/common";

const schema = z.object({ rows: z.array(z.object({ studentId: cuidSchema, score: z.number().min(0) })).min(1) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    return ok(await commitGradeImport(user.id, id, body.rows));
  } catch (e) { return fail(e, "Could not commit import"); }
}
