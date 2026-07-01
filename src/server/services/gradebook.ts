import "server-only";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";

export async function getGradebook(actorId: string, courseOfferingId: string) {
  await requireCoursePermission(actorId, courseOfferingId, coursePermissions.MANAGE_GRADEBOOK);
  return db.gradeCategory.findMany({
    where: { courseOfferingId },
    include: { items: { include: { records: { include: { student: { select: { id: true, name: true, email: true, studentProfile: true } } } } } } },
    orderBy: { createdAt: "asc" }
  });
}

export async function createGradeCategory(actorId: string, input: { courseOfferingId: string; name: string; weight: number; maxScore: number; visibility?: "STAFF_ONLY" | "STUDENT_PRIVATE" | "PUBLISHED" }) {
  await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.MANAGE_GRADEBOOK);
  const existing = await db.gradeCategory.findMany({ where: { courseOfferingId: input.courseOfferingId }, select: { weight: true } });
  const total = existing.reduce((sum, row) => sum + Number(row.weight), 0) + input.weight;
  if (total > 100.001) throw new AppError("INVALID_GRADE_WEIGHT", "Total grade category weight cannot exceed 100", 422, { total });
  const category = await db.gradeCategory.create({ data: { ...input, createdById: actorId } });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "GradeCategory", entityId: category.id, courseOfferingId: input.courseOfferingId, afterJson: category });
  return category;
}

export async function createGradeItem(actorId: string, input: { courseOfferingId: string; categoryId: string; title: string; maxScore: number; dueAt?: Date; visibility?: "STAFF_ONLY" | "STUDENT_PRIVATE" | "PUBLISHED" }) {
  await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.MANAGE_GRADEBOOK);
  const item = await db.gradeItem.create({ data: { ...input, createdById: actorId } });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "GradeItem", entityId: item.id, courseOfferingId: input.courseOfferingId, afterJson: item });
  return item;
}

export async function upsertGradeRecord(actorId: string, input: { gradeItemId: string; studentId: string; score: number; feedback?: string; reason?: string }) {
  const item = await db.gradeItem.findUnique({ where: { id: input.gradeItemId } });
  if (!item) throw new AppError("NOT_FOUND", "Grade item not found", 404);
  await requireCoursePermission(actorId, item.courseOfferingId, coursePermissions.EDIT_ASSIGNED_GRADES);
  if (input.score > Number(item.maxScore)) throw new AppError("INVALID_SCORE", "Score cannot exceed max score", 422);
  const previous = await db.gradeRecord.findUnique({ where: { gradeItemId_studentId: { gradeItemId: input.gradeItemId, studentId: input.studentId } } });
  const record = await db.gradeRecord.upsert({
    where: { gradeItemId_studentId: { gradeItemId: input.gradeItemId, studentId: input.studentId } },
    create: { gradeItemId: input.gradeItemId, studentId: input.studentId, score: input.score, feedback: input.feedback, editedById: actorId },
    update: { score: input.score, feedback: input.feedback, editedById: actorId }
  });
  await db.gradeChangeLog.create({ data: { gradeRecordId: record.id, changedById: actorId, oldScore: previous?.score, newScore: input.score, oldStatus: previous?.status, newStatus: record.status, reason: input.reason } });
  await writeAuditLog({ actorId, action: previous ? "UPDATE" : "CREATE", entityType: "GradeRecord", entityId: record.id, courseOfferingId: item.courseOfferingId, beforeJson: previous, afterJson: record });
  return record;
}

export async function publishGradeItem(actorId: string, gradeItemId: string) {
  const item = await db.gradeItem.findUnique({ where: { id: gradeItemId }, include: { records: true } });
  if (!item) throw new AppError("NOT_FOUND", "Grade item not found", 404);
  await requireCoursePermission(actorId, item.courseOfferingId, coursePermissions.PUBLISH_GRADES);
  const updated = await db.$transaction(async (tx) => {
    await tx.gradeRecord.updateMany({ where: { gradeItemId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    return tx.gradeItem.update({ where: { id: gradeItemId }, data: { visibility: "PUBLISHED" } });
  });
  const records = await db.gradeRecord.findMany({ where: { gradeItemId }, select: { studentId: true } });
  for (const r of records) await notifyUser({ userId: r.studentId, type: "GRADE", title: "نمره جدید منتشر شد", body: item.title, href: `/grades` });
  await writeAuditLog({ actorId, action: "PUBLISH", entityType: "GradeItem", entityId: gradeItemId, courseOfferingId: item.courseOfferingId, metadata: { records: records.length } });
  return updated;
}

export async function getStudentGrades(actorId: string, courseOfferingId?: string) {
  const items = await db.gradeRecord.findMany({
    where: { studentId: actorId, status: "PUBLISHED", ...(courseOfferingId ? { gradeItem: { courseOfferingId } } : {}) },
    include: { gradeItem: { include: { category: true, courseOffering: { include: { course: true, semester: true } } } } },
    orderBy: { updatedAt: "desc" }
  });
  return items;
}

export async function exportRosterCsv(actorId: string, courseOfferingId: string) {
  await requireCoursePermission(actorId, courseOfferingId, coursePermissions.EXPORT_ROSTER);
  const rows = await db.courseEnrollment.findMany({ where: { courseOfferingId, droppedAt: null }, include: { student: { include: { studentProfile: true } } } });
  const csv = ["studentNumber,name,email"].concat(rows.map((r) => [r.student.studentProfile?.studentNumber || "", r.student.name || "", r.student.email].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))).join("\n");
  await writeAuditLog({ actorId, action: "EXPORT", entityType: "CourseEnrollment", courseOfferingId, metadata: { rows: rows.length, format: "CSV" } });
  return "\uFEFF" + csv;
}

export async function exportGradebookCsv(actorId: string, courseOfferingId: string) {
  await requireCoursePermission(actorId, courseOfferingId, coursePermissions.MANAGE_GRADEBOOK);
  const items = await db.gradeItem.findMany({ where: { courseOfferingId }, include: { records: { include: { student: { include: { studentProfile: true } } } }, category: true }, orderBy: { createdAt: "asc" } });
  const lines = ["studentNumber,name,email,item,category,score,maxScore,status"];
  for (const item of items) for (const r of item.records) lines.push([r.student.studentProfile?.studentNumber || "", r.student.name || "", r.student.email, item.title, item.category.name, r.score, item.maxScore, r.status].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","));
  await writeAuditLog({ actorId, action: "EXPORT", entityType: "Gradebook", courseOfferingId, metadata: { rows: lines.length - 1, format: "CSV" } });
  return "\uFEFF" + lines.join("\n");
}
