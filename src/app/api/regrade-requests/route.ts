import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { created, ok, fail } from "@/server/utils/api";
import { createRegradeRequest, listMyRegradeRequests } from "@/server/services/gradebook";
import { cuidSchema, safeText } from "@/server/validation/common";

const schema = z.object({ gradeRecordId: cuidSchema, reason: safeText });

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listMyRegradeRequests(user.id));
  } catch (e) { return fail(e, "Could not list regrade requests"); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await request.json());
    return created(await createRegradeRequest(user.id, body));
  } catch (e) { return fail(e, "Could not create regrade request"); }
}
