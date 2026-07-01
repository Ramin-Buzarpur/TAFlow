import { z } from "zod";
import { cuidSchema } from "./common";

export const requestCertificateSchema = z.object({
  courseOfferingId: cuidSchema,
  role: z.enum(["TA", "HEAD_TA"])
});

export const decideCertificateRequestSchema = z.object({
  requestId: cuidSchema,
  decision: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().trim().max(1000).optional()
});
