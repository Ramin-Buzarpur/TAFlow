import type { AuditAction } from "@prisma/client";
import { db } from "@/server/db";

function toJson(value: unknown) {
  if (typeof value === "undefined") return undefined;
  return JSON.parse(JSON.stringify(value));
}

export async function audit(input: {
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  courseOfferingId?: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  return db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      courseOfferingId: input.courseOfferingId,
      beforeJson: toJson(input.beforeJson),
      afterJson: toJson(input.afterJson),
      metadata: toJson(input.metadata),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });
}

export const writeAuditLog = audit;
