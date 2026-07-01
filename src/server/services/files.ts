import "server-only";
import { randomUUID, createHash } from "node:crypto";
import type { FileVisibility } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { isGlobalAdmin } from "@/server/auth/permissions";
import { coursePermissions } from "@/server/auth/permissions";
import { requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { putObject, getSignedDownloadUrl, deleteObject } from "@/server/storage/s3";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/server/validation/files";

export function validateUpload(meta: { mimeType: string; sizeBytes: number }) {
  if (!ALLOWED_MIME_TYPES.has(meta.mimeType)) {
    throw new AppError("UNSUPPORTED_FILE_TYPE", "This file type is not allowed", 422);
  }
  if (meta.sizeBytes <= 0 || meta.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "File exceeds the maximum allowed size", 422);
  }
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function uploadFile(actorId: string, input: { buffer: Buffer; originalName: string; mimeType: string; visibility?: FileVisibility }) {
  const limiter = checkRateLimit(makeRateLimitKey("upload-file", actorId), 30, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many file uploads", 429);
  validateUpload({ mimeType: input.mimeType, sizeBytes: input.buffer.byteLength });
  const storageKey = `${actorId}/${randomUUID()}-${sanitizeFileName(input.originalName)}`;
  const checksumSha256 = createHash("sha256").update(input.buffer).digest("hex");
  await putObject(storageKey, input.buffer, input.mimeType);
  const file = await db.uploadedFile.create({
    data: {
      ownerId: actorId,
      originalName: input.originalName,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength,
      checksumSha256,
      visibility: input.visibility ?? "PRIVATE"
    }
  });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "UploadedFile", entityId: file.id, metadata: { originalName: input.originalName, sizeBytes: file.sizeBytes } });
  return file;
}

export async function getFileDownloadUrl(actorId: string, fileId: string) {
  const file = await db.uploadedFile.findUnique({
    where: { id: fileId },
    include: { applicationResume: { include: { opportunity: true } } }
  });
  if (!file || file.deletedAt) throw new AppError("NOT_FOUND", "File not found", 404);

  if (file.ownerId !== actorId && file.visibility !== "PUBLIC") {
    const user = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true } });
    const admin = user ? isGlobalAdmin(user.globalRole) : false;
    if (!admin) {
      if (file.visibility === "COURSE_STAFF" && file.applicationResume) {
        await requireCoursePermission(actorId, file.applicationResume.opportunity.courseOfferingId, coursePermissions.REVIEW_TA_APPLICATION);
      } else {
        throw new PermissionError();
      }
    }
  }

  const url = await getSignedDownloadUrl(file.storageKey);
  await writeAuditLog({ actorId, action: "READ", entityType: "UploadedFile", entityId: file.id });
  return { url, file };
}

export async function deleteFile(actorId: string, fileId: string) {
  const file = await db.uploadedFile.findUnique({ where: { id: fileId } });
  if (!file || file.deletedAt) throw new AppError("NOT_FOUND", "File not found", 404);
  if (file.ownerId !== actorId) {
    const user = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true } });
    if (!user || !isGlobalAdmin(user.globalRole)) throw new PermissionError();
  }
  await db.uploadedFile.update({ where: { id: fileId }, data: { deletedAt: new Date() } });
  await deleteObject(file.storageKey);
  await writeAuditLog({ actorId, action: "DELETE", entityType: "UploadedFile", entityId: fileId });
  return { id: fileId, deleted: true };
}

export async function listMyFiles(actorId: string) {
  return db.uploadedFile.findMany({ where: { ownerId: actorId, deletedAt: null }, orderBy: { createdAt: "desc" } });
}
