import "server-only";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";

export async function createAnnouncement(actorId: string, input: { title: string; body: string; priority?: string; courseOfferingId?: string; departmentId?: string; publishedAt?: Date; expiresAt?: Date }) {
  if (input.courseOfferingId) await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.MANAGE_ANNOUNCEMENT);
  const ann = await db.announcement.create({ data: { ...input, createdById: actorId, publishedAt: input.publishedAt ?? new Date() } });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "Announcement", entityId: ann.id, courseOfferingId: input.courseOfferingId, afterJson: ann });
  return ann;
}

export async function listAnnouncements(actorId: string, opts: { courseOfferingId?: string; take?: number }) {
  if (opts.courseOfferingId && !(await canAccessCourseOffering(actorId, opts.courseOfferingId))) throw new PermissionError();
  const now = new Date();
  return db.announcement.findMany({ where: { ...(opts.courseOfferingId ? { courseOfferingId: opts.courseOfferingId } : {}), publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, include: { courseOffering: { include: { course: true } } }, orderBy: [{ priority: "desc" }, { publishedAt: "desc" }], take: opts.take ?? 20 });
}

export async function createAcademicEvent(actorId: string, input: { title: string; description?: string; startsAt: Date; endsAt?: Date; eventType: string; isImportant?: boolean; semesterId?: string; departmentId?: string; courseOfferingId?: string }) {
  if (input.courseOfferingId) await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.MANAGE_ANNOUNCEMENT);
  const event = await db.academicCalendarEvent.create({ data: { ...input, createdById: actorId } });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "AcademicCalendarEvent", entityId: event.id, courseOfferingId: input.courseOfferingId, afterJson: event });
  return event;
}

export async function listAcademicEvents(actorId: string, opts: { from?: Date; to?: Date; courseOfferingId?: string; take?: number }) {
  if (opts.courseOfferingId && !(await canAccessCourseOffering(actorId, opts.courseOfferingId))) throw new PermissionError();
  return db.academicCalendarEvent.findMany({ where: { ...(opts.courseOfferingId ? { courseOfferingId: opts.courseOfferingId } : {}), ...(opts.from || opts.to ? { startsAt: { gte: opts.from, lte: opts.to } } : {}) }, orderBy: { startsAt: "asc" }, take: opts.take ?? 50 });
}

export function buildEventIcs(event: { title: string; description?: string | null; startsAt: Date; endsAt?: Date | null }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TAFlow//Academic Calendar//FA", "BEGIN:VEVENT", `DTSTART:${fmt(event.startsAt)}`, `DTEND:${fmt(event.endsAt || event.startsAt)}`, `SUMMARY:${event.title}`, `DESCRIPTION:${event.description || ""}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}
