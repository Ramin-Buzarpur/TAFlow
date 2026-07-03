import type { CourseRoleType, GlobalRole } from "@prisma/client";
import { PermissionError } from "@/server/errors";

export const coursePermissions = {
  VIEW_COURSE: "course:view",
  MANAGE_COURSE: "course:manage",
  CREATE_TA_OPPORTUNITY: "ta_opportunity:create",
  REVIEW_TA_APPLICATION: "ta_application:review",
  APPROVE_TA_APPLICATION: "ta_application:approve",
  MANAGE_COURSE_ROLES: "course_roles:manage",
  CREATE_OFFICE_HOUR: "office_hour:create",
  MANAGE_OFFICE_HOUR: "office_hour:manage",
  SEND_COURSE_MESSAGE: "message:send_course",
  MODERATE_MESSAGES: "message:moderate",
  EXPORT_ROSTER: "roster:export",
  MANAGE_GRADEBOOK: "gradebook:manage",
  EDIT_ASSIGNED_GRADES: "grades:edit_assigned",
  PUBLISH_GRADES: "grades:publish",
  VIEW_OWN_GRADE: "grades:view_own",
  CREATE_SURVEY: "survey:create",
  VIEW_SURVEY_RESULTS: "survey:view_results",
  REQUEST_CERTIFICATE: "certificate:request",
  APPROVE_CERTIFICATE: "certificate:approve",
  MANAGE_ANNOUNCEMENT: "announcement:manage",
  VIEW_AUDIT: "audit:view",
  MANAGE_COURSE_MATERIALS: "course_materials:manage"
} as const;

export type CoursePermission = (typeof coursePermissions)[keyof typeof coursePermissions];

const baseRolePermissions: Record<CourseRoleType, CoursePermission[]> = {
  STUDENT: [
    coursePermissions.VIEW_COURSE,
    coursePermissions.SEND_COURSE_MESSAGE,
    coursePermissions.VIEW_OWN_GRADE
  ],
  TA: [
    coursePermissions.VIEW_COURSE,
    coursePermissions.CREATE_OFFICE_HOUR,
    coursePermissions.MANAGE_OFFICE_HOUR,
    coursePermissions.SEND_COURSE_MESSAGE,
    coursePermissions.EDIT_ASSIGNED_GRADES,
    coursePermissions.VIEW_SURVEY_RESULTS,
    coursePermissions.REQUEST_CERTIFICATE
  ],
  HEAD_TA: [
    coursePermissions.VIEW_COURSE,
    coursePermissions.REVIEW_TA_APPLICATION,
    coursePermissions.CREATE_OFFICE_HOUR,
    coursePermissions.MANAGE_OFFICE_HOUR,
    coursePermissions.SEND_COURSE_MESSAGE,
    coursePermissions.MODERATE_MESSAGES,
    coursePermissions.EXPORT_ROSTER,
    coursePermissions.MANAGE_GRADEBOOK,
    coursePermissions.EDIT_ASSIGNED_GRADES,
    coursePermissions.VIEW_SURVEY_RESULTS,
    coursePermissions.CREATE_SURVEY,
    coursePermissions.REQUEST_CERTIFICATE
  ],
  PROFESSOR: [
    coursePermissions.VIEW_COURSE,
    coursePermissions.MANAGE_COURSE,
    coursePermissions.CREATE_TA_OPPORTUNITY,
    coursePermissions.REVIEW_TA_APPLICATION,
    coursePermissions.APPROVE_TA_APPLICATION,
    coursePermissions.MANAGE_COURSE_ROLES,
    coursePermissions.CREATE_OFFICE_HOUR,
    coursePermissions.MANAGE_OFFICE_HOUR,
    coursePermissions.SEND_COURSE_MESSAGE,
    coursePermissions.MODERATE_MESSAGES,
    coursePermissions.EXPORT_ROSTER,
    coursePermissions.MANAGE_GRADEBOOK,
    coursePermissions.EDIT_ASSIGNED_GRADES,
    coursePermissions.PUBLISH_GRADES,
    coursePermissions.CREATE_SURVEY,
    coursePermissions.VIEW_SURVEY_RESULTS,
    coursePermissions.APPROVE_CERTIFICATE,
    coursePermissions.MANAGE_ANNOUNCEMENT,
    coursePermissions.VIEW_AUDIT,
    coursePermissions.MANAGE_COURSE_MATERIALS
  ],
  EDUCATION_ADMIN: Object.values(coursePermissions)
};

export function permissionsForCourseRole(role: CourseRoleType, extra?: unknown): Set<CoursePermission> {
  const permissions = new Set<CoursePermission>(baseRolePermissions[role]);
  if (Array.isArray(extra)) {
    for (const item of extra) {
      if (typeof item === "string" && Object.values(coursePermissions).includes(item as CoursePermission)) {
        permissions.add(item as CoursePermission);
      }
    }
  }
  return permissions;
}

export function isGlobalAdmin(role: GlobalRole): boolean {
  return role === "SYSTEM_ADMIN" || role === "EDUCATION_ADMIN";
}

export function assertPermission(
  permissions: Set<CoursePermission>,
  required: CoursePermission,
  message?: string
): void {
  if (!permissions.has(required)) throw new PermissionError(message);
}
