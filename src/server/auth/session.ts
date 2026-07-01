import "server-only";
import type { GlobalRole } from "@prisma/client";
import { auth } from "@/server/auth/auth";
import { PermissionError } from "@/server/errors";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user?.id) throw new PermissionError("Authentication is required");
  if (user.status && user.status !== "ACTIVE") throw new PermissionError("User account is not active");
  return user;
}

export async function requireGlobalRole(roles: GlobalRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.globalRole as GlobalRole)) throw new PermissionError("Insufficient global role");
  return user;
}
