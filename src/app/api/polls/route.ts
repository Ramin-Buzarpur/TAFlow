import { requireUser } from "@/server/auth/session";
import { created, fail } from "@/server/utils/api";
import { createAvailabilityPollSchema } from "@/server/validation/surveys";
import { createAvailabilityPoll } from "@/server/services/surveys";
export async function POST(request: Request) { try { const user = await requireUser(); const body = createAvailabilityPollSchema.parse(await request.json()); return created(await createAvailabilityPoll(user.id, body)); } catch (e) { return fail(e, "Could not create poll"); } }
