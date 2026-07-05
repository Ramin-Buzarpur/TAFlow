import { requireUser } from "@/server/auth/session";
import { ok, created, fail } from "@/server/utils/api";
import { uploadFile, listMyFiles } from "@/server/services/files";

function publicUploadedFile(file: Awaited<ReturnType<typeof uploadFile>>) {
  return {
    id: file.id,
    ownerId: file.ownerId,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    visibility: file.visibility,
    createdAt: file.createdAt,
    deletedAt: file.deletedAt
  };
}

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
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile(user.id, {
      buffer,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream"
    });
    return created(publicUploadedFile(uploaded));
  } catch (e) { return fail(e, "Could not upload file"); }
}
