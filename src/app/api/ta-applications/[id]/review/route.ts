import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { reviewApplicationSchema } from "@/server/validation/ta";
import { submitApplicationReview } from "@/server/services/ta-workflow";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = reviewApplicationSchema.omit({ applicationId: true }).parse(await request.json());
    return created(await submitApplicationReview(user.id, { applicationId: id, ...body }));
  } catch (e) { return fail(e, "Could not submit review"); }
}
