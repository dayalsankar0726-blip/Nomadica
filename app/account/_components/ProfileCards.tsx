// app/account/_components/ProfileCards.tsx
"use client";
import { useState } from "react";
import { Edit, KeyRound } from "lucide-react";
import { SITE } from "@/lib/site";
import { Dialog } from "./Dialog";
import { BusyButton } from "./BusyButton";
import { PasswordField } from "./PasswordField";
import { requestJson, RequestError } from "../_lib/requestJson";
import { isValidEmail, mobileDigits, normalizeIndianMobile, passwordProblem } from "../_lib/validation";

export interface ProfileUser {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/** Updates the copy of the profile other parts of the site read, without reloading the page. */
function broadcastUser(user: ProfileUser) {
  try {
    const saved = JSON.parse(localStorage.getItem("nomadica_auth_user") || "{}");
    const next = { ...saved, ...user };
    localStorage.setItem("nomadica_auth_user", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: { isAuthenticated: true, user: next } }));
  } catch {}
}

type ProfileErrors = Partial<Record<"firstName" | "email" | "phone" | "currentPassword", string>>;

function EditProfileDialog({ user, onClose, onSaved }: { user: ProfileUser; onClose: () => void; onSaved: (user: ProfileUser) => void }) {
  const [form, setForm] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    phone: mobileDigits(user.phone),
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const emailChanged = form.email.trim().toLowerCase() !== (user.email || "").toLowerCase();

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: ProfileErrors = {};
    if (!form.firstName.trim()) found.firstName = "Please enter your first name.";
    if (!isValidEmail(form.email)) found.email = "Please enter a valid email address.";
    if (form.phone.trim() && !normalizeIndianMobile(form.phone)) found.phone = "Please enter a 10-digit Indian mobile number, or leave it blank.";
    if (emailChanged && !currentPassword) found.currentPassword = "Please enter your current password to change your email.";
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`profile-${first}`)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await requestJson<{ customerUpdate?: { customer?: ProfileUser } }>("/api/customers/profile", {
        method: "PUT",
        json: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email.trim(),
          phone: form.phone.trim(),
          ...(emailChanged ? { currentPassword } : {}),
        },
      });
      const saved = data.customerUpdate?.customer;
      onSaved({
        email: saved?.email || form.email.trim(),
        firstName: saved?.firstName ?? form.firstName,
        lastName: saved?.lastName ?? form.lastName,
        phone: saved?.phone ?? (normalizeIndianMobile(form.phone) || ""),
      });
    } catch (err) {
      if (err instanceof RequestError && err.field && ["firstName", "email", "phone", "currentPassword"].includes(err.field)) {
        setErrors({ [err.field]: err.message });
        document.getElementById(`profile-${err.field}`)?.focus();
      } else {
        setError(err instanceof Error ? err.message : "We couldn't save your profile.");
      }
      setBusy(false);
    }
  };

  const fieldA11y = (key: keyof ProfileErrors, hint?: string) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `profile-${key}-error` : hint,
  });

  return (
    <Dialog title="Edit profile" onClose={onClose} canClose={!busy} maxWidth={520}>
      <form onSubmit={submit} className="acct-form" noValidate>
        {error && (
          <p role="alert" className="acct-alert acct-alert-error">
            {error}
          </p>
        )}
        <div className="acct-grid-2">
          <div>
            <label htmlFor="profile-firstName" className="acct-label">
              First name
            </label>
            <input id="profile-firstName" className="acct-input acct-input-boxed" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" maxLength={100} required {...fieldA11y("firstName")} />
            {errors.firstName && <p id="profile-firstName-error" className="acct-field-error">{errors.firstName}</p>}
          </div>
          <div>
            <label htmlFor="profile-lastName" className="acct-label">
              Last name
            </label>
            <input id="profile-lastName" className="acct-input acct-input-boxed" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" maxLength={100} />
          </div>
        </div>
        <div>
          <label htmlFor="profile-email" className="acct-label">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            className="acct-input acct-input-boxed"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            {...fieldA11y("email", "profile-email-hint")}
          />
          {errors.email ? (
            <p id="profile-email-error" className="acct-field-error">{errors.email}</p>
          ) : (
            <p id="profile-email-hint" className="acct-hint">
              You sign in with this email, and order updates are sent to it.
            </p>
          )}
        </div>
        {emailChanged && (
          <div>
            <p className="acct-alert acct-alert-info" style={{ marginBottom: "0.75rem" }}>
              To keep your account safe, please confirm your current password to change your email. You&apos;ll sign in with the new email from now on.
            </p>
            <PasswordField id="profile-currentPassword" label="Current password" value={currentPassword} onChange={(v) => { setCurrentPassword(v); setErrors((e) => ({ ...e, currentPassword: undefined })); }} autoComplete="current-password" error={errors.currentPassword} boxed />
          </div>
        )}
        <div>
          <label htmlFor="profile-phone" className="acct-label">
            Mobile number <span className="acct-label-optional">(optional)</span>
          </label>
          <input
            id="profile-phone"
            type="tel"
            className="acct-input acct-input-boxed"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="10-digit mobile number"
            autoComplete="tel-national"
            inputMode="tel"
            maxLength={16}
            {...fieldA11y("phone")}
          />
          {errors.phone && <p id="profile-phone-error" className="acct-field-error">{errors.phone}</p>}
        </div>
        <div className="acct-dialog-actions">
          <button type="button" className="acct-btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <BusyButton type="submit" busy={busy} busyLabel="Saving…">
            Save changes
          </BusyButton>
        </div>
      </form>
    </Dialog>
  );
}

export function PersonalDetailsCard({ user, onUpdated }: { user: ProfileUser; onUpdated: (user: ProfileUser) => void }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const row = (label: string, value: string | undefined, fallback = "Not added") => (
    <div>
      <p className="acct-dt">{label}</p>
      <p className="acct-dd">{value?.trim() ? value : <span style={{ color: "rgba(30,30,30,0.7)", fontWeight: 400 }}>{fallback}</span>}</p>
    </div>
  );

  return (
    <section className="acct-card" aria-labelledby="details-heading">
      <div className="acct-card-header">
        <h2 id="details-heading" className="acct-card-title">
          Personal details
        </h2>
        <button type="button" className="acct-btn-outline acct-btn-small" onClick={() => { setSaved(false); setEditing(true); }}>
          <Edit size={14} aria-hidden="true" />
          Edit profile
        </button>
      </div>
      {saved && (
        <p role="status" className="acct-alert acct-alert-success" style={{ marginBottom: "1.25rem" }}>
          Your profile has been saved.
        </p>
      )}
      <div className="acct-grid-2" style={{ gap: "1.5rem" }}>
        {row("First name", user.firstName)}
        {row("Last name", user.lastName)}
        <div style={{ gridColumn: "1 / -1" }}>{row("Email", user.email)}</div>
        <div style={{ gridColumn: "1 / -1" }}>{row("Mobile number", user.phone)}</div>
      </div>
      {editing && (
        <EditProfileDialog
          user={user}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setEditing(false);
            setSaved(true);
            broadcastUser(next);
            onUpdated(next);
          }}
        />
      )}
    </section>
  );
}

function ChangePasswordDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"currentPassword" | "newPassword" | "confirm", string>>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!current) found.currentPassword = "Please enter your current password.";
    const problem = passwordProblem(next);
    if (problem) found.newPassword = problem;
    if (next !== confirm) found.confirm = "The passwords don't match.";
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`pw-${first}`)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await requestJson("/api/customers/password", { method: "POST", json: { currentPassword: current, newPassword: next } });
      // Shopify issues a new session token; drop the browser's old copy so the new cookie is used.
      localStorage.removeItem("nomadica_customer_token");
      localStorage.removeItem("customer_access_token");
      onDone();
    } catch (err) {
      if (err instanceof RequestError && (err.field === "currentPassword" || err.field === "newPassword")) {
        setErrors({ [err.field]: err.message });
        document.getElementById(`pw-${err.field}`)?.focus();
      } else {
        setError(err instanceof Error ? err.message : "We couldn't change your password.");
      }
      setBusy(false);
    }
  };

  return (
    <Dialog title="Change password" onClose={onClose} canClose={!busy} maxWidth={480}>
      <form onSubmit={submit} className="acct-form" noValidate>
        {error && (
          <p role="alert" className="acct-alert acct-alert-error">
            {error}
          </p>
        )}
        <PasswordField id="pw-currentPassword" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" error={errors.currentPassword} boxed />
        <PasswordField id="pw-newPassword" label="New password" value={next} onChange={setNext} autoComplete="new-password" showRules error={errors.newPassword} boxed />
        <PasswordField
          id="pw-confirm"
          label="Confirm new password"
          value={confirm}
          onChange={(v) => { setConfirm(v); if (errors.confirm && v === next) setErrors((e) => ({ ...e, confirm: undefined })); }}
          onBlur={() => setErrors((e) => ({ ...e, confirm: confirm && confirm !== next ? "The passwords don't match." : undefined }))}
          autoComplete="new-password"
          error={errors.confirm}
          boxed
        />
        <p className="acct-hint" style={{ margin: 0 }}>
          You&apos;ll stay signed in here. Other devices will be signed out.
        </p>
        <div className="acct-dialog-actions">
          <button type="button" className="acct-btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <BusyButton type="submit" busy={busy} busyLabel="Saving…">
            Change password
          </BusyButton>
        </div>
      </form>
    </Dialog>
  );
}

export function SecurityCard({ email }: { email: string }) {
  const [changing, setChanging] = useState(false);
  const [done, setDone] = useState(false);
  const subject = encodeURIComponent("Account deletion request");
  const body = encodeURIComponent(
    `Hello ${SITE.name} team,\n\nPlease delete my account and the personal data linked to it.\n\nAccount email: ${email}\n\nThank you.`
  );

  return (
    <section className="acct-card" aria-labelledby="security-heading">
      <div className="acct-card-header">
        <h2 id="security-heading" className="acct-card-title">
          Security and privacy
        </h2>
      </div>
      {done && (
        <p role="status" className="acct-alert acct-alert-success" style={{ marginBottom: "1.25rem" }}>
          Your password has been changed.
        </p>
      )}
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <div>
          <p className="acct-dt">Password</p>
          <button type="button" className="acct-btn-outline acct-btn-small" onClick={() => { setDone(false); setChanging(true); }}>
            <KeyRound size={14} aria-hidden="true" />
            Change password
          </button>
        </div>
        <div>
          <p className="acct-dt">Your data</p>
          <p className="acct-muted" style={{ marginBottom: "0.5rem" }}>
            To get a copy of your data or to delete your account, email us and we&apos;ll reply within {SITE.supportResponse}.
          </p>
          <a href={`mailto:${SITE.supportEmail}?subject=${subject}&body=${body}`} className="acct-link" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.85rem" }}>
            Request account deletion
          </a>
        </div>
      </div>
      {changing && (
        <ChangePasswordDialog
          onClose={() => setChanging(false)}
          onDone={() => {
            setChanging(false);
            setDone(true);
          }}
        />
      )}
    </section>
  );
}
