import "server-only";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission } from "@/server/services/rbac";
import { notifyUser } from "@/server/services/notifications";

function cleanText(body: string) {
  return body.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").trim();
}

export async function createThread(actorId: string, input: { courseOfferingId?: string; participantIds: string[]; subject: string; body: string; type: "COURSE_GENERAL" | "PRIVATE_STAFF" | "GRADE_APPEAL" | "OFFICE_HOUR" | "ADMIN_SUPPORT" }) {
  if (input.courseOfferingId && !(await canAccessCourseOffering(actorId, input.courseOfferingId))) throw new PermissionError();
  const uniqueParticipants = Array.from(new Set([actorId, ...input.participantIds]));
  const thread = await db.messageThread.create({
    data: {
      courseOfferingId: input.courseOfferingId,
      createdById: actorId,
      type: input.type,
      subject: input.subject,
      participants: { create: uniqueParticipants.map((userId) => ({ userId })) },
      messages: { create: { senderId: actorId, body: cleanText(input.body) } }
    },
    include: { participants: true, messages: true }
  });
  for (const userId of uniqueParticipants.filter((id) => id !== actorId)) await notifyUser({ userId, type: "MESSAGE", title: "پیام جدید", body: input.subject, href: `/messages/${thread.id}` });
  return thread;
}

export async function listThreads(actorId: string, opts: { courseOfferingId?: string; closed?: boolean; take?: number }) {
  if (opts.courseOfferingId && !(await canAccessCourseOffering(actorId, opts.courseOfferingId))) throw new PermissionError();
  return db.messageThread.findMany({
    where: { participants: { some: { userId: actorId } }, ...(opts.courseOfferingId ? { courseOfferingId: opts.courseOfferingId } : {}), ...(typeof opts.closed === "boolean" ? { isClosed: opts.closed } : {}) },
    include: { courseOffering: { include: { course: true } }, participants: { include: { user: { select: { id: true, name: true, email: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: opts.take ?? 30
  });
}

export async function getThread(actorId: string, id: string) {
  const thread = await db.messageThread.findUnique({ where: { id }, include: { participants: true, messages: { include: { sender: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } }, courseOffering: { include: { course: true } } } });
  if (!thread) throw new AppError("NOT_FOUND", "Thread not found", 404);
  if (!thread.participants.some((p) => p.userId === actorId)) throw new PermissionError();
  return thread;
}

export async function replyThread(actorId: string, threadId: string, body: string) {
  const thread = await db.messageThread.findUnique({ where: { id: threadId }, include: { participants: true } });
  if (!thread) throw new AppError("NOT_FOUND", "Thread not found", 404);
  if (thread.isClosed) throw new AppError("THREAD_CLOSED", "Closed thread cannot receive replies", 409);
  if (!thread.participants.some((p) => p.userId === actorId)) throw new PermissionError();
  const message = await db.message.create({ data: { threadId, senderId: actorId, body: cleanText(body) } });
  await db.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
  for (const p of thread.participants.filter((p) => p.userId !== actorId)) await notifyUser({ userId: p.userId, type: "MESSAGE", title: "پاسخ جدید", body: thread.subject, href: `/messages/${threadId}` });
  return message;
}

export async function closeThread(actorId: string, threadId: string) {
  const thread = await db.messageThread.findUnique({ where: { id: threadId } });
  if (!thread) throw new AppError("NOT_FOUND", "Thread not found", 404);
  if (thread.courseOfferingId) await requireCoursePermission(actorId, thread.courseOfferingId, coursePermissions.MODERATE_MESSAGES);
  else if (thread.createdById !== actorId) throw new PermissionError();
  return db.messageThread.update({ where: { id: threadId }, data: { isClosed: true } });
}
