import { describe, expect, it } from "vitest";
import { coursePermissions, permissionsForCourseRole } from "../../src/server/auth/permissions";

describe("course role permissions", () => {
  it("student cannot export roster", () => {
    const permissions = permissionsForCourseRole("STUDENT");
    expect(permissions.has(coursePermissions.EXPORT_ROSTER)).toBe(false);
  });

  it("head TA can export roster but cannot approve applications finally", () => {
    const permissions = permissionsForCourseRole("HEAD_TA");
    expect(permissions.has(coursePermissions.EXPORT_ROSTER)).toBe(true);
    expect(permissions.has(coursePermissions.APPROVE_TA_APPLICATION)).toBe(false);
  });

  it("professor can publish grades and approve certificates", () => {
    const permissions = permissionsForCourseRole("PROFESSOR");
    expect(permissions.has(coursePermissions.PUBLISH_GRADES)).toBe(true);
    expect(permissions.has(coursePermissions.APPROVE_CERTIFICATE)).toBe(true);
  });
});
