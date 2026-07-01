import { z } from "zod";
import { cuidSchema, dateTimeSchema, safeText, shortText } from "./common";

export const createGradeCategorySchema = z.object({
  courseOfferingId: cuidSchema,
  name: shortText,
  weight: z.coerce.number().min(0).max(100),
  maxScore: z.coerce.number().positive().max(1000),
  visibility: z.enum(["STAFF_ONLY", "STUDENT_PRIVATE", "PUBLISHED"]).default("STAFF_ONLY")
});

export const createGradeItemSchema = z.object({
  courseOfferingId: cuidSchema,
  categoryId: cuidSchema,
  title: shortText,
  maxScore: z.coerce.number().positive().max(1000),
  dueAt: dateTimeSchema.optional(),
  visibility: z.enum(["STAFF_ONLY", "STUDENT_PRIVATE", "PUBLISHED"]).default("STAFF_ONLY")
});

export const upsertGradeRecordSchema = z.object({
  gradeItemId: cuidSchema,
  studentId: cuidSchema,
  score: z.coerce.number().min(0).max(1000),
  feedback: safeText.optional(),
  reason: z.string().trim().max(1000).optional()
});

export const publishGradeItemSchema = z.object({
  gradeItemId: cuidSchema
});

export const importGradesSchema = z.object({
  courseOfferingId: cuidSchema,
  gradeItemId: cuidSchema,
  format: z.enum(["CSV", "XLSX"]),
  rows: z.array(z.object({
    studentNumber: z.string().trim().min(1).max(40),
    score: z.coerce.number().min(0).max(1000),
    feedback: z.string().trim().max(2000).optional()
  })).min(1).max(2000)
});
