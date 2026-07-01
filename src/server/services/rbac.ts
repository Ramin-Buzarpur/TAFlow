import "server-only";
import { db } from "@/server/db";
import { PermissionError } from "@/server/errors";
import {
  assertPermission,
  coursePermissions,
  isGlobalAdmin,
  permissionsForCourseRole,
  type CoursePermission
} from "@/server/auth/permissions";

export async function getCoursePermissions(userId: string, courseOfferingId: string): Promise<Set<CoursePermission>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { globalRole: true, status: true }
  });

  if (!user || user.status !== "ACTIVE") throw new PermissionError("User is not active");
  if (isGlobalAdmin(user.globalRole)) return new Set(Object.values(coursePermissions));

  const now = new Date();
  const roles = await db.courseRoleAssignment.findMany({
    where: {
      userId,
      courseOfferingId,
      revokedAt: null,
      activeFrom: { lte: now },
      OR: [{ activeUntil: null }, { activeUntil: { gt: now } }]
    },
    select: { role: true, permissionsJson: true }
  });

  const permissions = new Set<CoursePermission>();
  for (const role of roles) {
    const extra = Array.isArray(role.permissionsJson) ? role.permissionsJson : undefined;
    for (const permission of permissionsForCourseRole(role.role, extra)) permissions.add(permission);
  }

  return permissions;
}

export async function getCourseRoleNames(userId: string, courseOfferingId: string) {
  const now = new Date();
  const rows = await db.courseRoleAssignment.findMany({
    where: {
      userId,
      courseOfferingId,
      revokedAt: null,
      activeFrom: { lte: now },
      OR: [{ activeUntil: null }, { activeUntil: { gt: now } }]
    },
    select: { role: true },
    orderBy: { role: "asc" }
  });
  return rows.map((row) => row.role);
}

export async function requireCoursePermission(
  userId: string,
  courseOfferingId: string,
  permission: CoursePermission
): Promise<void> {
  const permissions = await getCoursePermissions(userId, courseOfferingId);
  assertPermission(permissions, permission);
}

export async function canAccessCourseOffering(userId: string, courseOfferingId: string): Promise<boolean> {
  const permissions = await getCoursePermissions(userId, courseOfferingId);
  return permissions.has(coursePermissions.VIEW_COURSE);
}

export async function listMyCourseOfferings(userId: string) {
  const now = new Date();
  const roles = await db.courseRoleAssignment.findMany({
    where: { userId, revokedAt: null, activeFrom: { lte: now }, OR: [{ activeUntil: null }, { activeUntil: { gt: now } }] },
    include: { courseOffering: { include: { course: true, semester: true } } }
  });
  const byId = new Map(roles.map((r) => [r.courseOfferingId, r.courseOffering]));
  return Array.from(byId.values());
}
