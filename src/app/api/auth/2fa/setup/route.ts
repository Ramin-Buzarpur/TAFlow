import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createTwoFactorSetup } from "@/server/services/two-factor";
import { AppError } from "@/server/errors";

const schema = z.object({ label: z.string().trim().min(2).max(80).default("Authenticator app") });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
    const input = schema.parse(body);
    const setup = await createTwoFactorSetup(user.id, input.label);
    return NextResponse.json({ data: setup }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Invalid 2FA setup request" }, { status: 400 });
  }
}
