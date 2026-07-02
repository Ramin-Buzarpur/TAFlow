import "server-only";
import type { CourseRoleAssignment, CourseRoleType } from "@prisma/client";
import { db } from "@/server/db";
import { PermissionError, AppError } from "@/server/errors";
import { assertPermission, coursePermissions, isGlobalAdmin } from "@/server/auth/permissions";
import { getCoursePermissions } from "@/server/services/rbac";
import { parseInput } from "@/server/utils/result";
import { jsonSafe } from "@/server/utils/json";
import {
  assignCourseRoleSchema,
  listCourseRoleAssignmentsSchema,
  revokeCourseRoleAssignmentSchema,
  updateCourseRoleAssignmentSchema
} from "@/server/validation/roles";

async function assertCanManageRole(actorId: string, courseOfferingId: string, targetRole?: CourseRoleType) {
  const actor = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true, status: true } });
  if (!actor || actor.status !== "ACTIVE") throw new PermissionError("Actor account is not active");
  if (isGlobalAdmin(actor.globalRole)) return;

  const permissions = await getCoursePermissions(actorId, courseOfferingId);
  assertPermission(permissions, coursePermissions.MANAGE_COURSE_ROLES);

  if (targetRole === "PROFESSOR" || targetRole === "EDUCATION_ADMIN") {
    throw new PermissionError("Only education admins can assign professor or education-admin course roles");
  }
}

async function ensureUserCanReceiveRole(userId: string, role: CourseRoleType) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, globalRole: true, studentProfile: { select: { id: true } }, professorProfile: { select: { id: true } } }
  });
  if (!user || user.status !== "ACTIVE") throw new AppError("USER_NOT_ACTIVE", "Target user is not active", 400);
  if ((role === "TA" || role === "HEAD_TA" || role === "STUDENT") && !user.studentProfile) {
    throw new AppError("INVALID_ROLE_TARGET", "TA, Head TA and student roles require a student profile", 400);
  }
  if (role === "PROFESSOR" && !user.professorProfile && user.globalRole !== "PROFESSOR") {
    throw new AppError("INVALID_ROLE_TARGET", "Professor role requires a professor profile or professor global role", 400);
  }
}

export async function assignCourseRole(actorId: string, input: unknown): Promise<CourseRoleAssignment> {
  const data = parseInput(assignCourseRoleSchema, input);
  await assertCanManageRole(actorId, data.courseOfferingId, data.role);
  await ensureUserCanReceiveRole(data.userId, data.role);

  const offering = await db.courseOffering.findUnique({
    where: { id: data.courseOfferingId },
    select: { id: true, professorId: true, course: { select: { title: true, code: true } }, semester: { select: { title: true } } }
  });
  if (!offering) throw new AppError("COURSE_OFFERING_NOT_FOUND", "Course offering was not found", 404);

  const assignment = await db.$transaction(async (tx) => {
    // No single-key upsert here: the active-row-per-triple invariant is a
    // partial unique index (WHERE "revokedAt" IS NULL), not a plain unique
    // constraint, so a prior revoke must leave its row untouched as history
    // and a fresh assignment must become a new row.
    const activeExisting = await tx.courseRoleAssignment.findFirst({
      where: { courseOfferingId: data.courseOfferingId, userId: data.userId, role: data.role, revokedAt: null }
    });

    const created = activeExisting
      ? await tx.courseRoleAssignment.update({
          where: { id: activeExisting.id },
          data: {
            permissionsJson: data.permissions ?? undefined,
            activeFrom: data.activeFrom ?? undefined,
            activeUntil: data.activeUntil ?? null,
            assignedById: actorId,
            assignmentSource: data.assignmentSource,
            note: data.note
          }
        })
      : await tx.courseRoleAssignment.create({
          data: {
            courseOfferingId: data.courseOfferingId,
            userId: data.userId,
            role: data.role,
            permissionsJson: data.permissions ?? undefined,
            activeFrom: data.activeFrom ?? new Date(),
            activeUntil: data.activeUntil,
            assignedById: actorId,
            assignmentSource: data.assignmentSource,
            note: data.note
          }
        });

    if (data.role === "STUDENT") {
      await tx.courseEnrollment.upsert({
        where: { courseOfferingId_studentId: { courseOfferingId: data.courseOfferingId, studentId: data.userId } },
        update: { droppedAt: null, source: "role-assignment" },
        create: { courseOfferingId: data.courseOfferingId, studentId: data.userId, source: "role-assignment" }
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: "APPROVE",
        entityType: "CourseRoleAssignment",
        entityId: created.id,
        courseOfferingId: data.courseOfferingId,
        afterJson: jsonSafe(created),
        metadata: { role: data.role, targetUserId: data.userId }
      }
    });

    return created;
  });

  return assignment;
}

export async function updateCourseRoleAssignment(actorId: string, input: unknown) {
  const data = parseInput(updateCourseRoleAssignmentSchema, input);
  const existing = await db.courseRoleAssignment.findUnique({ where: { id: data.assignmentId } });
  if (!existing) throw new AppError("ROLE_ASSIGNMENT_NOT_FOUND", "Course role assignment was not found", 404);
  if (data.courseOfferingId && data.courseOfferingId !== existing.courseOfferingId) {
    throw new AppError("ROLE_ASSIGNMENT_MISMATCH", "Role assignment does not belong to this course offering", 409);
  }
  await assertCanManageRole(actorId, existing.courseOfferingId, existing.role);

  return db.$transaction(async (tx) => {
    const updated = await tx.courseRoleAssignment.update({
      where: { id: existing.id },
      data: {
        permissionsJson: data.permissions ?? undefined,
        activeFrom: data.activeFrom ?? undefined,
        activeUntil: data.activeUntil === undefined ? undefined : data.activeUntil,
        note: data.note === undefined ? undefined : data.note
      }
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "UPDATE",
        entityType: "CourseRoleAssignment",
        entityId: updated.id,
        courseOfferingId: updated.courseOfferingId,
        beforeJson: jsonSafe(existing),
        afterJson: jsonSafe(updated)
      }
    });
    return updated;
  });
}

export async function revokeCourseRoleAssignment(actorId: string, input: unknown) {
  const data = parseInput(revokeCourseRoleAssignmentSchema, input);
  const existing = await db.courseRoleAssignment.findUnique({ where: { id: data.assignmentId } });
  if (!existing) throw new AppError("ROLE_ASSIGNMENT_NOT_FOUND", "Course role assignment was not found", 404);
  if (data.courseOfferingId && data.courseOfferingId !== existing.courseOfferingId) {
    throw new AppError("ROLE_ASSIGNMENT_MISMATCH", "Role assignment does not belong to this course offering", 409);
  }
  await assertCanManageRole(actorId, existing.courseOfferingId, existing.role);

  return db.$transaction(async (tx) => {
    const revoked = await tx.courseRoleAssignment.update({
      where: { id: existing.id },
      data: {
        activeUntil: new Date(),
        revokedAt: new Date(),
        revokedById: actorId,
        revokeReason: data.reason
      }
    });

    if (existing.role === "STUDENT") {
      await tx.courseEnrollment.updateMany({
        where: { courseOfferingId: existing.courseOfferingId, studentId: existing.userId, droppedAt: null },
        data: { droppedAt: new Date() }
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: "REVOKE",
        entityType: "CourseRoleAssignment",
        entityId: revoked.id,
        courseOfferingId: revoked.courseOfferingId,
        beforeJson: jsonSafe(existing),
        afterJson: jsonSafe(revoked),
        metadata: { reason: data.reason }
      }
    });

    return revoked;
  });
}

export async function listCourseRoleAssignments(actorId: string, input: unknown) {
  const data = parseInput(listCourseRoleAssignmentsSchema, input);
  const user = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true, status: true } });
  if (!user || user.status !== "ACTIVE") throw new PermissionError("Actor account is not active");

  const canAdmin = isGlobalAdmin(user.globalRole);
  const permissions = canAdmin ? new Set(Object.values(coursePermissions)) : await getCoursePermissions(actorId, data.courseOfferingId);
  if (!permissions.has(coursePermissions.MANAGE_COURSE_ROLES) && !permissions.has(coursePermissions.VIEW_COURSE)) {
    throw new PermissionError("You cannot view this course role list");
  }

  return db.courseRoleAssignment.findMany({
    where: {
      courseOfferingId: data.courseOfferingId,
      role: data.role,
      ...(data.includeRevoked ? {} : { revokedAt: null })
    },
    include: {
      user: { select: { id: true, name: true, email: true, globalRole: true } },
      assignedBy: { select: { id: true, name: true, email: true } },
      revokedBy: { select: { id: true, name: true, email: true } }
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }]
  });
}

export async function getCourseOfferingIdentity(courseOfferingId: string) {
  const offering = await db.courseOffering.findUnique({
    where: { id: courseOfferingId },
    select: {
      id: true,
      section: true,
      status: true,
      course: { select: { id: true, code: true, title: true, units: true } },
      semester: { select: { id: true, code: true, title: true, startsAt: true, endsAt: true } },
      professor: { select: { id: true, name: true, email: true } }
    }
  });
  if (!offering) throw new AppError("COURSE_OFFERING_NOT_FOUND", "Course offering was not found", 404);
  return offering;
}
