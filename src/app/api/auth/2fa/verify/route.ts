import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { verifyAndEnableTwoFactor } from "@/server/services/two-factor";
import { AppError } from "@/server/errors";

const schema = z.object({ methodId: z.string().min(10).max(40), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const result = await verifyAndEnableTwoFactor(user.id, input.methodId, input.code);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Invalid 2FA verify request" }, { status: 400 });
  }
}
