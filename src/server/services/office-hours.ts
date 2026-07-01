import "server-only";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";

export async function createOfficeHour(actorId: string, input: { courseOfferingId: string; hostId: string; title: string; description?: string; startsAt: Date; endsAt: Date; meetingUrl?: string; location?: string; capacity?: number }) {
  await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.CREATE_OFFICE_HOUR);
  const overlap = await db.officeHourSession.findFirst({ where: { hostId: input.hostId, status: { not: "CANCELLED" }, startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt } } });
  if (overlap) throw new AppError("SESSION_TIME_CONFLICT", "Host already has another session in this time range", 409);
  const session = await db.officeHourSession.create({ data: { ...input, createdById: actorId }, include: { courseOffering: { include: { course: true } }, host: { select: { id: true, name: true, email: true } } } });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "OfficeHourSession", entityId: session.id, courseOfferingId: input.courseOfferingId, afterJson: session });
  return session;
}

export async function listOfficeHours(actorId: string, opts: { courseOfferingId?: string; upcoming?: boolean; take?: number }) {
  if (opts.courseOfferingId && !(await canAccessCourseOffering(actorId, opts.courseOfferingId))) throw new PermissionError();
  return db.officeHourSession.findMany({
    where: { ...(opts.courseOfferingId ? { courseOfferingId: opts.courseOfferingId } : {}), ...(opts.upcoming ? { startsAt: { gte: new Date() }, status: { in: ["SCHEDULED", "LIVE"] } } : {}) },
    include: { courseOffering: { include: { course: true, semester: true } }, host: { select: { id: true, name: true, email: true } } },
    orderBy: { startsAt: opts.upcoming ? "asc" : "desc" },
    take: opts.take ?? 30
  });
}

export async function updateOfficeHourStatus(actorId: string, id: string, status: "COMPLETED" | "CANCELLED" | "LIVE") {
  const session = await db.officeHourSession.findUnique({ where: { id } });
  if (!session) throw new AppError("NOT_FOUND", "Session not found", 404);
  await requireCoursePermission(actorId, session.courseOfferingId, coursePermissions.MANAGE_OFFICE_HOUR);
  const updated = await db.officeHourSession.update({ where: { id }, data: { status } });
  await writeAuditLog({ actorId, action: "UPDATE", entityType: "OfficeHourSession", entityId: id, courseOfferingId: session.courseOfferingId, beforeJson: { status: session.status }, afterJson: { status } });
  return updated;
}

export async function getJoinableSession(actorId: string, id: string) {
  const session = await db.officeHourSession.findUnique({ where: { id }, include: { courseOffering: { include: { course: true } }, host: { select: { id: true, name: true } } } });
  if (!session) throw new AppError("NOT_FOUND", "Session not found", 404);
  if (!(await canAccessCourseOffering(actorId, session.courseOfferingId))) throw new PermissionError();
  if (session.status === "CANCELLED") throw new AppError("SESSION_CANCELLED", "Session is cancelled", 409);
  return session;
}

export function buildIcs(session: { title: string; description?: string | null; startsAt: Date; endsAt: Date; meetingUrl?: string | null; location?: string | null }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const esc = (s?: string | null) => (s || "").replace(/\n/g, "\\n").replace(/,/g, "\\,");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TAFlow//Academic Sessions//FA", "BEGIN:VEVENT", `DTSTART:${fmt(session.startsAt)}`, `DTEND:${fmt(session.endsAt)}`, `SUMMARY:${esc(session.title)}`, `DESCRIPTION:${esc(session.description || session.meetingUrl)}`, `LOCATION:${esc(session.location || session.meetingUrl)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}
