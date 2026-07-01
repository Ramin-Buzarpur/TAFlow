import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db";
import { loginSchema } from "@/server/validation/auth";
import { verifyPassword } from "@/server/auth/password";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";
import { verifyTotpCode } from "@/server/auth/totp";
import { getRequestMeta } from "@/server/auth/request";

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
      metadata: input.metadata ?? {}
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
      const limiter = checkRateLimit(
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
    strategy: "database",
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
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.globalRole = user.globalRole;
        session.user.status = user.status;
        session.user.timezone = user.timezone;
      }
      return session;
    }
  }
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
