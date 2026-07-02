import { z } from "zod";
import { emailSchema } from "./common";

export const passwordPolicySchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain a symbol");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordPolicySchema,
  studentNumber: z.string().trim().min(3).max(40).optional(),
  timezone: z.string().trim().min(3).max(80).default(process.env.APP_TIMEZONE || "Asia/Tehran")
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  totpCode: z.string().regex(/^\d{6}$/).optional()
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(256),
  password: passwordPolicySchema
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordPolicySchema
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  timezone: z.string().trim().min(3).max(80).optional()
});
