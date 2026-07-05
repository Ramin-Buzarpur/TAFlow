import "server-only";
import type { TaskStatus } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";
import { requireAttachableOwnedFile } from "@/server/services/files";

export async function createTask(actorId: string, input: { courseOfferingId: string; title: string; description?: string; assigneeId?: string; estimatedMinutes?: number; dueAt?: Date }) {
  await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.MANAGE_OFFICE_HOUR);
  const task = await db.task.create({ data: { ...input, createdById: actorId }, include: { assignee: { select: { id: true, name: true, email: true } } } });
  if (input.assigneeId) await notifyUser({ userId: input.assigneeId, type: "MESSAGE", title: "وظیفه جدید به شما محول شد", body: input.title, href: `/courses/${input.courseOfferingId}/tasks` });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "Task", entityId: task.id, courseOfferingId: input.courseOfferingId, afterJson: task });
  return task;
}

export async function listTasks(actorId: string, courseOfferingId: string) {
  if (!(await canAccessCourseOffering(actorId, courseOfferingId))) throw new AppError("PERMISSION_DENIED", "Access denied", 403);
  return db.task.findMany({
    where: { courseOfferingId },
    include: { assignee: { select: { id: true, name: true, email: true } }, submissions: { include: { file: { select: { id: true, originalName: true } } } } },
    orderBy: { createdAt: "desc" }
  });
}

export async function submitTask(actorId: string, taskId: string, fileId: string, note?: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError("NOT_FOUND", "Task not found", 404);
  if (task.assigneeId !== actorId) throw new PermissionError("Only the assigned TA can submit this task");
  await requireAttachableOwnedFile(actorId, fileId);
  // One active submission per task/user: resubmitting replaces the file, it
  // doesn't need history the way role assignments do.
  const submission = await db.$transaction(async (tx) => {
    const updated = await tx.taskSubmission.upsert({
      where: { taskId_userId: { taskId, userId: actorId } },
      create: { taskId, userId: actorId, fileId, note },
      update: { fileId, note, submittedAt: new Date() },
      include: { file: { select: { id: true, originalName: true } } }
    });
    await tx.uploadedFile.update({ where: { id: fileId }, data: { visibility: "COURSE_STAFF" } });
    return updated;
  });
  // Late deliveries are accepted but flagged, same policy as assignment
  // submissions — derived from dueAt, not stored.
  const late = Boolean(task.dueAt && submission.submittedAt > task.dueAt);
  await writeAuditLog({ actorId, action: "UPDATE", entityType: "TaskSubmission", entityId: submission.id, courseOfferingId: task.courseOfferingId, afterJson: submission, metadata: { late } });
  return { ...submission, late };
}

export async function updateTaskStatus(actorId: string, taskId: string, status: TaskStatus) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError("NOT_FOUND", "Task not found", 404);
  const canAccess = await canAccessCourseOffering(actorId, task.courseOfferingId);
  if (!canAccess) throw new AppError("PERMISSION_DENIED", "Access denied", 403);
  if (task.assigneeId !== actorId) await requireCoursePermission(actorId, task.courseOfferingId, coursePermissions.MANAGE_OFFICE_HOUR);
  const updated = await db.task.update({ where: { id: taskId }, data: { status, completedAt: status === "DONE" ? new Date() : null } });
  await writeAuditLog({ actorId, action: "UPDATE", entityType: "Task", entityId: taskId, courseOfferingId: task.courseOfferingId, beforeJson: { status: task.status }, afterJson: { status } });
  return updated;
}
