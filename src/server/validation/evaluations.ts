import { z } from "zod";
import { cuidSchema } from "./common";

export const submitProfessorEvaluationSchema = z.object({
  courseOfferingId: cuidSchema,
  ratingTeaching: z.number().int().min(1).max(5),
  ratingFairness: z.number().int().min(1).max(5),
  ratingResources: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional()
});
