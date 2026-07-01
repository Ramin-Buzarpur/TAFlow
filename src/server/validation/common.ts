import { z } from "zod";

export const cuidSchema = z.string().min(10).max(40);
export const optionalCuidSchema = cuidSchema.optional();
export const emailSchema = z.string().trim().email().max(254).toLowerCase();
export const safeText = z.string().trim().min(1).max(5000);
export const shortText = z.string().trim().min(1).max(180);
export const urlSchema = z.string().trim().url().max(2048);
export const positiveInt = z.number().int().positive();
export const nonNegativeInt = z.number().int().min(0);
export const scoreSchema = z.coerce.number().min(0).max(1000);
export const dateTimeSchema = z.coerce.date();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export function dateRangeSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).superRefine((value: Record<string, unknown>, ctx) => {
    const startsAt = value.startsAt;
    const endsAt = value.endsAt;
    if (startsAt instanceof Date && endsAt instanceof Date && endsAt <= startsAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "endsAt must be after startsAt" });
    }
  });
}
