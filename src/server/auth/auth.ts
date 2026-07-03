import NextAuth, { type NextAuthConfig } from "next-auth";
import type { GlobalRole, UserStatus } from "@prisma/client";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db";
import { loginSchema } from "@/server/validation/auth";
import { verifyPassword } from "@/server/auth/password";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";
import { verifyTotpCode } from "@/server/auth/totp";
import { getRequestMeta } from "@/server/auth/request";
import { jsonSafe } from "@/server/utils/json";

// How stale a JWT session may be before it's re-checked against the user row.
// This bounds how long a revoked/suspended account or a pre-password-change
// session can keep working: at most this interval.
const SESSION_REVALIDATE_MS = 60 * 1000;

function sensitiveRoleNeeds2fa(globalRole: string) {
  if (process.env.AUTH_ENFORCE_2FA_FOR_STAFF !== "true") return false;
  return globalRole === "PROFESSOR" || globalRole === "EDUCATION_ADMIN" || globalRole === "SYSTEM_ADMIN";
}

async function recordSecurityEvent(input: {
  userId?: string;
  type: "LOGIN_FAILED" | "LOGIN_SUCCESS" | "TWO_FACTOR_FAILED" | "RATE_LIMITED";
  severity?: string;
  metadata?: Record<string, unknown>;
}) {
  const meta = await getRequestMeta();
  await db.securityEvent.create({
    data: {
      userId: input.userId,
      type: input.type,
      severity: input.severity ?? "info",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: jsonSafe(input.metadata ?? {})
    }
  });
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      totpCode: { label: "2FA", type: "text" }
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const meta = await getRequestMeta();
      const limiter = await checkRateLimit(
        makeRateLimitKey("login", meta.ipAddress, parsed.data.email),
        8,
        15 * 60 * 1000
      );

      if (!limiter.allowed) {
        await recordSecurityEvent({
          type: "RATE_LIMITED",
          severity: "warning",
          metadata: { email: parsed.data.email, resetAt: limiter.resetAt.toISOString() }
        });
        return null;
      }

      const user = await db.user.findUnique({
        where: { email: parsed.data.email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          status: true,
          image: true,
          globalRole: true,
          lockedUntil: true,
          failedLoginCount: true,
          twoFactorEnabled: true,
          twoFactorRequired: true,
          timezone: true,
          twoFactorMethods: {
            select: { id: true, encryptedSecret: true },
            orderBy: { enabledAt: "desc" },
            take: 1
          }
        }
      });

      if (!user || !user.passwordHash || user.status !== "ACTIVE") {
        await recordSecurityEvent({ type: "LOGIN_FAILED", severity: "warning", metadata: { email: parsed.data.email } });
        return null;
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await recordSecurityEvent({
          userId: user.id,
          type: "LOGIN_FAILED",
          severity: "warning",
          metadata: { reason: "account_locked", lockedUntil: user.lockedUntil.toISOString() }
        });
        return null;
      }

      const passwordOk = await verifyPassword(user.passwordHash, parsed.data.password);
      if (!passwordOk) {
        const failedLoginCount = user.failedLoginCount + 1;
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount,
            lockedUntil: failedLoginCount >= 10 ? new Date(Date.now() + 15 * 60 * 1000) : null
          }
        });
        await recordSecurityEvent({ userId: user.id, type: "LOGIN_FAILED", severity: "warning" });
        return null;
      }

      const mustVerify2fa = user.twoFactorEnabled || user.twoFactorRequired || sensitiveRoleNeeds2fa(user.globalRole);
      if (mustVerify2fa) {
        const method = user.twoFactorMethods[0];
        if (!method || !parsed.data.totpCode) {
          await recordSecurityEvent({
            userId: user.id,
            type: "TWO_FACTOR_FAILED",
            severity: "warning",
            metadata: { reason: method ? "missing_totp" : "missing_2fa_method" }
          });
          return null;
        }

        const totpOk = verifyTotpCode(method.encryptedSecret, parsed.data.totpCode);
        if (!totpOk) {
          await recordSecurityEvent({ userId: user.id, type: "TWO_FACTOR_FAILED", severity: "warning" });
          return null;
        }

        await db.twoFactorMethod.update({ where: { id: method.id }, data: { lastUsedAt: new Date() } });
      }

      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null }
      });
      await recordSecurityEvent({ userId: user.id, type: "LOGIN_SUCCESS" });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        globalRole: user.globalRole,
        status: user.status,
        timezone: user.timezone
      };
    }
  })
];

if (process.env.AUTH_KEYCLOAK_ID && process.env.AUTH_KEYCLOAK_SECRET && process.env.AUTH_KEYCLOAK_ISSUER) {
  providers.push(
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER
    })
  );
}

export const authConfig = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 15
  },
  pages: {
    signIn: "/login"
  },
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await db.user.findUnique({ where: { email: user.email }, select: { status: true } });
      return existing?.status !== "SUSPENDED" && existing?.status !== "DELETED";
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.globalRole = user.globalRole ?? "STUDENT";
        token.status = user.status ?? "PENDING_EMAIL";
        token.timezone = user.timezone ?? "Asia/Baku";
        // Fixed at login and never rotated forward, so a password change at
        // any later moment reliably invalidates this token — token.iat can't
        // serve this purpose because it moves on session refresh.
        token.authTime = Date.now();
        token.revalidatedAt = Date.now();
        return token;
      }
      // JWT sessions outlive DB state by design, so periodically re-check the
      // user: a password change or suspension after login must end existing
      // sessions, not just block new logins. Throttled so this costs at most
      // one query per user per interval, not one per request.
      const revalidatedAt = typeof token.revalidatedAt === "number" ? token.revalidatedAt : 0;
      if (token.id && Date.now() - revalidatedAt > SESSION_REVALIDATE_MS) {
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: { status: true, globalRole: true, passwordChangedAt: true }
        });
        if (!fresh || fresh.status !== "ACTIVE") return null;
        const authTime = typeof token.authTime === "number" ? token.authTime : 0;
        if (fresh.passwordChangedAt && fresh.passwordChangedAt.getTime() > authTime) return null;
        token.status = fresh.status;
        token.globalRole = fresh.globalRole;
        token.revalidatedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.globalRole = token.globalRole as GlobalRole;
        session.user.status = token.status as UserStatus;
        session.user.timezone = token.timezone as string;
      }
      return session;
    }
  }
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
