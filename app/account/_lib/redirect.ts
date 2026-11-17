// app/account/_lib/redirect.ts
//
// Where to send a customer after signing in. Only same-site relative paths are
// allowed, so a link like /account/login?redirect=https://evil.example can't send
// people off the site.

/** The path if it is a safe same-site relative path, otherwise null. */
export function safeRedirect(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  if (!path.startsWith('/')) return null;
  // "//host" and "/\host" are treated as other sites by browsers.
  if (path.startsWith('//') || path.startsWith('/\\')) return null;
  if (path.length > 2000) return null;
  // Control characters (including tabs and newlines browsers strip) and backslashes.
  if (/[\u0000-\u001F\u007F\\]/.test(path)) return null;
  // Sending someone back to a sign-in page after signing in would loop.
  if (/^\/account\/(login|signup|forgot-password|reset-password)(\/|\?|#|$)/.test(path)) return null;
  return path;
}

/** Appends ?redirect=<path> to an account page link when the path is safe. */
export function withRedirect(page: string, redirect: string | null | undefined): string {
  const safe = safeRedirect(redirect);
  return safe ? `${page}?redirect=${encodeURIComponent(safe)}` : page;
}

/** The sign-in link for a protected page, returning to that page afterwards. */
export function loginUrlFor(currentPath: string): string {
  return withRedirect('/account/login', currentPath);
}
