import { requireUser } from "@/server/auth/session";
import { fail } from "@/server/utils/api";
import { exportSurveyResultsCsv } from "@/server/services/surveys";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const csv = await exportSurveyResultsCsv(user.id, id);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=survey-results-${id}.csv`
      }
    });
  } catch (e) {
    return fail(e, "Could not export survey results");
  }
}
