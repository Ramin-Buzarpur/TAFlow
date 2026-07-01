import { z } from "zod";
import { cuidSchema } from "./common";

export const fileVisibilitySchema = z.enum(["PRIVATE", "COURSE_STAFF", "ADMIN_ONLY", "PUBLIC"]);

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp"
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const deleteFileSchema = z.object({
  fileId: cuidSchema
});
