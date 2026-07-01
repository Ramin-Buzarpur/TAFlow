import "server-only";
import { headers } from "next/headers";

export async function getRequestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipAddress: forwarded || h.get("x-real-ip") || "unknown",
    userAgent: h.get("user-agent") || "unknown"
  };
}
