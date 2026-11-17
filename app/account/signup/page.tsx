// app/account/signup/page.tsx
"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth, getStoredAuth } from "@/utils/hooks/useAuth";
import { PageLoader } from "@/components/ui/PageLoader";
import { BusyButton } from "../_components/BusyButton";
import { PasswordField } from "../_components/PasswordField";
import { withRedirect } from "../_lib/redirect";
import { isValidEmail, normalizeIndianMobile, passwordProblem } from "../_lib/validation";
import { clearStoredRedirect, destinationAfterSignIn, finishPendingWishlist, rememberSession } from "../_lib/clientSession";

type FieldErrors = Partial<Record<"email" | "password" | "confirm" | "phone", string>>;

function SignupForm() {
  const searchParams = useSearchParams();
  const { isAuthenticated, verified } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [verifyMessage, setVerifyMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hadStoredSession, setHadStoredSession] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const redirect = searchParams.get("redirect") || searchParams.get("returnUrl");

  useEffect(() => {
    // Browser storage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHadStoredSession(getStoredAuth().isAuthenticated);
  }, []);

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

  const setField = (field: keyof FieldErrors, message?: string) =>
    setFieldErrors((prev) => ({ ...prev, [field]: message }));

  const checkConfirm = () => {
    if (confirmPassword && confirmPassword !== password) setField("confirm", "The passwords don't match.");
    else setField("confirm", undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors: FieldErrors = {};
    if (!isValidEmail(email)) errors.email = "Please enter a valid email address.";
    const problem = passwordProblem(password);
    if (problem) errors.password = problem;
    if (password !== confirmPassword) errors.confirm = "The passwords don't match.";
    if (phone.trim() && !normalizeIndianMobile(phone)) errors.phone = "Please enter a 10-digit Indian mobile number, or leave it blank.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const first = errors.email ? "signup-email" : errors.phone ? "signup-phone" : errors.password ? "signup-password" : "signup-confirm";
      document.getElementById(first)?.focus();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email: email.trim(), password, phone: phone.trim(), acceptsMarketing }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError({ message: data.error || "We couldn't create your account. Please try again.", code: data.code });
        setLoading(false);
        return;
      }
      if (data.verifyEmail) {
        setVerifyMessage(data.message);
        setLoading(false);
        return;
      }

      rememberSession(data);
      await finishPendingWishlist();
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
          You&apos;re signed in. Taking you there…
        </p>
      </div>
    );
  }
  if (!verified && hadStoredSession) return <PageLoader label="Checking your session" />;

  const loginHref = withRedirect("/account/login", redirect);
  const loginWithEmail = `${loginHref}${loginHref.includes("?") ? "&" : "?"}email=${encodeURIComponent(email.trim())}`;

  if (verifyMessage) {
    return (
      <div className="acct-auth-page">
        <div className="acct-auth-card" style={{ textAlign: "center" }}>
          <h1 className="acct-auth-title">Check your email</h1>
          <p className="acct-auth-subtitle" role="status" style={{ margin: "1rem 0 1.5rem" }}>
            {verifyMessage}
          </p>
          <Link href={loginHref} className="acct-btn">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="acct-auth-page">
      <div className="acct-auth-card">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 className="acct-auth-title">Join Nomadica</h1>
          <p className="acct-auth-subtitle">Create your account to save favourites and track orders</p>
        </div>

        <form onSubmit={handleSubmit} className="acct-form" noValidate>
          {error && (
            <div ref={errorRef} tabIndex={-1} role="alert" className="acct-alert acct-alert-error">
              <p style={{ margin: 0 }}>{error.message}</p>
              {error.code === "EMAIL_TAKEN" && (
                <p style={{ margin: "0.4rem 0 0" }}>
                  <Link href={loginWithEmail} className="acct-link">
                    Sign in instead
                  </Link>{" "}
                  or{" "}
                  <Link href={`/account/forgot-password?email=${encodeURIComponent(email.trim())}`} className="acct-link">
                    reset your password
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className="acct-grid-2">
            <div>
              <label htmlFor="signup-first" className="acct-label">
                First name
              </label>
              <input
                id="signup-first"
                name="given-name"
                className="acct-input"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="signup-last" className="acct-label">
                Last name
              </label>
              <input
                id="signup-last"
                name="family-name"
                className="acct-input"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                required
                maxLength={100}
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-email" className="acct-label">
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              className="acct-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setField("email", email && !isValidEmail(email) ? "Please enter a valid email address." : undefined)}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="signup-email-error" className="acct-field-error">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="signup-phone" className="acct-label">
              Mobile number <span className="acct-label-optional">(optional)</span>
            </label>
            <input
              id="signup-phone"
              name="tel"
              type="tel"
              className="acct-input"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setField("phone", phone.trim() && !normalizeIndianMobile(phone) ? "Please enter a 10-digit Indian mobile number, or leave it blank." : undefined)}
              autoComplete="tel-national"
              inputMode="tel"
              maxLength={16}
              aria-invalid={fieldErrors.phone ? true : undefined}
              aria-describedby={fieldErrors.phone ? "signup-phone-error" : "signup-phone-hint"}
            />
            {fieldErrors.phone ? (
              <p id="signup-phone-error" className="acct-field-error">
                {fieldErrors.phone}
              </p>
            ) : (
              <p id="signup-phone-hint" className="acct-hint">
                For delivery updates about your orders.
              </p>
            )}
          </div>

          <PasswordField
            id="signup-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="Create a password"
            showRules
            error={fieldErrors.password}
          />

          <PasswordField
            id="signup-confirm"
            label="Confirm password"
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              if (fieldErrors.confirm && v === password) setField("confirm", undefined);
            }}
            onBlur={checkConfirm}
            autoComplete="new-password"
            placeholder="Type it again"
            error={fieldErrors.confirm}
          />

          <label className="acct-checkbox" htmlFor="signup-marketing">
            <input
              id="signup-marketing"
              type="checkbox"
              checked={acceptsMarketing}
              onChange={(e) => setAcceptsMarketing(e.target.checked)}
            />
            <span>Email me about new collections and offers. You can unsubscribe at any time.</span>
          </label>

          <BusyButton type="submit" block busy={loading} busyLabel="Creating account…">
            Create account
          </BusyButton>

          <p className="acct-muted" style={{ fontSize: "0.75rem", textAlign: "center" }}>
            By creating an account, you agree to our{" "}
            <Link href="/support/terms" className="acct-link">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/support/privacy-policy" className="acct-link">
              Privacy Policy
            </Link>
            .
          </p>

          <p className="acct-muted" style={{ textAlign: "center" }}>
            Already have an account?{" "}
            <Link href={loginHref} className="acct-link">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SignupForm />
    </Suspense>
  );
}
