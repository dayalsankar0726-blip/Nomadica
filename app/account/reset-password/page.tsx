// app/account/reset-password/page.tsx
//
// Opened from the link in Shopify's password reset email:
//   /account/reset-password?url=<Shopify reset URL>
// (The store's reset email template must link here; see app/api/auth/reset/route.ts.)
"use client";
import { useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
import { BusyButton } from "../_components/BusyButton";
import { PasswordField } from "../_components/PasswordField";
import { passwordProblem } from "../_lib/validation";
import { isShopifyResetUrl } from "../_lib/resetUrl";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const resetUrl = searchParams.get("url") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [error, setError] = useState<{ message: string; invalidLink?: boolean } | null>(
    isShopifyResetUrl(resetUrl) ? null : { message: "This reset link is not valid or is incomplete.", invalidLink: true }
  );
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) {
      setError({ message: problem });
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    if (password !== confirm) {
      setConfirmError("The passwords don't match.");
      document.getElementById("reset-confirm")?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetUrl, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: data.error || "We couldn't reset your password.", invalidLink: data.code === "INVALID_LINK" });
        setBusy(false);
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      if (data.signedIn) {
        // Signed in with the new password. Load the account so every part of the site picks up the session.
        // Old tokens stop working after a reset, so drop any copy kept in the browser.
        localStorage.removeItem("nomadica_logged_out");
        localStorage.removeItem("nomadica_customer_token");
        localStorage.removeItem("customer_access_token");
        // A full page load so every part of the site picks up the new session.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/account/profile?passwordReset=1");
      } else {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/account/login?reset=1");
      }
    } catch {
      setError({ message: "We couldn't reach the server. Please check your connection and try again." });
      setBusy(false);
    }
  };

  const linkBroken = !!error?.invalidLink;

  return (
    <div className="acct-auth-page">
      <div className="acct-auth-card">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 className="acct-auth-title">Choose a new password</h1>
          {!linkBroken && <p className="acct-auth-subtitle">Pick a password you don&apos;t use on other sites.</p>}
        </div>

        <form onSubmit={submit} className="acct-form" noValidate>
          {error && (
            <div ref={errorRef} tabIndex={-1} role="alert" className="acct-alert acct-alert-error">
              <p style={{ margin: 0 }}>{error.message}</p>
              {error.invalidLink && (
                <p style={{ margin: "0.4rem 0 0" }}>
                  <Link href="/account/forgot-password" className="acct-link">
                    Request a new reset link
                  </Link>
                </p>
              )}
            </div>
          )}

          {!linkBroken && (
            <>
              <PasswordField id="reset-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" showRules />
              <PasswordField
                id="reset-confirm"
                label="Confirm new password"
                value={confirm}
                onChange={(v) => {
                  setConfirm(v);
                  if (confirmError && v === password) setConfirmError("");
                }}
                onBlur={() => setConfirmError(confirm && confirm !== password ? "The passwords don't match." : "")}
                autoComplete="new-password"
                error={confirmError}
              />
              <BusyButton type="submit" block busy={busy} busyLabel="Saving…">
                Save new password
              </BusyButton>
            </>
          )}

          <p className="acct-muted" style={{ textAlign: "center" }}>
            <Link href="/account/login" className="acct-link">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
