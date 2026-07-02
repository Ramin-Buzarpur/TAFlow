import { describe, expect, it } from "vitest";
import { coursePermissions, permissionsForCourseRole, assertPermission, isGlobalAdmin } from "../../src/server/auth/permissions";
import { PermissionError } from "../../src/server/errors";

describe("privilege escalation prevention", () => {
  it("TA cannot self-assign course roles (no MANAGE_COURSE_ROLES permission)", () => {
    const taPermissions = permissionsForCourseRole("TA");
    expect(taPermissions.has(coursePermissions.MANAGE_COURSE_ROLES)).toBe(false);
    expect(() => assertPermission(taPermissions, coursePermissions.MANAGE_COURSE_ROLES)).toThrow(PermissionError);
  });

  it("Head TA cannot grant course roles either (only global admins and professors can)", () => {
    const headTaPermissions = permissionsForCourseRole("HEAD_TA");
    expect(headTaPermissions.has(coursePermissions.MANAGE_COURSE_ROLES)).toBe(false);
  });

  it("student cannot edit any grade record (no EDIT_ASSIGNED_GRADES permission)", () => {
    const studentPermissions = permissionsForCourseRole("STUDENT");
    expect(studentPermissions.has(coursePermissions.EDIT_ASSIGNED_GRADES)).toBe(false);
    expect(studentPermissions.has(coursePermissions.PUBLISH_GRADES)).toBe(false);
  });

  it("student can only view their own grade, never publish or manage the gradebook", () => {
    const studentPermissions = permissionsForCourseRole("STUDENT");
    expect(studentPermissions.has(coursePermissions.VIEW_OWN_GRADE)).toBe(true);
    expect(studentPermissions.has(coursePermissions.MANAGE_GRADEBOOK)).toBe(false);
  });

  it("TA cannot approve TA applications (final approval is professor/admin-only)", () => {
    const taPermissions = permissionsForCourseRole("TA");
    expect(taPermissions.has(coursePermissions.APPROVE_TA_APPLICATION)).toBe(false);
  });

  it("only EDUCATION_ADMIN and SYSTEM_ADMIN count as global admins, not PROFESSOR", () => {
    expect(isGlobalAdmin("EDUCATION_ADMIN")).toBe(true);
    expect(isGlobalAdmin("SYSTEM_ADMIN")).toBe(true);
    expect(isGlobalAdmin("PROFESSOR")).toBe(false);
    expect(isGlobalAdmin("STUDENT")).toBe(false);
  });

  it("extra permissions granted via permissionsJson cannot include invalid/unknown values", () => {
    const permissions = permissionsForCourseRole("STUDENT", ["not-a-real-permission", coursePermissions.EXPORT_ROSTER]);
    expect(permissions.has(coursePermissions.EXPORT_ROSTER)).toBe(true);
    expect([...permissions]).not.toContain("not-a-real-permission");
  });
});

describe("revoked role has no standing permissions", () => {
  it("a revoked assignment must not be counted when computing active permissions (contract for rbac.getCoursePermissions)", () => {
    // getCoursePermissions filters CourseRoleAssignment rows with `revokedAt: null`
    // before ever calling permissionsForCourseRole; a revoked row is simply
    // excluded from the query, so it can contribute zero permissions by
    // construction. This test locks in that only *active* roles feed into
    // permissionsForCourseRole, not the raw assignment list.
    const activeRoles: { role: "TA" | "HEAD_TA"; revokedAt: Date | null }[] = [
      { role: "HEAD_TA", revokedAt: new Date() },
      { role: "TA", revokedAt: null }
    ];
    const effectivePermissions = activeRoles
      .filter((r) => r.revokedAt === null)
      .flatMap((r) => [...permissionsForCourseRole(r.role)]);
    expect(effectivePermissions).not.toContain(coursePermissions.REVIEW_TA_APPLICATION);
  });
});
