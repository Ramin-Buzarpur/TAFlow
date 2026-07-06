import "server-only";
import { db } from "@/server/db";

export type MyCourseContext = {
  courseOffering: {
    id: string;
    status: string;
    section: string | null;
    course: { code: string; title: string; units: number };
    semester: { title: string; code: string };
    professor: { name: string | null; email: string };
  };
  roles: string[];
};

export async function listMyCourseContexts(userId: string): Promise<MyCourseContext[]> {
  const now = new Date();
  const rows = await db.courseRoleAssignment.findMany({
    where: {
      userId,
      revokedAt: null,
      activeFrom: { lte: now },
      OR: [{ activeUntil: null }, { activeUntil: { gt: now } }]
    },
    include: {
      courseOffering: {
        include: {
          course: true,
          semester: true,
          professor: { select: { name: true, email: true } }
        }
      }
    }
  });

  const grouped = new Map<string, MyCourseContext>();
  for (const row of rows) {
    const existing = grouped.get(row.courseOfferingId);
    if (existing) {
      if (!existing.roles.includes(row.role)) existing.roles.push(row.role);
      continue;
    }
    grouped.set(row.courseOfferingId, {
      courseOffering: {
        id: row.courseOffering.id,
        status: row.courseOffering.status,
        section: row.courseOffering.section,
        course: {
          code: row.courseOffering.course.code,
          title: row.courseOffering.course.title,
          units: row.courseOffering.course.units
        },
        semester: {
          title: row.courseOffering.semester.title,
          code: row.courseOffering.semester.code
        },
        professor: {
          name: row.courseOffering.professor.name,
          email: row.courseOffering.professor.email
        }
      },
      roles: [row.role]
    });
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.courseOffering.course.title.localeCompare(b.courseOffering.course.title, "fa")
  );
}
