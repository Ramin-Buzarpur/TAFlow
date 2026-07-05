import "server-only";
import { randomUUID, createHash } from "node:crypto";
import type { FileVisibility, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { isGlobalAdmin } from "@/server/auth/permissions";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission } from "@/server/services/rbac";
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

const FILE_AUTH_INCLUDE = {
  applicationResume: { include: { opportunity: true } },
  courseMaterial: true,
  taskSubmission: { include: { task: true } },
  assignmentSubmission: { include: { gradeItem: true } },
  certificatePdf: { include: { request: true } },
  certificateTemplate: true
} satisfies Prisma.UploadedFileInclude;

type FileWithAuthContext = Prisma.UploadedFileGetPayload<{ include: typeof FILE_AUTH_INCLUDE }>;

function hasBusinessAttachment(file: FileWithAuthContext) {
  return Boolean(
    file.applicationResume ||
    file.courseMaterial ||
    file.taskSubmission ||
    file.assignmentSubmission ||
    file.certificatePdf ||
    file.certificateTemplate
  );
}

export async function uploadFile(actorId: string, input: { buffer: Buffer; originalName: string; mimeType: string; visibility?: FileVisibility }) {
  const limiter = await checkRateLimit(makeRateLimitKey("upload-file", actorId), 30, 60 * 60 * 1000);
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
    include: FILE_AUTH_INCLUDE
  });
  if (!file || file.deletedAt) throw new AppError("NOT_FOUND", "File not found", 404);

  const user = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true } });
  const admin = user ? isGlobalAdmin(user.globalRole) : false;

  if (!admin) {
    if (file.applicationResume) {
      if (file.applicationResume.applicantId !== actorId) {
        await requireCoursePermission(actorId, file.applicationResume.opportunity.courseOfferingId, coursePermissions.REVIEW_TA_APPLICATION);
      }
    } else if (file.courseMaterial) {
      if (!(await canAccessCourseOffering(actorId, file.courseMaterial.courseOfferingId))) throw new PermissionError();
    } else if (file.taskSubmission) {
      if (file.taskSubmission.userId !== actorId) {
        await requireCoursePermission(actorId, file.taskSubmission.task.courseOfferingId, coursePermissions.MANAGE_OFFICE_HOUR);
      }
    } else if (file.assignmentSubmission) {
      if (file.assignmentSubmission.studentId !== actorId) {
        await requireCoursePermission(actorId, file.assignmentSubmission.gradeItem.courseOfferingId, coursePermissions.MANAGE_GRADEBOOK);
      }
    } else if (file.certificatePdf) {
      if (file.certificatePdf.request.userId !== actorId) {
        await requireCoursePermission(actorId, file.certificatePdf.request.courseOfferingId, coursePermissions.APPROVE_CERTIFICATE);
      }
    } else if (file.certificateTemplate) {
      throw new PermissionError();
    } else if (file.ownerId !== actorId) {
      throw new PermissionError();
    }
  }

  const url = await getSignedDownloadUrl(file.storageKey);
  await writeAuditLog({ actorId, action: "READ", entityType: "UploadedFile", entityId: file.id });
  return { url, file };
}

export async function requireAttachableOwnedFile(actorId: string, fileId: string) {
  const file = await db.uploadedFile.findUnique({ where: { id: fileId }, include: FILE_AUTH_INCLUDE });
  if (!file || file.deletedAt) throw new AppError("NOT_FOUND", "File not found", 404);
  if (file.ownerId !== actorId) throw new PermissionError("Only the file owner can attach this file");
  if (hasBusinessAttachment(file)) throw new AppError("FILE_ALREADY_ATTACHED", "File is already attached to another record", 409);
  return file;
}

async function deleteStoredFile(file: { id: string; storageKey: string }) {
  await deleteObject(file.storageKey);
  await db.uploadedFile.update({ where: { id: file.id }, data: { deletedAt: new Date() } });
}

export async function deleteFile(actorId: string, fileId: string) {
  const file = await db.uploadedFile.findUnique({ where: { id: fileId }, include: FILE_AUTH_INCLUDE });
  if (!file || file.deletedAt) throw new AppError("NOT_FOUND", "File not found", 404);

  const user = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true } });
  const admin = user ? isGlobalAdmin(user.globalRole) : false;

  if (file.courseMaterial) {
    await requireCoursePermission(actorId, file.courseMaterial.courseOfferingId, coursePermissions.MANAGE_COURSE_MATERIALS);
    await deleteObject(file.storageKey);
    await db.$transaction([
      db.courseMaterial.delete({ where: { id: file.courseMaterial.id } }),
      db.uploadedFile.update({ where: { id: file.id }, data: { deletedAt: new Date() } })
    ]);
    await writeAuditLog({ actorId, action: "DELETE", entityType: "CourseMaterial", entityId: file.courseMaterial.id, courseOfferingId: file.courseMaterial.courseOfferingId });
  } else if (hasBusinessAttachment(file)) {
    throw new PermissionError("Attached files must be deleted through their parent workflow");
  } else {
    if (file.ownerId !== actorId && !admin) throw new PermissionError();
    await deleteStoredFile(file);
  }

  await writeAuditLog({ actorId, action: "DELETE", entityType: "UploadedFile", entityId: fileId });
  return { id: fileId, deleted: true };
}

export async function listMyFiles(actorId: string) {
  return db.uploadedFile.findMany({
    where: { ownerId: actorId, deletedAt: null },
    select: { id: true, ownerId: true, originalName: true, mimeType: true, sizeBytes: true, visibility: true, createdAt: true, deletedAt: true },
    orderBy: { createdAt: "desc" }
  });
}
