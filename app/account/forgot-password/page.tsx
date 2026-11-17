// app/account/forgot-password/page.tsx
"use client";
import { useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
import { BusyButton } from "../_components/BusyButton";
import { isValidEmail } from "../_lib/validation";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "We couldn't send the reset email. Please try again.");
        requestAnimationFrame(() => errorRef.current?.focus());
      } else {
        setSent(data.message);
      }
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="acct-auth-page">
      <div className="acct-auth-card">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 className="acct-auth-title">Reset your password</h1>
          <p className="acct-auth-subtitle">Enter the email you signed up with and we&apos;ll email you a link to choose a new password.</p>
        </div>

        {sent ? (
          <div className="acct-form">
            <p className="acct-alert acct-alert-success" role="status">
              {sent}
            </p>
            <Link href={`/account/login?email=${encodeURIComponent(email.trim())}`} className="acct-btn acct-btn-block">
              Back to sign in
            </Link>
            <button type="button" className="acct-text-btn" onClick={() => setSent("")} style={{ alignSelf: "center" }}>
              Didn&apos;t get it? Send again
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="acct-form" noValidate>
            {error && (
              <p ref={errorRef} tabIndex={-1} role="alert" className="acct-alert acct-alert-error">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="forgot-email" className="acct-label">
                Email
              </label>
              <input
                id="forgot-email"
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
            <BusyButton type="submit" block busy={busy} busyLabel="Sending…">
              Email me a reset link
            </BusyButton>
            <p className="acct-muted" style={{ textAlign: "center" }}>
              Remembered it?{" "}
              <Link href="/account/login" className="acct-link">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
