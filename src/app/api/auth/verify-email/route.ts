import { NextResponse } from "next/server";
import { markEmailVerified } from "@/server/services/users";
import { AppError } from "@/server/errors";
import { emailSchema } from "@/server/validation/common";
import { z } from "zod";

const verifySchema = z.object({
  email: emailSchema,
  token: z.string().min(20).max(256)
});

export async function POST(request: Request) {
  try {
    const input = verifySchema.parse(await request.json());
    await markEmailVerified(input.email, input.token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.code, message: error.message, details: error.details }, { status: error.status });
    }
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Invalid verification request" }, { status: 400 });
  }
}
