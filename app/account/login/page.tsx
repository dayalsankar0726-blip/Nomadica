// app/account/login/page.tsx
"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth, getStoredAuth } from "@/utils/hooks/useAuth";
import { PageLoader } from "@/components/ui/PageLoader";
import { BusyButton } from "../_components/BusyButton";
import { PasswordField } from "../_components/PasswordField";
import { withRedirect } from "../_lib/redirect";
import { clearStoredRedirect, destinationAfterSignIn, finishPendingWishlist, primeSavedAddress, rememberSession } from "../_lib/clientSession";

type LoginError = { message: string; code?: string };

function LoginForm() {
  const searchParams = useSearchParams();
  const { isAuthenticated, verified } = useAuth();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginError | null>(null);
  const [loading, setLoading] = useState(false);
  const [hadStoredSession, setHadStoredSession] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const redirect = searchParams.get("redirect") || searchParams.get("returnUrl");
  const notice =
    searchParams.get("reset") === "1"
      ? "Your password has been changed. Please sign in with your new password."
      : searchParams.get("expired") === "1"
        ? "Your session has ended. Please sign in again."
        : "";

  useEffect(() => {
    // Browser storage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHadStoredSession(getStoredAuth().isAuthenticated);
  }, []);

  // Already signed in (confirmed by the server): go straight on.
  useEffect(() => {
    if (verified && isAuthenticated && !loading) {
      const destination = destinationAfterSignIn(searchParams);
      clearStoredRedirect();
      window.location.replace(destination);
    }
  }, [verified, isAuthenticated, loading, searchParams]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError({ message: data.error || "We couldn't sign you in. Please try again.", code: data.code });
        setLoading(false);
        return;
      }

      rememberSession(data);
      await Promise.all([primeSavedAddress(), finishPendingWishlist()]);
      const destination = destinationAfterSignIn(searchParams);
      clearStoredRedirect();
      window.location.assign(destination);
    } catch {
      setError({ message: "We couldn't reach the server. Please check your connection and try again." });
      setLoading(false);
    }
  };

  if (verified && isAuthenticated) {
    return (
      <div className="acct-auth-page">
        <p className="acct-muted" role="status">
          You&apos;re already signed in. Taking you there…
        </p>
      </div>
    );
  }
  if (!verified && hadStoredSession) {
    return <PageLoader label="Checking your session" />;
  }

  const forgotHref = `/account/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`;
  const signupHref = withRedirect("/account/signup", redirect);

  return (
    <div className="acct-auth-page">
      <div className="acct-auth-card">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 className="acct-auth-title">Welcome back</h1>
          <p className="acct-auth-subtitle">Sign in to your Nomadica account</p>
        </div>

        <form onSubmit={handleSubmit} className="acct-form" noValidate={false}>
          {notice && !error && (
            <p className="acct-alert acct-alert-success" role="status">
              {notice}
            </p>
          )}

          {error && (
            <div ref={errorRef} tabIndex={-1} role="alert" className="acct-alert acct-alert-error">
              <p style={{ margin: 0 }}>{error.message}</p>
              {(error.code === "INVALID_CREDENTIALS" || error.code === "RATE_LIMITED" || error.code === "CUSTOMER_DISABLED") && (
                <p style={{ margin: "0.4rem 0 0" }}>
                  <Link href={forgotHref} className="acct-link">
                    Reset your password
                  </Link>
                  {error.code === "INVALID_CREDENTIALS" && (
                    <>
                      {" "}or{" "}
                      <Link href={signupHref} className="acct-link">
                        create an account
                      </Link>
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="acct-label">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              className="acct-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          <div>
            <PasswordField
              id="login-password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.4rem" }}>
              <Link href={forgotHref} className="acct-link" style={{ fontSize: "0.8rem", padding: "0.5rem 0" }}>
                Forgot password?
              </Link>
            </div>
          </div>

          <BusyButton type="submit" block busy={loading} busyLabel="Signing in…">
            Sign in
          </BusyButton>

          <p className="acct-muted" style={{ textAlign: "center" }}>
            Don&apos;t have an account?{" "}
            <Link href={signupHref} className="acct-link">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginForm />
    </Suspense>
  );
}
