import { z } from "zod";
import { cuidSchema, shortText } from "./common";

export const uploadCourseMaterialSchema = z.object({
  fileId: cuidSchema,
  title: shortText.optional()
});
