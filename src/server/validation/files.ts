import { z } from "zod";
import { cuidSchema } from "./common";

export const fileVisibilitySchema = z.enum(["PRIVATE", "COURSE_STAFF", "ADMIN_ONLY", "PUBLIC"]);

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  // Task/assignment deliverables need a wider range than resumes, but still
  // a whitelist — arbitrary/executable uploads are a real risk, so this is
  // "common student/TA work formats", not "anything goes".
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv"
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const deleteFileSchema = z.object({
  fileId: cuidSchema
});
