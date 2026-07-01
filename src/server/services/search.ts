import "server-only";
import { db } from "@/server/db";

export async function globalSearch(userId: string, q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  const accessibleOfferingIds = await db.courseRoleAssignment.findMany({ where: { userId, revokedAt: null }, select: { courseOfferingId: true } }).then((r) => r.map((x) => x.courseOfferingId));
  const [courses, opportunities, sessions, announcements, threads] = await Promise.all([
    db.courseOffering.findMany({ where: { id: { in: accessibleOfferingIds }, OR: [{ course: { title: { contains: term, mode: "insensitive" } } }, { course: { code: { contains: term, mode: "insensitive" } } }] }, include: { course: true, semester: true }, take: 5 }),
    db.tAOpportunity.findMany({ where: { status: "PUBLISHED", OR: [{ title: { contains: term, mode: "insensitive" } }, { description: { contains: term, mode: "insensitive" } }] }, include: { courseOffering: { include: { course: true } } }, take: 5 }),
    db.officeHourSession.findMany({ where: { courseOfferingId: { in: accessibleOfferingIds }, title: { contains: term, mode: "insensitive" } }, include: { courseOffering: { include: { course: true } } }, take: 5 }),
    db.announcement.findMany({ where: { OR: [{ title: { contains: term, mode: "insensitive" } }, { body: { contains: term, mode: "insensitive" } }] }, take: 5 }),
    db.messageThread.findMany({ where: { participants: { some: { userId } }, subject: { contains: term, mode: "insensitive" } }, take: 5 })
  ]);
  return [
    ...courses.map((x) => ({ type: "course", title: x.course.title, subtitle: x.semester.title, href: `/courses/${x.id}` })),
    ...opportunities.map((x) => ({ type: "opportunity", title: x.title, subtitle: x.courseOffering.course.title, href: `/opportunities/${x.id}` })),
    ...sessions.map((x) => ({ type: "session", title: x.title, subtitle: x.courseOffering.course.title, href: `/sessions/${x.id}` })),
    ...announcements.map((x) => ({ type: "announcement", title: x.title, subtitle: x.priority, href: `/announcements/${x.id}` })),
    ...threads.map((x) => ({ type: "message", title: x.subject, subtitle: x.type, href: `/messages/${x.id}` }))
  ];
}
