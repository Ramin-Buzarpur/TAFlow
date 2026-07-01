import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { getFileDownloadUrl, deleteFile } from "@/server/services/files";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { url } = await getFileDownloadUrl(user.id, id);
    return ok({ url });
  } catch (e) { return fail(e, "Could not get file"); }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await deleteFile(user.id, id));
  } catch (e) { return fail(e, "Could not delete file"); }
}
