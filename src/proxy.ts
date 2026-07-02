import { NextResponse, type NextRequest } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function trustedOrigin(): string | null {
  const url = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method)) return NextResponse.next();

  const origin = request.headers.get("origin");
  // No Origin header at all (plain server-to-server calls, curl, some same-site
  // browser requests) is left alone — this check only rejects a *mismatched*
  // Origin, which is what a cross-site form/fetch attack would send.
  if (!origin) return NextResponse.next();

  const allowed = trustedOrigin();
  if (allowed && origin !== allowed) {
    return NextResponse.json({ error: "FORBIDDEN_ORIGIN", message: "Cross-origin requests are not allowed for this action" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*"
};
