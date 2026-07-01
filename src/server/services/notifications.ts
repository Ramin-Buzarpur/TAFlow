import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";

export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  metadata?: unknown;
}) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      metadata: typeof input.metadata === "undefined" ? undefined : JSON.parse(JSON.stringify(input.metadata))
    }
  });
}

export async function listNotifications(userId: string, opts: { unreadOnly?: boolean; take?: number } = {}) {
  return db.notification.findMany({
    where: { userId, ...(opts.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 50
  });
}

export async function markNotificationRead(userId: string, id: string) {
  const notification = await db.notification.findUnique({ where: { id } });
  if (!notification) throw new AppError("NOT_FOUND", "Notification not found", 404);
  if (notification.userId !== userId) throw new PermissionError();
  if (notification.readAt) return notification;
  return db.notification.update({ where: { id }, data: { readAt: new Date() } });
}
