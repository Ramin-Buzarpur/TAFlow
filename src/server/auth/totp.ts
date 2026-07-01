import "server-only";
import { authenticator } from "otplib";
import { decryptSecret, encryptSecret } from "@/server/auth/crypto";

authenticator.options = {
  step: 30,
  window: 1
};

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildTotpUri(email: string, secret: string): string {
  const issuer = process.env.AUTH_TOTP_ISSUER || "TA Management System";
  return authenticator.keyuri(email, issuer, secret);
}

export function encryptTotpSecret(secret: string): string {
  return encryptSecret(secret);
}

export function verifyTotpCode(encryptedSecret: string, code: string): boolean {
  const secret = decryptSecret(encryptedSecret);
  return authenticator.check(code, secret);
}
