import "server-only";
import type { TaskStatus } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";

export async function createTask(actorId: string, input: { courseOfferingId: string; title: string; description?: string; assigneeId?: string; estimatedMinutes?: number; dueAt?: Date }) {
  await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.MANAGE_OFFICE_HOUR);
  const task = await db.task.create({ data: { ...input, createdById: actorId }, include: { assignee: { select: { id: true, name: true, email: true } } } });
  if (input.assigneeId) await notifyUser({ userId: input.assigneeId, type: "MESSAGE", title: "وظیفه جدید به شما محول شد", body: input.title, href: `/courses/${input.courseOfferingId}/tasks` });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "Task", entityId: task.id, courseOfferingId: input.courseOfferingId, afterJson: task });
  return task;
}

export async function listTasks(actorId: string, courseOfferingId: string) {
  if (!(await canAccessCourseOffering(actorId, courseOfferingId))) throw new AppError("PERMISSION_DENIED", "Access denied", 403);
  return db.task.findMany({ where: { courseOfferingId }, include: { assignee: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" } });
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
