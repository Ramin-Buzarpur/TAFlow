import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  AUTH_ENCRYPTION_KEY: z.string().min(16, "AUTH_ENCRYPTION_KEY must be at least 16 characters"),
  AUTH_URL: z.string().url()
});

let validated: z.infer<typeof envSchema> | undefined;

export function getValidatedEnv() {
  if (validated) return validated;
  const result = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_ENCRYPTION_KEY: process.env.AUTH_ENCRYPTION_KEY,
    AUTH_URL: process.env.AUTH_URL
  });
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  validated = result.data;
  return validated;
}
