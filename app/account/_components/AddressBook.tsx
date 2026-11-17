// app/account/_components/AddressBook.tsx
"use client";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { Dialog } from "./Dialog";
import { BusyButton } from "./BusyButton";
import { requestJson } from "../_lib/requestJson";
import { isValidPin, mobileDigits, normalizeIndianMobile } from "../_lib/validation";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export interface Address {
  id: string;
  name: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  phone?: string;
  country?: string;
  default?: boolean;
}

type FormState = Omit<Address, "id" | "default"> & { id?: string; default: boolean };
type FormErrors = Partial<Record<"name" | "phone" | "address1" | "city" | "province" | "zip", string>>;

const EMPTY: FormState = { name: "", address1: "", address2: "", city: "", province: "", zip: "", phone: "", default: false };

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Please enter the full name.";
  if (!normalizeIndianMobile(form.phone || "")) errors.phone = "Please enter a 10-digit mobile number.";
  if (!form.address1.trim()) errors.address1 = "Please enter the house number, building and street.";
  if (!form.city.trim()) errors.city = "Please enter the city.";
  if (!form.province) errors.province = "Please choose the state.";
  if (!isValidPin(form.zip)) errors.zip = "Please enter a 6-digit PIN code.";
  return errors;
}

function Field({
  id,
  label,
  error,
  hint,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="acct-label">
        {label} {optional && <span className="acct-label-optional">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="acct-field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="acct-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function AddressDialog({ initial, onClose, onSaved }: { initial: FormState; onClose: () => void; onSaved: (list: Address[] | null) => void }) {
  const editing = !!initial.id;
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof FormState, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const a11y = (key: keyof FormErrors, hint?: boolean) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `addr-${key}-error` : hint ? `addr-${key}-hint` : undefined,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`addr-${first}`)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = { ...form, phone: normalizeIndianMobile(form.phone || "") };
      const data = await requestJson<{ addresses?: Address[] }>("/api/customers/addresses", { method: editing ? "PUT" : "POST", json: body });
      onSaved(data.addresses ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save this address.");
      setBusy(false);
    }
  };

  return (
    <Dialog title={editing ? "Edit address" : "Add a new address"} onClose={onClose} canClose={!busy}>
      <form onSubmit={submit} className="acct-form" noValidate>
        {error && (
          <p role="alert" className="acct-alert acct-alert-error">
            {error}
          </p>
        )}
        <div className="acct-grid-2">
          <Field id="addr-name" label="Full name" error={errors.name}>
            <input id="addr-name" className="acct-input acct-input-boxed" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="shipping name" required maxLength={100} {...a11y("name")} />
          </Field>
          <Field id="addr-phone" label="Mobile number" error={errors.phone} hint="For the courier to reach you.">
            <input
              id="addr-phone"
              type="tel"
              className="acct-input acct-input-boxed"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="10-digit number"
              autoComplete="shipping tel-national"
              inputMode="tel"
              maxLength={16}
              required
              {...a11y("phone", true)}
            />
          </Field>
        </div>
        <Field id="addr-address1" label="Address line 1" error={errors.address1}>
          <input id="addr-address1" className="acct-input acct-input-boxed" value={form.address1} onChange={(e) => set("address1", e.target.value)} placeholder="House no, building, street" autoComplete="shipping address-line1" required maxLength={200} {...a11y("address1")} />
        </Field>
        <Field id="addr-address2" label="Address line 2" optional>
          <input id="addr-address2" className="acct-input acct-input-boxed" value={form.address2} onChange={(e) => set("address2", e.target.value)} placeholder="Landmark, area" autoComplete="shipping address-line2" maxLength={200} />
        </Field>
        <div className="acct-grid-3">
          <Field id="addr-city" label="City" error={errors.city}>
            <input id="addr-city" className="acct-input acct-input-boxed" value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="shipping address-level2" required maxLength={100} {...a11y("city")} />
          </Field>
          <Field id="addr-province" label="State" error={errors.province}>
            <select id="addr-province" className="acct-input acct-input-boxed" value={form.province} onChange={(e) => set("province", e.target.value)} autoComplete="shipping address-level1" required {...a11y("province")}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </Field>
          <Field id="addr-zip" label="PIN code" error={errors.zip}>
            <input
              id="addr-zip"
              className="acct-input acct-input-boxed"
              value={form.zip}
              onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              pattern="[1-9][0-9]{5}"
              maxLength={6}
              autoComplete="shipping postal-code"
              required
              {...a11y("zip")}
            />
          </Field>
        </div>
        {!initial.default && (
          <label className="acct-checkbox" htmlFor="addr-default">
            <input id="addr-default" type="checkbox" checked={form.default} onChange={(e) => set("default", e.target.checked)} />
            <span>Make this my default address</span>
          </label>
        )}
        <div className="acct-dialog-actions">
          <button type="button" className="acct-btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <BusyButton type="submit" busy={busy} busyLabel="Saving…">
            {editing ? "Save changes" : "Save address"}
          </BusyButton>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteDialog({ address, onClose, onDeleted }: { address: Address; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await requestJson("/api/customers/addresses", { method: "DELETE", json: { id: address.id } });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't delete this address.");
      setBusy(false);
    }
  };
  return (
    <Dialog title="Delete this address?" onClose={onClose} canClose={!busy} maxWidth={460}>
      <p className="acct-muted" style={{ color: "#1E1E1E" }}>
        {[address.name, address.address1, address.city, address.zip].filter(Boolean).join(", ")}
      </p>
      {error && (
        <p role="alert" className="acct-alert acct-alert-error" style={{ marginTop: "1rem" }}>
          {error}
        </p>
      )}
      <div className="acct-dialog-actions">
        <button type="button" className="acct-btn-outline" onClick={onClose} disabled={busy}>
          Keep it
        </button>
        <BusyButton variant="danger" busy={busy} busyLabel="Deleting…" onClick={remove}>
          Delete address
        </BusyButton>
      </div>
    </Dialog>
  );
}

/** Saved addresses with add, edit, delete and set-default. */
export const AddressBook = forwardRef<HTMLHeadingElement>(function AddressBook(_props, headingRef) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [defaultBusy, setDefaultBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await requestJson<{ addresses?: Address[] }>("/api/customers/addresses");
      setAddresses(data.addresses || []);
      setState("ready");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "We couldn't load your addresses.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    // Loading data from the server on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const makeDefault = async (addr: Address) => {
    setDefaultBusy(addr.id);
    setNotice(null);
    try {
      await requestJson("/api/customers/addresses", { method: "PUT", json: { id: addr.id, default: true, defaultOnly: true } });
      await load();
      setNotice({ kind: "success", text: "Default address updated." });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "We couldn't change your default address." });
    } finally {
      setDefaultBusy(null);
    }
  };

  const openAdd = () => setEditing({ ...EMPTY, default: addresses.length === 0 });
  const openEdit = (addr: Address) =>
    setEditing({
      id: addr.id,
      name: addr.name || "",
      address1: addr.address1 || "",
      address2: addr.address2 || "",
      city: addr.city || "",
      province: addr.province || "",
      zip: addr.zip || "",
      phone: mobileDigits(addr.phone),
      default: !!addr.default,
    });

  return (
    <section className="acct-card" aria-labelledby="addresses-heading" id="addresses">
      <div className="acct-card-header">
        <h2 id="addresses-heading" ref={headingRef} tabIndex={-1} className="acct-card-title" style={{ outline: "none" }}>
          Addresses
        </h2>
        <button type="button" className="acct-btn-outline acct-btn-small" onClick={openAdd} disabled={state !== "ready"}>
          <Plus size={14} aria-hidden="true" />
          Add address
        </button>
      </div>

      {notice && (
        <p role={notice.kind === "error" ? "alert" : "status"} className={`acct-alert acct-alert-${notice.kind}`} style={{ marginBottom: "1rem" }}>
          {notice.text}
        </p>
      )}

      {state === "loading" ? (
        <PageLoader label="Loading addresses" />
      ) : state === "error" ? (
        <div role="alert" className="acct-alert acct-alert-error">
          <p style={{ margin: "0 0 0.5rem" }}>{loadError}</p>
          <button
            type="button"
            className="acct-text-btn"
            onClick={() => {
              setState("loading");
              load();
            }}
          >
            Try again
          </button>
        </div>
      ) : addresses.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2.5rem 1rem", border: "1px dashed rgba(0,0,0,0.15)", borderRadius: "6px", textAlign: "center" }}>
          <MapPin size={32} aria-hidden="true" style={{ color: "rgba(0,0,0,0.3)", marginBottom: "1rem" }} />
          <p className="acct-muted" style={{ marginBottom: "0.5rem" }}>
            No saved addresses yet.
          </p>
          <button type="button" className="acct-text-btn" onClick={openAdd}>
            Add your first address
          </button>
        </div>
      ) : (
        <ul style={{ display: "grid", gap: "1rem", listStyle: "none", padding: 0, margin: 0 }}>
          {addresses.map((addr) => (
            <li
              key={addr.id}
              style={{ padding: "1.25rem", border: addr.default ? "1px solid #1E1E1E" : "1px solid rgba(0,0,0,0.12)", borderRadius: "6px", position: "relative" }}
            >
              {addr.default && (
                <span style={{ position: "absolute", top: "0.75rem", right: "0.75rem", fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", backgroundColor: "#1E1E1E", color: "#FFFFFF", padding: "0.2rem 0.5rem", borderRadius: "2px" }}>
                  Default
                </span>
              )}
              {addr.name && (
                <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.25rem", paddingRight: addr.default ? "5rem" : 0 }}>{addr.name}</p>
              )}
              <p className="acct-muted">
                {[addr.address1, addr.address2].filter(Boolean).join(", ")}
                <br />
                {[addr.city, addr.province].filter(Boolean).join(", ")} {addr.zip}
              </p>
              {addr.phone ? (
                <p className="acct-muted">Phone: {addr.phone}</p>
              ) : (
                <p className="acct-muted" style={{ color: "#92400E" }}>
                  No mobile number. Edit to add one for delivery.
                </p>
              )}
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <button type="button" className="acct-btn-outline acct-btn-small" onClick={() => openEdit(addr)} aria-label={`Edit address for ${addr.name || addr.address1}`}>
                  Edit
                </button>
                <button type="button" className="acct-btn-outline acct-btn-small" style={{ color: "#B91C1C" }} onClick={() => setDeleting(addr)} aria-label={`Delete address for ${addr.name || addr.address1}`}>
                  Delete
                </button>
                {!addr.default && (
                  <BusyButton variant="outline" small busy={defaultBusy === addr.id} busyLabel="Saving…" disabled={!!defaultBusy} onClick={() => makeDefault(addr)} style={{ marginLeft: "auto" }}>
                    Set as default
                  </BusyButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AddressDialog
          // A fresh form each time the dialog opens, so a closed edit never leaks into "Add".
          key={editing.id || "new"}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={async (list) => {
            const wasEditing = !!editing.id;
            setEditing(null);
            if (list) setAddresses(list);
            else await load();
            setNotice({ kind: "success", text: wasEditing ? "Address updated." : "Address saved." });
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          address={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={async () => {
            setDeleting(null);
            await load();
            setNotice({ kind: "success", text: "Address deleted." });
          }}
        />
      )}
    </section>
  );
});
