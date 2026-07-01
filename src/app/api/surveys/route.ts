import { requireUser } from "@/server/auth/session";
import { created, fail, ok } from "@/server/utils/api";
import { createSurveySchema } from "@/server/validation/surveys";
import { createSurvey, listSurveys } from "@/server/services/surveys";
export async function GET(request: Request) { try { const user = await requireUser(); const url = new URL(request.url); const courseOfferingId = url.searchParams.get("courseOfferingId"); if (!courseOfferingId) return ok([]); return ok(await listSurveys(user.id, courseOfferingId)); } catch (e) { return fail(e, "Could not list surveys"); } }
export async function POST(request: Request) { try { const user = await requireUser(); const body = createSurveySchema.parse(await request.json()); return created(await createSurvey(user.id, body)); } catch (e) { return fail(e, "Could not create survey"); } }
