import { describe, expect, it } from "vitest";
import { loginSchema, passwordPolicySchema } from "../../src/server/validation/auth";
import { assignCourseRoleSchema } from "../../src/server/validation/roles";
import { coursePermissions } from "../../src/server/auth/permissions";

const id = "clw0000000000000000000000";

describe("auth validation", () => {
  it("requires a strong password", () => {
    expect(passwordPolicySchema.safeParse("weakpass").success).toBe(false);
    expect(passwordPolicySchema.safeParse("Strong@123456").success).toBe(true);
  });

  it("accepts optional 2FA code during login", () => {
    const result = loginSchema.safeParse({ email: "student@example.edu", password: "Strong@123456", totpCode: "123456" });
    expect(result.success).toBe(true);
  });
});

describe("course role assignment validation", () => {
  it("accepts a course-offering scoped Head TA assignment", () => {
    const result = assignCourseRoleSchema.safeParse({
      courseOfferingId: id,
      userId: id,
      role: "HEAD_TA",
      permissions: [coursePermissions.EXPORT_ROSTER]
    });
    expect(result.success).toBe(true);
  });

  it("rejects inverted role activation dates", () => {
    const result = assignCourseRoleSchema.safeParse({
      courseOfferingId: id,
      userId: id,
      role: "TA",
      activeFrom: new Date("2026-10-10T10:00:00Z"),
      activeUntil: new Date("2026-10-09T10:00:00Z")
    });
    expect(result.success).toBe(false);
  });
});
