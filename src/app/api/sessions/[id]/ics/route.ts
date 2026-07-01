import { requireUser } from "@/server/auth/session";
import { fail } from "@/server/utils/api";
import { buildIcs, getJoinableSession } from "@/server/services/office-hours";
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(); const { id } = await context.params; const session = await getJoinableSession(user.id, id); return new Response(buildIcs(session), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename=session-${id}.ics` } }); }
  catch (e) { return fail(e, "Could not export ICS"); }
}
