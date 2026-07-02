import "server-only";
import ExcelJS from "exceljs";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions, isGlobalAdmin } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission, getCourseRoleNames } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";

export type GradeImportRow = { row: number; studentNumber: string; score: number | null; status: "ok" | "error"; message?: string; studentId?: string };

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

export async function createGradeItem(actorId: string, input: { courseOfferingId: string; categoryId: string; title: string; maxScore: number; dueAt?: Date; visibility?: "STAFF_ONLY" | "STUDENT_PRIVATE" | "PUBLISHED"; assigneeId?: string }) {
  await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.MANAGE_GRADEBOOK);
  const item = await db.gradeItem.create({ data: { ...input, createdById: actorId } });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "GradeItem", entityId: item.id, courseOfferingId: input.courseOfferingId, afterJson: item });
  return item;
}

export async function assignGradeItem(actorId: string, gradeItemId: string, assigneeId: string | null) {
  const item = await db.gradeItem.findUnique({ where: { id: gradeItemId } });
  if (!item) throw new AppError("NOT_FOUND", "Grade item not found", 404);
  await requireCoursePermission(actorId, item.courseOfferingId, coursePermissions.MANAGE_GRADEBOOK);
  const updated = await db.gradeItem.update({ where: { id: gradeItemId }, data: { assigneeId } });
  if (assigneeId) await notifyUser({ userId: assigneeId, type: "GRADE", title: "آیتم نمره به شما تخصیص یافت", body: item.title, href: `/gradebook/${item.courseOfferingId}` });
  await writeAuditLog({ actorId, action: "UPDATE", entityType: "GradeItem", entityId: gradeItemId, courseOfferingId: item.courseOfferingId, metadata: { assigneeId } });
  return updated;
}

export async function upsertGradeRecord(actorId: string, input: { gradeItemId: string; studentId: string; score: number; feedback?: string; reason?: string }) {
  const item = await db.gradeItem.findUnique({ where: { id: input.gradeItemId } });
  if (!item) throw new AppError("NOT_FOUND", "Grade item not found", 404);
  await requireCoursePermission(actorId, item.courseOfferingId, coursePermissions.EDIT_ASSIGNED_GRADES);

  if (item.assigneeId && item.assigneeId !== actorId) {
    const user = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true } });
    const roles = await getCourseRoleNames(actorId, item.courseOfferingId);
    const isOnlyPlainTA = roles.includes("TA") && !roles.includes("HEAD_TA") && !roles.includes("PROFESSOR");
    if (isOnlyPlainTA && !isGlobalAdmin(user?.globalRole ?? "STUDENT")) {
      throw new PermissionError("This grade item is assigned to another TA");
    }
  }

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

export async function parseGradeImportFile(actorId: string, gradeItemId: string, buffer: Buffer): Promise<GradeImportRow[]> {
  const item = await db.gradeItem.findUnique({ where: { id: gradeItemId } });
  if (!item) throw new AppError("NOT_FOUND", "Grade item not found", 404);
  await requireCoursePermission(actorId, item.courseOfferingId, coursePermissions.EDIT_ASSIGNED_GRADES);

  const enrollments = await db.courseEnrollment.findMany({
    where: { courseOfferingId: item.courseOfferingId, droppedAt: null },
    include: { student: { include: { studentProfile: true } } }
  });
  const byStudentNumber = new Map(enrollments.filter((e) => e.student.studentProfile?.studentNumber).map((e) => [e.student.studentProfile!.studentNumber, e.studentId]));
  const byEmail = new Map(enrollments.map((e) => [e.student.email.toLowerCase(), e.studentId]));

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new AppError("INVALID_FILE", "Could not read the uploaded file as an Excel workbook", 422);
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new AppError("INVALID_FILE", "No worksheet found in the uploaded file", 422);

  const rows: GradeImportRow[] = [];
  sheet.eachRow((sheetRow, rowNumber) => {
    if (rowNumber === 1) return;
    const identifierRaw = sheetRow.getCell(1).value;
    const identifier = identifierRaw === null || identifierRaw === undefined ? "" : String(identifierRaw).trim();
    const scoreCell = sheetRow.getCell(2).value;
    const scoreRaw = scoreCell === null || scoreCell === undefined ? "" : scoreCell;
    if (!identifier && scoreRaw === "") return;

    const studentId = byStudentNumber.get(identifier) ?? byEmail.get(identifier.toLowerCase());
    if (!studentId) { rows.push({ row: rowNumber, studentNumber: identifier, score: null, status: "error", message: "دانشجو در این درس ثبت‌نام نکرده یا شماره دانشجویی/ایمیل نادرست است" }); return; }

    const score = typeof scoreRaw === "number" ? scoreRaw : Number(scoreRaw);
    if (scoreRaw === "" || Number.isNaN(score)) { rows.push({ row: rowNumber, studentNumber: identifier, score: null, status: "error", message: "نمره نامعتبر است", studentId }); return; }
    if (score < 0 || score > Number(item.maxScore)) { rows.push({ row: rowNumber, studentNumber: identifier, score, status: "error", message: `نمره باید بین ۰ و ${item.maxScore} باشد`, studentId }); return; }

    rows.push({ row: rowNumber, studentNumber: identifier, score, status: "ok", studentId });
  });

  return rows;
}

export async function commitGradeImport(actorId: string, gradeItemId: string, rows: { studentId: string; score: number }[]) {
  const results = [];
  for (const r of rows) {
    results.push(await upsertGradeRecord(actorId, { gradeItemId, studentId: r.studentId, score: r.score, reason: "Excel import" }));
  }
  await writeAuditLog({ actorId, action: "IMPORT", entityType: "GradeItem", entityId: gradeItemId, metadata: { rows: results.length, format: "XLSX" } });
  return results;
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

export async function createRegradeRequest(actorId: string, input: { gradeRecordId: string; reason: string }) {
  const record = await db.gradeRecord.findUnique({ where: { id: input.gradeRecordId }, include: { gradeItem: true } });
  if (!record) throw new AppError("NOT_FOUND", "Grade record not found", 404);
  if (record.studentId !== actorId) throw new PermissionError("Only the graded student can request a regrade");
  const openExisting = await db.regradeRequest.findFirst({ where: { gradeRecordId: input.gradeRecordId, studentId: actorId, status: "OPEN" } });
  if (openExisting) throw new AppError("REGRADE_ALREADY_OPEN", "You already have an open regrade request for this grade", 409);
  const request = await db.regradeRequest.create({ data: { gradeRecordId: input.gradeRecordId, studentId: actorId, reason: input.reason } });
  await notifyUser({ userId: record.editedById, type: "GRADE", title: "درخواست تجدیدنظر نمره", body: record.gradeItem.title, href: `/grades` });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "RegradeRequest", entityId: request.id, courseOfferingId: record.gradeItem.courseOfferingId, afterJson: request });
  return request;
}

export async function respondToRegradeRequest(actorId: string, requestId: string, input: { status: "APPROVED" | "REJECTED"; response: string; newScore?: number }) {
  const request = await db.regradeRequest.findUnique({ where: { id: requestId }, include: { gradeRecord: { include: { gradeItem: true } } } });
  if (!request) throw new AppError("NOT_FOUND", "Regrade request not found", 404);
  if (request.status !== "OPEN") throw new AppError("REGRADE_ALREADY_RESOLVED", "This regrade request was already resolved", 409);
  await requireCoursePermission(actorId, request.gradeRecord.gradeItem.courseOfferingId, coursePermissions.EDIT_ASSIGNED_GRADES);

  const updated = await db.$transaction(async (tx) => {
    if (input.status === "APPROVED" && typeof input.newScore === "number") {
      if (input.newScore > Number(request.gradeRecord.gradeItem.maxScore)) throw new AppError("INVALID_SCORE", "Score cannot exceed max score", 422);
      const previous = request.gradeRecord;
      await tx.gradeRecord.update({ where: { id: request.gradeRecordId }, data: { score: input.newScore, editedById: actorId } });
      await tx.gradeChangeLog.create({ data: { gradeRecordId: request.gradeRecordId, changedById: actorId, oldScore: previous.score, newScore: input.newScore, oldStatus: previous.status, newStatus: previous.status, reason: `regrade: ${input.response}` } });
    }
    return tx.regradeRequest.update({ where: { id: requestId }, data: { status: input.status, response: input.response, respondedById: actorId, resolvedAt: new Date() } });
  });

  await notifyUser({ userId: request.studentId, type: "GRADE", title: "پاسخ به درخواست تجدیدنظر", body: input.response, href: `/grades` });
  await writeAuditLog({ actorId, action: "UPDATE", entityType: "RegradeRequest", entityId: requestId, courseOfferingId: request.gradeRecord.gradeItem.courseOfferingId, afterJson: updated });
  return updated;
}

export async function listMyRegradeRequests(actorId: string) {
  return db.regradeRequest.findMany({ where: { studentId: actorId }, include: { gradeRecord: { include: { gradeItem: true } } }, orderBy: { createdAt: "desc" } });
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
