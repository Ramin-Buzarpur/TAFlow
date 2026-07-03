import { requireUser } from "@/server/auth/session";
import { fail } from "@/server/utils/api";
import { exportApplicationsToExcel } from "@/server/services/exports";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { mimeType, filename, body } = await exportApplicationsToExcel(user.id, id);
    return new Response(new Uint8Array(body), { headers: { "Content-Type": mimeType, "Content-Disposition": `attachment; filename=${filename}` } });
  } catch (e) { return fail(e, "Could not export applications"); }
}
