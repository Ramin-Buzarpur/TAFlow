import ExcelJS from "exceljs";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { requireCoursePermission } from "@/server/services/rbac";
import { parseInput } from "@/server/utils/result";
import { exportGradesSchema, exportRosterSchema } from "@/server/validation/exports";
import { readFormConfig } from "@/server/services/ta-workflow";

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
}

export async function toXlsx(rows: Array<Record<string, unknown>>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("export");
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  sheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(16, header.length + 4) }));
  for (const row of rows) sheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportCourseRoster(actorId: string, input: unknown) {
  const data = parseInput(exportRosterSchema, input);
  await requireCoursePermission(actorId, data.courseOfferingId, coursePermissions.EXPORT_ROSTER);

  const enrollments = await db.courseEnrollment.findMany({
    where: { courseOfferingId: data.courseOfferingId, droppedAt: null },
    select: {
      enrolledAt: true,
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: { select: { studentNumber: true, gpa: true } },
          courseRoles: {
            where: { courseOfferingId: data.courseOfferingId, revokedAt: null },
            select: { role: true }
          }
        }
      }
    },
    orderBy: { student: { name: "asc" } },
    take: 5000
  });

  const rows = enrollments.map(({ student, enrolledAt }) => ({
    studentId: student.id,
    name: student.name ?? "",
    email: data.includeEmails ? student.email : "",
    studentNumber: student.studentProfile?.studentNumber ?? "",
    gpa: student.studentProfile?.gpa?.toString() ?? "",
    roles: data.includeRoles ? student.courseRoles.map((role) => role.role).join(";") : "",
    enrolledAt: enrolledAt.toISOString()
  }));

  await db.classRosterExport.create({
    data: {
      courseOfferingId: data.courseOfferingId,
      requestedById: actorId,
      format: data.format,
      status: "COMPLETED",
      rowCount: rows.length,
      completedAt: new Date()
    }
  });

  if (data.format === "CSV") return { mimeType: "text/csv", filename: "course-roster.csv", body: toCsv(rows) };
  return { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename: "course-roster.xlsx", body: await toXlsx(rows) };
}

export async function exportCourseGrades(actorId: string, input: unknown) {
  const data = parseInput(exportGradesSchema, input);
  await requireCoursePermission(actorId, data.courseOfferingId, coursePermissions.MANAGE_GRADEBOOK);

  const gradeItems = await db.gradeItem.findMany({
    where: {
      courseOfferingId: data.courseOfferingId,
      id: data.gradeItemIds ? { in: data.gradeItemIds } : undefined
    },
    select: {
      id: true,
      title: true,
      records: {
        select: {
          score: true,
          status: true,
          student: {
            select: {
              name: true,
              email: true,
              studentProfile: { select: { studentNumber: true } }
            }
          }
        }
      }
    },
    take: 100
  });

  const rows = gradeItems.flatMap((item) =>
    item.records.map((record) => ({
      gradeItem: item.title,
      studentNumber: record.student.studentProfile?.studentNumber ?? "",
      studentName: record.student.name ?? "",
      email: record.student.email,
      score: record.score.toString(),
      status: record.status
    }))
  );

  await db.exportJob.create({
    data: {
      courseOfferingId: data.courseOfferingId,
      requestedById: actorId,
      exportType: "grades",
      format: data.format,
      status: "COMPLETED",
      completedAt: new Date()
    }
  });

  if (data.format === "CSV") return { mimeType: "text/csv", filename: "course-grades.csv", body: toCsv(rows) };
  return { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename: "course-grades.xlsx", body: await toXlsx(rows) };
}

export async function exportApplicationsToExcel(actorId: string, opportunityId: string) {
  const opportunity = await db.tAOpportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) throw new AppError("NOT_FOUND", "TA opportunity not found", 404);
  await requireCoursePermission(actorId, opportunity.courseOfferingId, coursePermissions.REVIEW_TA_APPLICATION);

  const applications = await db.tAApplication.findMany({
    where: { opportunityId },
    include: { applicant: { select: { name: true, email: true, studentProfile: { select: { studentNumber: true, gpa: true } } } } },
    orderBy: { submittedAt: "asc" }
  });

  const formConfig = readFormConfig(opportunity.formConfigJson);
  const customFields = formConfig?.customFields ?? [];

  const rows = applications.map((a) => {
    const custom = (a.customFieldsJson ?? {}) as Record<string, unknown>;
    const row: Record<string, unknown> = {
      name: a.applicant.name ?? "",
      email: a.applicant.email,
      requestedRole: a.requestedRole,
      status: a.status,
      score: a.score?.toString() ?? "",
      motivationText: a.motivationText,
      submittedAt: a.submittedAt.toISOString()
    };
    if (formConfig?.builtIn.studentNumber) row.studentNumber = a.applicant.studentProfile?.studentNumber ?? "";
    if (formConfig?.builtIn.gpa) row.gpa = a.applicant.studentProfile?.gpa?.toString() ?? "";
    for (const field of customFields) row[field.label] = custom[field.key] ?? "";
    return row;
  });

  return { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename: `applications-${opportunityId}.xlsx`, body: await toXlsx(rows) };
}
