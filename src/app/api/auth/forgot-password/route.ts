import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/server/services/password-reset";
import { AppError } from "@/server/errors";

export async function POST(request: Request) {
  try {
    const result = await requestPasswordReset(await request.json());
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Invalid password reset request" }, { status: 400 });
  }
}
