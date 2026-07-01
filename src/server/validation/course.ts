import { z } from "zod";
import { cuidSchema, dateTimeSchema, nonNegativeInt, shortText, safeText } from "./common";

export const createDepartmentSchema = z.object({
  name: shortText,
  code: z.string().trim().min(2).max(20).toUpperCase()
});

export const createSemesterSchema = z.object({
  title: shortText,
  code: z.string().trim().min(3).max(30),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema
}).refine((value) => value.endsAt > value.startsAt, {
  path: ["endsAt"],
  message: "Semester end must be after start"
});

export const createCourseSchema = z.object({
  departmentId: cuidSchema.optional(),
  code: z.string().trim().min(2).max(40).toUpperCase(),
  title: shortText,
  units: z.number().int().min(0).max(6).default(3),
  description: safeText.optional()
});

export const createCourseOfferingSchema = z.object({
  courseId: cuidSchema,
  semesterId: cuidSchema,
  professorId: cuidSchema,
  section: z.string().trim().max(20).optional(),
  capacity: nonNegativeInt.optional()
});

export const enrollStudentsSchema = z.object({
  courseOfferingId: cuidSchema,
  studentIds: z.array(cuidSchema).min(1).max(500)
});
