import "server-only";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission } from "@/server/services/rbac";
import { notifyUser } from "@/server/services/notifications";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";
import { writeAuditLog } from "@/server/services/audit";

function cleanText(body: string) {
  return body.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").trim();
}

export async function createThread(actorId: string, input: { courseOfferingId?: string; participantIds: string[]; subject: string; body: string; type: "COURSE_GENERAL" | "PRIVATE_STAFF" | "GRADE_APPEAL" | "OFFICE_HOUR" | "ADMIN_SUPPORT" }) {
  const limiter = await checkRateLimit(makeRateLimitKey("create-thread", actorId), 20, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many messages sent", 429);
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

async function syncThreadParticipants(threadId: string, userIds: string[]) {
  const existing = await db.messageThreadParticipant.findMany({ where: { threadId }, select: { userId: true } });
  const existingIds = new Set(existing.map((e) => e.userId));
  const toAdd = userIds.filter((id) => !existingIds.has(id));
  if (toAdd.length) await db.messageThreadParticipant.createMany({ data: toAdd.map((userId) => ({ threadId, userId })) });
  return toAdd.length;
}

// Always-available (not a one-time "finalize team" gate) so a professor/Head
// TA who skipped this at the start of term can still do it later — creating
// again just syncs in anyone newly added instead of making a duplicate thread.
export async function createTaTeamThread(actorId: string, courseOfferingId: string) {
  await requireCoursePermission(actorId, courseOfferingId, coursePermissions.MODERATE_MESSAGES);
  const offering = await db.courseOffering.findUnique({ where: { id: courseOfferingId }, include: { course: true } });
  if (!offering) throw new AppError("NOT_FOUND", "Course offering not found", 404);
  const roles = await db.courseRoleAssignment.findMany({ where: { courseOfferingId, revokedAt: null, role: { in: ["PROFESSOR", "HEAD_TA", "TA"] } }, select: { userId: true } });
  const userIds = Array.from(new Set(roles.map((r) => r.userId)));

  let thread = await db.messageThread.findFirst({ where: { courseOfferingId, type: "TA_TEAM" } });
  let addedCount = 0;
  if (!thread) {
    thread = await db.messageThread.create({ data: { courseOfferingId, createdById: actorId, type: "TA_TEAM", subject: `تیم TA — ${offering.course.title}`, participants: { create: userIds.map((userId) => ({ userId })) } } });
    addedCount = userIds.length;
  } else {
    addedCount = await syncThreadParticipants(thread.id, userIds);
  }
  await writeAuditLog({ actorId, action: "CREATE", entityType: "MessageThread", entityId: thread.id, courseOfferingId, metadata: { type: "TA_TEAM", addedCount } });
  return { thread, addedCount };
}

export async function createCourseWideThread(actorId: string, courseOfferingId: string) {
  await requireCoursePermission(actorId, courseOfferingId, coursePermissions.MODERATE_MESSAGES);
  const offering = await db.courseOffering.findUnique({ where: { id: courseOfferingId }, include: { course: true } });
  if (!offering) throw new AppError("NOT_FOUND", "Course offering not found", 404);
  const [roles, enrollments] = await Promise.all([
    db.courseRoleAssignment.findMany({ where: { courseOfferingId, revokedAt: null, role: { in: ["PROFESSOR", "HEAD_TA", "TA"] } }, select: { userId: true } }),
    db.courseEnrollment.findMany({ where: { courseOfferingId, droppedAt: null }, select: { studentId: true } })
  ]);
  const userIds = Array.from(new Set([...roles.map((r) => r.userId), ...enrollments.map((e) => e.studentId)]));

  let thread = await db.messageThread.findFirst({ where: { courseOfferingId, type: "COURSE_WIDE" } });
  let addedCount = 0;
  if (!thread) {
    thread = await db.messageThread.create({ data: { courseOfferingId, createdById: actorId, type: "COURSE_WIDE", subject: `کل درس — ${offering.course.title}`, participants: { create: userIds.map((userId) => ({ userId })) } } });
    addedCount = userIds.length;
  } else {
    addedCount = await syncThreadParticipants(thread.id, userIds);
  }
  await writeAuditLog({ actorId, action: "CREATE", entityType: "MessageThread", entityId: thread.id, courseOfferingId, metadata: { type: "COURSE_WIDE", addedCount } });
  return { thread, addedCount };
}

export async function listThreads(actorId: string, opts: { courseOfferingId?: string; closed?: boolean; take?: number }) {
  if (opts.courseOfferingId && !(await canAccessCourseOffering(actorId, opts.courseOfferingId))) throw new PermissionError();
  const threads = await db.messageThread.findMany({
    where: { participants: { some: { userId: actorId } }, ...(opts.courseOfferingId ? { courseOfferingId: opts.courseOfferingId } : {}), ...(typeof opts.closed === "boolean" ? { isClosed: opts.closed } : {}) },
    include: { courseOffering: { include: { course: true } }, participants: { include: { user: { select: { id: true, name: true, email: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: opts.take ?? 30
  });
  const unreadCounts = await Promise.all(threads.map(async (thread) => {
    const me = thread.participants.find((p) => p.userId === actorId);
    return db.message.count({ where: { threadId: thread.id, ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}) } });
  }));
  return threads.map((thread, i) => ({ ...thread, unreadCount: unreadCounts[i] }));
}

export async function getUnreadMessageCount(actorId: string) {
  const participants = await db.messageThreadParticipant.findMany({ where: { userId: actorId }, select: { threadId: true, lastReadAt: true } });
  const counts = await Promise.all(participants.map((p) =>
    db.message.count({ where: { threadId: p.threadId, senderId: { not: actorId }, ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}) } })
  ));
  return counts.reduce((sum, c) => sum + c, 0);
}

export async function markThreadRead(actorId: string, threadId: string) {
  const participant = await db.messageThreadParticipant.findUnique({ where: { threadId_userId: { threadId, userId: actorId } } });
  if (!participant) throw new PermissionError();
  return db.messageThreadParticipant.update({ where: { id: participant.id }, data: { lastReadAt: new Date() } });
}

export async function getThread(actorId: string, id: string) {
  const thread = await db.messageThread.findUnique({ where: { id }, include: { participants: true, messages: { include: { sender: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } }, courseOffering: { include: { course: true } } } });
  if (!thread) throw new AppError("NOT_FOUND", "Thread not found", 404);
  if (!thread.participants.some((p) => p.userId === actorId)) throw new PermissionError();
  await markThreadRead(actorId, id);
  return thread;
}

export async function replyThread(actorId: string, threadId: string, body: string) {
  const limiter = await checkRateLimit(makeRateLimitKey("reply-thread", actorId), 40, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many messages sent", 429);
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
