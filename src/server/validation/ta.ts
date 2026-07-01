import { z } from "zod";
import { cuidSchema, dateTimeSchema, safeText, shortText } from "./common";

export const createTAOpportunitySchema = z.object({
  courseOfferingId: cuidSchema,
  title: shortText,
  description: safeText,
  requiredTAs: z.number().int().min(1).max(50).default(1),
  needsHeadTA: z.boolean().default(false),
  requirements: safeText,
  deadline: dateTimeSchema,
  selectionRubric: z.record(z.string(), z.unknown()).optional()
});

export const submitTAApplicationSchema = z.object({
  opportunityId: cuidSchema,
  requestedRole: z.enum(["TA", "HEAD_TA", "EITHER"]),
  motivationText: safeText,
  resumeFileId: cuidSchema.optional()
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
