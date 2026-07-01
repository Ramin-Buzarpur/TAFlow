import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { requireCoursePermission } from "@/server/services/rbac";
import { parseInput } from "@/server/utils/result";
import {
  createGradeCategorySchema,
  createGradeItemSchema,
  importGradesSchema,
  publishGradeItemSchema,
  upsertGradeRecordSchema
} from "@/server/validation/grades";
import { audit } from "@/server/services/audit";

export async function createGradeCategory(actorId: string, input: unknown) {
  const data = parseInput(createGradeCategorySchema, input);
  await requireCoursePermission(actorId, data.courseOfferingId, coursePermissions.MANAGE_GRADEBOOK);

  const total = await db.gradeCategory.aggregate({
    where: { courseOfferingId: data.courseOfferingId },
    _sum: { weight: true }
  });
  const nextTotal = Number(total._sum.weight ?? 0) + data.weight;
  if (nextTotal > 100) throw new AppError("GRADE_WEIGHT_OVERFLOW", "Total grade category weight cannot exceed 100", 409);

  const category = await db.gradeCategory.create({
    data: {
      courseOfferingId: data.courseOfferingId,
      createdById: actorId,
      name: data.name,
      weight: data.weight,
      maxScore: data.maxScore,
      visibility: data.visibility
    }
  });

  await audit({ actorId, action: "CREATE", entityType: "GradeCategory", entityId: category.id, courseOfferingId: data.courseOfferingId, afterJson: category });
  return category;
}

export async function createGradeItem(actorId: string, input: unknown) {
  const data = parseInput(createGradeItemSchema, input);
  await requireCoursePermission(actorId, data.courseOfferingId, coursePermissions.MANAGE_GRADEBOOK);

  const item = await db.gradeItem.create({
    data: {
      courseOfferingId: data.courseOfferingId,
      categoryId: data.categoryId,
      createdById: actorId,
      title: data.title,
      maxScore: data.maxScore,
      dueAt: data.dueAt,
      visibility: data.visibility
    }
  });

  await audit({ actorId, action: "CREATE", entityType: "GradeItem", entityId: item.id, courseOfferingId: data.courseOfferingId, afterJson: item });
  return item;
}

export async function upsertGradeRecord(actorId: string, input: unknown) {
  const data = parseInput(upsertGradeRecordSchema, input);

  const item = await db.gradeItem.findUnique({
    where: { id: data.gradeItemId },
    select: { id: true, courseOfferingId: true, maxScore: true, lockedAt: true }
  });
  if (!item) throw new AppError("GRADE_ITEM_NOT_FOUND", "Grade item not found", 404);
  if (item.lockedAt) throw new AppError("GRADE_ITEM_LOCKED", "Locked grade item cannot be edited", 409);
  if (data.score > Number(item.maxScore)) throw new AppError("SCORE_OVER_MAX", "Score cannot exceed item max score", 422);

  await requireCoursePermission(actorId, item.courseOfferingId, coursePermissions.EDIT_ASSIGNED_GRADES);

  return db.$transaction(async (tx) => {
    const oldRecord = await tx.gradeRecord.findUnique({
      where: { gradeItemId_studentId: { gradeItemId: data.gradeItemId, studentId: data.studentId } }
    });

    const record = await tx.gradeRecord.upsert({
      where: { gradeItemId_studentId: { gradeItemId: data.gradeItemId, studentId: data.studentId } },
      create: {
        gradeItemId: data.gradeItemId,
        studentId: data.studentId,
        score: data.score,
        feedback: data.feedback,
        editedById: actorId
      },
      update: {
        score: data.score,
        feedback: data.feedback,
        editedById: actorId,
        status: "DRAFT"
      }
    });

    await tx.gradeChangeLog.create({
      data: {
        gradeRecordId: record.id,
        changedById: actorId,
        oldScore: oldRecord?.score,
        newScore: data.score,
        oldStatus: oldRecord?.status,
        newStatus: record.status,
        reason: data.reason
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: oldRecord ? "UPDATE" : "CREATE",
        entityType: "GradeRecord",
        entityId: record.id,
        courseOfferingId: item.courseOfferingId,
        beforeJson: oldRecord ?? undefined,
        afterJson: record
      }
    });

    return record;
  });
}

export async function publishGradeItem(actorId: string, input: unknown) {
  const data = parseInput(publishGradeItemSchema, input);

  const item = await db.gradeItem.findUnique({
    where: { id: data.gradeItemId },
    select: { id: true, courseOfferingId: true }
  });
  if (!item) throw new AppError("GRADE_ITEM_NOT_FOUND", "Grade item not found", 404);
  await requireCoursePermission(actorId, item.courseOfferingId, coursePermissions.PUBLISH_GRADES);

  return db.$transaction(async (tx) => {
    await tx.gradeRecord.updateMany({
      where: { gradeItemId: data.gradeItemId, status: { in: ["DRAFT", "FINALIZED"] } },
      data: { status: "PUBLISHED", publishedAt: new Date() }
    });

    const updated = await tx.gradeItem.update({
      where: { id: data.gradeItemId },
      data: { visibility: "PUBLISHED" }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "PUBLISH",
        entityType: "GradeItem",
        entityId: item.id,
        courseOfferingId: item.courseOfferingId,
        afterJson: updated
      }
    });

    return updated;
  });
}

export async function importGradesTransactionally(actorId: string, input: unknown) {
  const data = parseInput(importGradesSchema, input);
  await requireCoursePermission(actorId, data.courseOfferingId, coursePermissions.EDIT_ASSIGNED_GRADES);

  const item = await db.gradeItem.findUnique({
    where: { id: data.gradeItemId },
    select: { id: true, courseOfferingId: true, maxScore: true, lockedAt: true }
  });
  if (!item || item.courseOfferingId !== data.courseOfferingId) throw new AppError("GRADE_ITEM_NOT_FOUND", "Grade item not found", 404);
  if (item.lockedAt) throw new AppError("GRADE_ITEM_LOCKED", "Locked grade item cannot be imported", 409);

  return db.$transaction(async (tx) => {
    const batch = await tx.gradeImportBatch.create({
      data: {
        courseOfferingId: data.courseOfferingId,
        importedById: actorId,
        format: data.format,
        status: "VALIDATING",
        totalRows: data.rows.length
      }
    });

    let acceptedRows = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (const [index, row] of data.rows.entries()) {
      if (row.score > Number(item.maxScore)) {
        errors.push({ row: index + 1, reason: "score exceeds maxScore" });
        continue;
      }

      const student = await tx.user.findFirst({
        where: { studentProfile: { studentNumber: row.studentNumber } },
        select: { id: true }
      });

      if (!student) {
        errors.push({ row: index + 1, reason: "student not found" });
        continue;
      }

      const enrollment = await tx.courseEnrollment.findUnique({
        where: { courseOfferingId_studentId: { courseOfferingId: data.courseOfferingId, studentId: student.id } },
        select: { id: true }
      });

      if (!enrollment) {
        errors.push({ row: index + 1, reason: "student is not enrolled in this course offering" });
        continue;
      }

      const oldRecord = await tx.gradeRecord.findUnique({
        where: { gradeItemId_studentId: { gradeItemId: data.gradeItemId, studentId: student.id } }
      });

      const record = await tx.gradeRecord.upsert({
        where: { gradeItemId_studentId: { gradeItemId: data.gradeItemId, studentId: student.id } },
        create: {
          gradeItemId: data.gradeItemId,
          studentId: student.id,
          score: row.score,
          feedback: row.feedback,
          editedById: actorId
        },
        update: {
          score: row.score,
          feedback: row.feedback,
          editedById: actorId,
          status: "DRAFT"
        }
      });

      await tx.gradeChangeLog.create({
        data: {
          gradeRecordId: record.id,
          changedById: actorId,
          oldScore: oldRecord?.score,
          newScore: row.score,
          oldStatus: oldRecord?.status,
          newStatus: record.status,
          reason: `batch:${batch.id}`
        }
      });

      acceptedRows += 1;
    }

    if (errors.length > 0) {
      await tx.gradeImportBatch.update({
        where: { id: batch.id },
        data: {
          status: "FAILED",
          acceptedRows,
          rejectedRows: errors.length,
          errorReport: errors
        }
      });
      throw new AppError("GRADE_IMPORT_FAILED", "Grade import failed and transaction was rolled back", 422, errors);
    }

    const updatedBatch = await tx.gradeImportBatch.update({
      where: { id: batch.id },
      data: {
        status: "IMPORTED",
        acceptedRows,
        rejectedRows: 0,
        completedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "IMPORT",
        entityType: "GradeImportBatch",
        entityId: batch.id,
        courseOfferingId: data.courseOfferingId,
        afterJson: updatedBatch
      }
    });

    return updatedBatch;
  });
}
