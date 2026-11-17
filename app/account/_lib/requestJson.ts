// app/account/_lib/requestJson.ts
"use client";

/** Thrown with a customer-facing message. `status` is the HTTP status (0 for network errors). */
export class RequestError extends Error {
  constructor(message: string, public status: number, public field?: string, public code?: string) {
    super(message);
  }
}

/** fetch + JSON that throws a RequestError carrying the server's own message. */
export async function requestJson<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init || {};
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers || {}) } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: "no-store",
    });
  } catch {
    throw new RequestError("We couldn't reach the server. Please check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      res.status === 401
        ? "Your session has ended. Please sign in again."
        : typeof data?.error === "string"
          ? data.error
          : "Something went wrong. Please try again.";
    throw new RequestError(message, res.status, data?.field, data?.code);
  }
  return data as T;
}
