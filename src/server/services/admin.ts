import "server-only";
import { db } from "@/server/db";
import { writeAuditLog } from "@/server/services/audit";

export async function listDepartments() {
  return db.department.findMany({ orderBy: { name: "asc" } });
}

export async function createDepartment(actorId: string, input: { name: string; code: string }) {
  const department = await db.department.create({ data: input });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "Department", entityId: department.id, afterJson: department });
  return department;
}

export async function listSemesters() {
  return db.semester.findMany({ orderBy: { startsAt: "desc" } });
}

export async function createSemester(actorId: string, input: { title: string; code: string; startsAt: Date; endsAt: Date }) {
  const semester = await db.semester.create({ data: input });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "Semester", entityId: semester.id, afterJson: semester });
  return semester;
}

export async function listCourses() {
  return db.course.findMany({ include: { department: true }, orderBy: { title: "asc" } });
}

export async function createCourse(actorId: string, input: { departmentId?: string; code: string; title: string; units?: number }) {
  const course = await db.course.create({ data: input });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "Course", entityId: course.id, afterJson: course });
  return course;
}

export async function listCourseOfferings() {
  return db.courseOffering.findMany({ include: { course: true, semester: true, professor: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" } });
}

export async function createCourseOffering(actorId: string, input: { courseId: string; semesterId: string; professorId: string; section?: string; capacity?: number }) {
  const offering = await db.courseOffering.create({ data: { ...input, status: "ACTIVE" }, include: { course: true, semester: true } });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "CourseOffering", entityId: offering.id, courseOfferingId: offering.id, afterJson: offering });
  return offering;
}

export async function listUsers(opts: { q?: string; take?: number } = {}) {
  return db.user.findMany({
    where: opts.q ? { OR: [{ name: { contains: opts.q, mode: "insensitive" } }, { email: { contains: opts.q, mode: "insensitive" } }] } : undefined,
    select: { id: true, name: true, email: true, globalRole: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 50
  });
}

export async function listProfessors() {
  return db.user.findMany({ where: { globalRole: "PROFESSOR" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } });
}
