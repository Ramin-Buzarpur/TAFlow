import "server-only";
import { NextResponse } from "next/server";
import { AppError } from "@/server/errors";

export function ok<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status ?? 200 });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function fail(error: unknown, fallbackMessage = "Request failed") {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.code, message: error.message, details: error.details }, { status: error.status });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: error.message || fallbackMessage }, { status: 400 });
  }
  return NextResponse.json({ error: "UNKNOWN_ERROR", message: fallbackMessage }, { status: 400 });
}

export function pageParams(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") || "20", 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
