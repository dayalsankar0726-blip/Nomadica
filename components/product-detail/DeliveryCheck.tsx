"use client";
import { useId, useState } from "react";
import { Truck } from "lucide-react";
import { deliveryEstimate, isValidPincode } from "@/lib/products/delivery";
import { POLICY } from "@/lib/site";
import { formatINR } from "@/lib/pricing";
import { COLORS, FONTS, RADIUS } from "@/components/shop/tokens";

/**
 * PIN code check. There is no courier serviceability lookup, so this only checks the PIN
 * format and shows the store's standard estimate from POLICY. Cash on delivery is offered
 * at checkout for every Indian address.
 */
export function DeliveryCheck() {
  const inputId = useId();
  const resultId = useId();
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<{ ok: boolean; pin: string } | null>(null);
  const estimate = deliveryEstimate();

  return (
    <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.card, padding: "1rem", marginBottom: "1.5rem", backgroundColor: COLORS.surface }}>
      <label htmlFor={inputId} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: FONTS.sans, fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.charcoal, marginBottom: "0.625rem" }}>
        <Truck size={16} aria-hidden="true" />
        Check delivery
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setResult({ ok: isValidPincode(pin), pin: pin.trim() });
        }}
        style={{ display: "flex", gap: "0.5rem" }}
      >
        <input
          id={inputId}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder="Enter 6-digit PIN code"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
            setResult(null);
          }}
          aria-describedby={result ? resultId : undefined}
          aria-invalid={result ? !result.ok : undefined}
          className="pd-input"
          style={{ flex: 1, minWidth: 0, height: 44, padding: "0 0.875rem", border: `1px solid ${result && !result.ok ? COLORS.error : COLORS.border}`, borderRadius: RADIUS.control, fontFamily: FONTS.sans, fontSize: "0.9375rem", color: COLORS.charcoal }}
        />
        <button
          type="submit"
          className="pd-focus"
          style={{ height: 44, padding: "0 1.25rem", backgroundColor: COLORS.brown, color: "#FFFFFF", border: "none", borderRadius: RADIUS.control, fontFamily: FONTS.sans, fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer" }}
        >
          Check
        </button>
      </form>
      <div id={resultId} role="status" aria-live="polite" style={{ fontFamily: FONTS.sans, fontSize: "0.8125rem", lineHeight: 1.6, marginTop: result ? "0.75rem" : 0 }}>
        {result && !result.ok && <p style={{ color: COLORS.error, margin: 0 }}>Please enter a valid 6-digit PIN code.</p>}
        {result?.ok && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, color: COLORS.charcoal }}>
            <li>
              Delivery to {result.pin}: usually {estimate.total ?? `${POLICY.processingDays} + ${POLICY.deliveryDays} business days`} after you order.
            </li>
            <li style={{ color: COLORS.muted }}>{estimate.detail}</li>
            <li>Cash on delivery available.</li>
            <li style={{ color: COLORS.muted }}>
              Free shipping on orders of {formatINR(POLICY.freeShippingThreshold)} or more; {formatINR(POLICY.shippingFee)} below that.
            </li>
          </ul>
        )}
      </div>
      <style>{`.pd-input:focus{outline:none;border-color:${COLORS.brown};box-shadow:0 0 0 3px rgba(107,78,55,0.25);}`}</style>
    </div>
  );
}
