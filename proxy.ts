import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientIp, rateLimit } from "./lib/rate-limit/sharedLimiter";

/** Rate limits every /api route per client IP. */
export async function proxy(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const result = await rateLimit(ip);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please wait a moment and try again.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "Retry-After": String(result.retryAfterSeconds),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
