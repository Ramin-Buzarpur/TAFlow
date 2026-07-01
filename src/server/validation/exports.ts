import { z } from "zod";
import { cuidSchema } from "./common";

export const exportRosterSchema = z.object({
  courseOfferingId: cuidSchema,
  format: z.enum(["CSV", "XLSX"]),
  includeEmails: z.boolean().default(true),
  includeRoles: z.boolean().default(true),
  includeGrades: z.boolean().default(false)
});

export const exportGradesSchema = z.object({
  courseOfferingId: cuidSchema,
  format: z.enum(["CSV", "XLSX"]),
  gradeItemIds: z.array(cuidSchema).max(100).optional()
});
