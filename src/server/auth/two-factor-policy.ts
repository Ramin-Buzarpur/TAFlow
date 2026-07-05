import type { GlobalRole } from "@prisma/client";

const STAFF_ROLES = new Set<GlobalRole>(["PROFESSOR", "EDUCATION_ADMIN", "SYSTEM_ADMIN"]);

export function staffRoleRequiresTwoFactor(globalRole: GlobalRole, enforce = process.env.AUTH_ENFORCE_2FA_FOR_STAFF) {
  return enforce === "true" && STAFF_ROLES.has(globalRole);
}
