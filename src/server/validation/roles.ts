import { z } from "zod";
import { CourseRoleType } from "@prisma/client";
import { cuidSchema, dateTimeSchema, optionalCuidSchema, safeText } from "@/server/validation/common";
import { coursePermissions } from "@/server/auth/permissions";

const allowedPermissions = Object.values(coursePermissions) as string[];
const permissionSchema = z.string().refine((value) => allowedPermissions.includes(value), "Invalid permission");

export const courseRoleTypeSchema = z.nativeEnum(CourseRoleType);

export const assignCourseRoleSchema = z
  .object({
    courseOfferingId: cuidSchema,
    userId: cuidSchema,
    role: courseRoleTypeSchema,
    permissions: z.array(permissionSchema).max(50).optional(),
    activeFrom: dateTimeSchema.optional(),
    activeUntil: dateTimeSchema.optional(),
    note: safeText.max(2000).optional(),
    assignmentSource: z.string().trim().min(2).max(60).default("manual")
  })
  .superRefine((value, ctx) => {
    if (value.activeFrom && value.activeUntil && value.activeUntil <= value.activeFrom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["activeUntil"], message: "activeUntil must be after activeFrom" });
    }
  });

export const updateCourseRoleAssignmentSchema = z
  .object({
    assignmentId: cuidSchema,
    courseOfferingId: cuidSchema.optional(),
    permissions: z.array(permissionSchema).max(50).optional(),
    activeFrom: dateTimeSchema.optional(),
    activeUntil: dateTimeSchema.nullable().optional(),
    note: safeText.max(2000).nullable().optional()
  })
  .superRefine((value, ctx) => {
    if (value.activeFrom && value.activeUntil && value.activeUntil <= value.activeFrom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["activeUntil"], message: "activeUntil must be after activeFrom" });
    }
  });

export const revokeCourseRoleAssignmentSchema = z.object({
  assignmentId: cuidSchema,
  courseOfferingId: cuidSchema.optional(),
  reason: safeText.max(2000).optional()
});

export const listCourseRoleAssignmentsSchema = z.object({
  courseOfferingId: cuidSchema,
  role: courseRoleTypeSchema.optional(),
  includeRevoked: z.coerce.boolean().default(false)
});

export const courseOfferingContextSchema = z.object({
  courseOfferingId: cuidSchema,
  userId: optionalCuidSchema
});
