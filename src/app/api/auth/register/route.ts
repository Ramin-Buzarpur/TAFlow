import { NextResponse } from "next/server";
import { registerUser } from "@/server/services/users";
import { AppError } from "@/server/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await registerUser(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.code, message: error.message, details: error.details }, { status: error.status });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Unexpected registration error" }, { status: 500 });
  }
}
