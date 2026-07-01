import { z } from "zod";
import { cuidSchema, dateTimeSchema, shortText } from "./common";

export const createDepartmentSchema = z.object({
  name: shortText,
  code: z.string().trim().min(2).max(30)
});

export const createSemesterSchema = z.object({
  title: shortText,
  code: z.string().trim().min(2).max(30),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema
});

export const createCourseSchema = z.object({
  departmentId: cuidSchema.optional(),
  code: z.string().trim().min(2).max(30),
  title: shortText,
  units: z.number().int().min(1).max(10).default(3)
});

export const createCourseOfferingSchema = z.object({
  courseId: cuidSchema,
  semesterId: cuidSchema,
  professorId: cuidSchema,
  section: z.string().trim().max(30).optional(),
  capacity: z.number().int().min(1).max(1000).optional()
});
