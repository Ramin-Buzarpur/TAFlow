import { z } from "zod";
import { cuidSchema, dateTimeSchema, safeText, shortText } from "./common";

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"]);

export const createTaskSchema = z.object({
  courseOfferingId: cuidSchema,
  title: shortText,
  description: safeText.optional(),
  assigneeId: cuidSchema.optional(),
  estimatedMinutes: z.number().int().min(0).max(10000).optional(),
  dueAt: dateTimeSchema.optional()
});

export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema
});

export const submitTaskSchema = z.object({
  fileId: cuidSchema,
  note: z.string().trim().max(2000).optional()
});
