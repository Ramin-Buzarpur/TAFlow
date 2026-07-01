import { requireUser } from "@/server/auth/session";
import { ok, created, fail } from "@/server/utils/api";
import { uploadFile, listMyFiles } from "@/server/services/files";
import { fileVisibilitySchema } from "@/server/validation/files";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listMyFiles(user.id));
  } catch (e) { return fail(e, "Could not list files"); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return fail(new Error("Missing file"), "Missing file");
    const visibilityRaw = formData.get("visibility");
    const visibility = visibilityRaw ? fileVisibilitySchema.parse(visibilityRaw) : undefined;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile(user.id, {
      buffer,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      visibility
    });
    return created(uploaded);
  } catch (e) { return fail(e, "Could not upload file"); }
}
