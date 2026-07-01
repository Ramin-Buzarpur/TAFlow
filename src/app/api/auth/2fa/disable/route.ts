import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { disableTwoFactor } from "@/server/services/two-factor";
import { AppError } from "@/server/errors";

export async function POST() {
  try {
    const user = await requireUser();
    const result = await disableTwoFactor(user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Unexpected 2FA disable error" }, { status: 500 });
  }
}
