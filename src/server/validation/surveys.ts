import { z } from "zod";
import { cuidSchema, dateTimeSchema, safeText, shortText } from "./common";

export const createAvailabilityPollSchema = z.object({
  courseOfferingId: cuidSchema,
  title: shortText,
  description: safeText.optional(),
  pollType: z.enum(["CLASS_TIME", "OFFICE_HOUR_TIME", "MAKEUP_CLASS", "PROJECT_SESSION", "CUSTOM"]),
  deadline: dateTimeSchema,
  isAnonymous: z.boolean().default(false),
  options: z.array(z.object({
    label: shortText,
    startsAt: dateTimeSchema.optional(),
    endsAt: dateTimeSchema.optional()
  })).min(2).max(20)
});

export const votePollSchema = z.object({
  pollId: cuidSchema,
  optionId: cuidSchema
});

export const createSurveySchema = z.object({
  courseOfferingId: cuidSchema,
  title: shortText,
  description: safeText.optional(),
  type: z.enum(["TA_MIDTERM", "TA_FINAL", "PROFESSOR_EVALUATION", "COURSE_FEEDBACK", "CUSTOM"]),
  isAnonymous: z.boolean().default(true),
  minResponses: z.number().int().min(3).max(30).default(5),
  opensAt: dateTimeSchema,
  closesAt: dateTimeSchema,
  questions: z.array(z.object({
    text: shortText,
    type: z.enum(["RATING", "TEXT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "BOOLEAN"]),
    required: z.boolean().default(true),
    optionsJson: z.unknown().optional()
  })).min(1).max(50)
}).refine((value) => value.closesAt > value.opensAt, {
  path: ["closesAt"],
  message: "Survey close time must be after open time"
});
