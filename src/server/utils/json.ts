import type { Prisma } from "@prisma/client";

export function jsonSafe<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}
