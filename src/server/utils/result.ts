import { z } from "zod";
import { ValidationError } from "@/server/errors";

export function parseInput<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(result.error.flatten());
  return result.data;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
export const fail = (error: string, status = 400): ServiceResult<never> => ({ ok: false, error, status });
