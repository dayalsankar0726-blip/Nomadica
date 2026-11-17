// components/orders/CancelOrderDialog.tsx
"use client";
import { useRef, useState, type CSSProperties } from "react";
import { Minus, Plus, X } from "lucide-react";
import { CANCEL_NOTE_MAX, CANCEL_REASONS } from "@/lib/orders/cancellation";
import { formatINR } from "@/lib/pricing";
import { POLICY } from "@/lib/site";
import { useModalDialog } from "./useModalDialog";

export interface CancelDialogOrder {
  id: string;
  orderNumber: string;
  total: number;
  isPrepaid: boolean;
  /** Set when editing a single item (lowering its quantity or removing it) rather than cancelling the order. */
  item?: {
    id: string;
    title: string;
    /** How many are still on the order. */
    quantity: number;
    /** Price paid for one, after discounts. */
    unitPrice: number;
    image?: string;
    /** e.g. "Size M · Colour Black" */
    details?: string;
    /** True when this is everything left on the order, so the whole order will be cancelled. */
    isLastItem: boolean;
  };
}

interface Props {
  order: CancelDialogOrder;
  onClose: () => void;
  /**
   * Sends the request; throws with a customer-facing message on failure.
   * For an item, `quantity` is how many to remove (0 for a whole-order cancel).
   */
  onConfirm: (reason: string, note: string, quantity: number) => Promise<void>;
}

const font = "'Montserrat', sans-serif";

const formatRupees = (n: number) => formatINR(n);

const linkButton = (color: string): CSSProperties => ({
  background: "none",
  border: "none",
  padding: "0.4rem 0",
  minHeight: 32,
  fontFamily: font,
  fontSize: "0.75rem",
  fontWeight: 600,
  color,
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
});

const stepperButton = (disabled: boolean): CSSProperties => ({
  width: 40,
  height: 40,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  border: "none",
  backgroundColor: disabled ? "transparent" : "#F3EEE7",
  color: disabled ? "rgba(30,30,30,0.25)" : "#6B4E37",
  cursor: disabled ? "default" : "pointer",
  transition: "background-color 0.15s",
});

export function CancelOrderDialog({ order, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const item = order.item;
  // The quantity the customer wants to keep. Only lowering is allowed here.
  const [keep, setKeep] = useState(item?.quantity ?? 0);
  const removing = item ? item.quantity - keep : 0;
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus stays inside, Escape closes (unless a request is running), the page behind
  // doesn't scroll, and focus returns to the button that opened the dialog.
  useModalDialog(dialogRef, { onClose, canClose: !busy });

  const submit = async () => {
    if (item && removing === 0) return;
    if (!reason) {
      setError("Please choose a reason.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onConfirm(reason, note, removing);
    } catch (err) {
      setError(err instanceof Error ? err.message : item ? "Could not update this item. Please try again." : "Could not cancel this order. Please try again.");
      setBusy(false);
    }
  };

  // Removing everything that's left cancels the whole order (shipping included).
  const wholeOrder = !item || (item.isLastItem && keep === 0);
  const refundTotal = wholeOrder ? order.total : Math.round(item!.unitPrice * removing * 100) / 100;
  const unchanged = !!item && removing === 0;
  const destructive = !item || keep === 0;
  const confirmLabel = busy
    ? item ? "Saving…" : "Cancelling…"
    : wholeOrder ? "Cancel order" : keep === 0 ? "Remove item" : "Save changes";
  const amount = formatRupees(refundTotal);

  return (
    // Clicking outside does nothing, so a chosen reason or typed note isn't lost.
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
        tabIndex={-1}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "460px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.75rem",
          boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
          <h2 id="cancel-order-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600, margin: 0, color: "#1E1E1E" }}>
            {item ? "Edit item" : `Cancel order ${order.orderNumber}?`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: busy ? "default" : "pointer", width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", color: "rgba(30,30,30,0.75)", flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {item && (
          <div
            style={{
              border: "1px solid rgba(196,181,160,0.35)",
              backgroundColor: "#FAF8F5",
              borderRadius: "12px",
              margin: "0 0 1.25rem",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", gap: "0.9rem", alignItems: "center", padding: "0.9rem" }}>
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt=""
                  style={{ width: 56, height: 72, objectFit: "cover", borderRadius: "8px", flexShrink: 0, backgroundColor: "#EFEAE3" }}
                />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.2rem" }}>
                  {item.title}
                </p>
                {item.details && (
                  <p style={{ fontFamily: font, fontSize: "0.75rem", color: "rgba(30,30,30,0.7)", margin: "0 0 0.2rem" }}>{item.details}</p>
                )}
                <p style={{ fontFamily: font, fontSize: "0.75rem", color: "rgba(30,30,30,0.7)", margin: "0 0 0.2rem" }}>
                  {formatRupees(item.unitPrice)} each
                </p>
                <p style={{ fontFamily: font, fontSize: "0.75rem", color: "rgba(30,30,30,0.7)", margin: 0, letterSpacing: "0.02em" }}>
                  Order {order.orderNumber}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "0.75rem 0.9rem",
                borderTop: "1px solid rgba(196,181,160,0.3)",
                backgroundColor: "#FFFFFF",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span id="edit-qty-label" style={{ display: "block", fontFamily: font, fontSize: "0.8rem", fontWeight: 600, color: "#1E1E1E" }}>
                  Quantity
                </span>
                {keep === 0 ? (
                  <button
                    type="button"
                    onClick={() => setKeep(item.quantity)}
                    disabled={busy}
                    style={linkButton("#6B4E37")}
                  >
                    Undo remove
                  </button>
                ) : (
                  <button type="button" onClick={() => setKeep(0)} disabled={busy} style={linkButton("#B91C1C")}>
                    Remove item
                  </button>
                )}
              </div>
              <div
                role="group"
                aria-labelledby="edit-qty-label"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  flexShrink: 0,
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: "999px",
                  padding: "2px",
                }}
              >
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setKeep((q) => Math.max(0, q - 1))}
                  disabled={busy || keep <= 0}
                  style={stepperButton(busy || keep <= 0)}
                >
                  <Minus size={14} />
                </button>
                <span
                  aria-live="polite"
                  style={{ minWidth: "2rem", textAlign: "center", fontFamily: font, fontSize: "0.9rem", fontWeight: 600, color: keep === 0 ? "#B91C1C" : "#1E1E1E" }}
                >
                  {keep}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  title={keep >= item.quantity ? "You can't add more to a placed order" : undefined}
                  onClick={() => setKeep((q) => Math.min(item.quantity, q + 1))}
                  disabled={busy || keep >= item.quantity}
                  style={stepperButton(busy || keep >= item.quantity)}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        <p style={{ fontFamily: font, fontSize: "0.85rem", lineHeight: 1.6, color: "rgba(30,30,30,0.75)", margin: "0 0 1.25rem" }}>
          {unchanged ? (
            "Lower the quantity or remove this item. To add more, please place a new order."
          ) : (
            <>
          {item && wholeOrder && "This is the last item in your order, so the whole order will be cancelled. "}
          {item && !wholeOrder && keep > 0 && `You'll receive ${keep} instead of ${item.quantity}. `}
          {item && !wholeOrder && keep === 0 && "This item will be removed. The rest of your order will still be delivered. "}
          {order.isPrepaid
            ? `You paid online, so we will refund ${amount} to your original payment method. Refunds usually arrive within ${POLICY.refundDays} working days.${item && !wholeOrder ? " The shipping charge is refunded only if the whole order is cancelled." : ""}`
            : item && !wholeOrder
              ? `This is a cash-on-delivery order, so you will pay ${amount} less on delivery.`
              : "This is a cash-on-delivery order, so there is nothing to pay or refund."}
            </>
          )}
        </p>

        <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
          <legend style={{ fontFamily: font, fontSize: "0.8rem", fontWeight: 600, color: "#1E1E1E", marginBottom: "0.6rem" }}>
            {item ? "Why are you changing it?" : "Why are you cancelling?"}
          </legend>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {CANCEL_REASONS.map((r) => (
              <label
                key={r.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 0.75rem",
                  border: `1px solid ${reason === r.value ? "#C4B5A0" : "rgba(0,0,0,0.1)"}`,
                  backgroundColor: reason === r.value ? "rgba(196,181,160,0.08)" : "transparent",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: font,
                  fontSize: "0.85rem",
                  color: "#1E1E1E",
                }}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => {
                    setReason(r.value);
                    setError("");
                  }}
                  disabled={busy}
                  style={{ accentColor: "#6B4E37" }}
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label style={{ display: "block", fontFamily: font, fontSize: "0.8rem", fontWeight: 600, color: "#1E1E1E", marginBottom: "0.4rem" }}>
          Anything else we should know? <span style={{ fontWeight: 400, color: "rgba(30,30,30,0.7)" }}>(optional)</span>
          <textarea
            value={note}
            maxLength={CANCEL_NOTE_MAX}
            aria-describedby="cancel-note-count"
            onChange={(e) => setNote(e.target.value.slice(0, CANCEL_NOTE_MAX))}
            disabled={busy}
            rows={3}
            style={{
              display: "block",
              width: "100%",
              marginTop: "0.4rem",
              padding: "0.6rem 0.75rem",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: "4px",
              fontFamily: font,
              fontSize: "0.85rem",
              fontWeight: 400,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </label>
        <p id="cancel-note-count" style={{ fontFamily: font, fontSize: "0.75rem", color: "rgba(30,30,30,0.7)", margin: 0, textAlign: "right" }}>
          {note.length}/{CANCEL_NOTE_MAX} characters
        </p>

        {error && (
          <p role="alert" style={{ fontFamily: font, fontSize: "0.8rem", color: "rgb(180,60,60)", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: "0.65rem 1.25rem",
              minHeight: 44,
              backgroundColor: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: "4px",
              fontFamily: font,
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#1E1E1E",
              cursor: busy ? "default" : "pointer",
            }}
          >
            {item ? "Keep as is" : "Keep order"}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || unchanged}
            style={{
              padding: "0.65rem 1.25rem",
              minHeight: 44,
              backgroundColor: destructive ? "#B91C1C" : "#6B4E37",
              opacity: busy || unchanged ? 0.5 : 1,
              border: "none",
              borderRadius: "4px",
              fontFamily: font,
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#FFFFFF",
              cursor: busy || unchanged ? "default" : "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
