import { z } from "zod";
import { cuidSchema, dateTimeSchema, safeText, shortText } from "./common";

export const customFieldDefSchema = z.object({
  key: z.string().trim().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/, "کلید فیلد فقط می‌تواند شامل حروف انگلیسی، عدد و _ باشد"),
  label: z.string().trim().min(1).max(200),
  type: z.enum(["TEXT", "TEXTAREA", "NUMBER"]),
  required: z.boolean().default(false)
});

export const formConfigSchema = z.object({
  builtIn: z.object({
    studentNumber: z.boolean().default(false),
    gpa: z.boolean().default(false),
    priorGrade: z.boolean().default(false),
    resume: z.boolean().default(true)
  }).default({ studentNumber: false, gpa: false, priorGrade: false, resume: true }),
  customFields: z.array(customFieldDefSchema).max(20).default([])
});

export const createTAOpportunitySchema = z.object({
  courseOfferingId: cuidSchema,
  title: shortText,
  description: safeText,
  requiredTAs: z.number().int().min(1).max(50).default(1),
  needsHeadTA: z.boolean().default(false),
  requirements: safeText,
  opensAt: dateTimeSchema.optional(),
  deadline: dateTimeSchema,
  selectionRubric: z.record(z.string(), z.unknown()).optional(),
  formConfig: formConfigSchema.optional()
});

export const submitTAApplicationSchema = z.object({
  opportunityId: cuidSchema,
  requestedRole: z.enum(["TA", "HEAD_TA", "EITHER"]),
  motivationText: safeText,
  resumeFileId: cuidSchema.optional(),
  customFields: z.record(z.string(), z.union([z.string().trim().max(2000), z.number()])).optional()
});

export const reviewApplicationSchema = z.object({
  applicationId: cuidSchema,
  decision: z.enum(["APPROVE", "REJECT", "SHORTLIST", "INTERVIEW"]),
  score: z.coerce.number().min(0).max(100).optional(),
  internalNote: z.string().trim().max(3000).optional()
});

export const scheduleInterviewSchema = z.object({
  applicationId: cuidSchema,
  applicantId: cuidSchema,
  interviewerId: cuidSchema,
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema,
  meetingUrl: z.string().url().optional(),
  location: z.string().trim().max(300).optional()
}).refine((value) => value.endsAt > value.startsAt, {
  path: ["endsAt"],
  message: "Interview end must be after start"
});
