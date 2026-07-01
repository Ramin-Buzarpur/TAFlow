import { z } from "zod";
import { cuidSchema, dateTimeSchema, safeText, shortText } from "./common";

export const createOfficeHourSessionSchema = z.object({
  courseOfferingId: cuidSchema,
  hostId: cuidSchema,
  title: shortText,
  description: safeText.optional(),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema,
  meetingUrl: z.string().url().optional(),
  location: z.string().trim().max(300).optional(),
  capacity: z.number().int().positive().max(1000).optional()
}).refine((value) => value.endsAt > value.startsAt, {
  path: ["endsAt"],
  message: "Session end must be after start"
});
