import { requireUser } from "@/server/auth/session";
import { fail } from "@/server/utils/api";
import { exportGradebookCsv } from "@/server/services/gradebook-full";
export async function GET(_: Request, context: { params: Promise<{ courseOfferingId: string }> }) { try { const user = await requireUser(); const { courseOfferingId } = await context.params; const csv = await exportGradebookCsv(user.id, courseOfferingId); return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=gradebook-${courseOfferingId}.csv` } }); } catch (e) { return fail(e, "Could not export gradebook"); } }
