import { requireUser } from "@/server/auth/session";
import { ok, fail } from "@/server/utils/api";
import { parseGradeImportFile } from "@/server/services/gradebook";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return fail(new Error("Missing file"), "Missing file");
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseGradeImportFile(user.id, id, buffer);
    return ok({ rows });
  } catch (e) { return fail(e, "Could not parse import file"); }
}
