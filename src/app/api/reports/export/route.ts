import { requireUser } from "@/server/auth/session";
import { fail } from "@/server/utils/api";
import { exportManagementReportCsv } from "@/server/services/reports";

export async function GET() {
  try {
    const user = await requireUser();
    const csv = await exportManagementReportCsv(user.id);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=management-report.csv"
      }
    });
  } catch (e) {
    return fail(e, "Could not export reports");
  }
}
