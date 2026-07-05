import "server-only";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { deleteFile, requireAttachableOwnedFile } from "@/server/services/files";

const MATERIAL_INCLUDE = {
  file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
  uploadedBy: { select: { id: true, name: true, email: true } }
};

export async function uploadCourseMaterial(actorId: string, courseOfferingId: string, fileId: string, title?: string) {
  await requireCoursePermission(actorId, courseOfferingId, coursePermissions.MANAGE_COURSE_MATERIALS);
  await requireAttachableOwnedFile(actorId, fileId);
  const material = await db.$transaction(async (tx) => {
    const created = await tx.courseMaterial.create({
      data: { courseOfferingId, uploadedById: actorId, fileId, title },
      include: MATERIAL_INCLUDE
    });
    await tx.uploadedFile.update({ where: { id: fileId }, data: { visibility: "COURSE_STAFF" } });
    return created;
  });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "CourseMaterial", entityId: material.id, courseOfferingId, afterJson: material });
  return material;
}

export async function listCourseMaterials(actorId: string, courseOfferingId: string) {
  if (!(await canAccessCourseOffering(actorId, courseOfferingId))) throw new PermissionError();
  return db.courseMaterial.findMany({
    where: { courseOfferingId },
    include: MATERIAL_INCLUDE,
    orderBy: { createdAt: "desc" }
  });
}

export async function deleteCourseMaterial(actorId: string, materialId: string) {
  const material = await db.courseMaterial.findUnique({ where: { id: materialId } });
  if (!material) throw new AppError("NOT_FOUND", "Course material not found", 404);
  await deleteFile(actorId, material.fileId);
  return { id: materialId, deleted: true };
}
