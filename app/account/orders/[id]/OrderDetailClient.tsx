// app/account/orders/[id]/OrderDetailClient.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { CancelOrderDialog, type CancelDialogOrder } from "@/components/orders/CancelOrderDialog";
import type { CustomerOrderDetail } from "@/lib/shopify/customerOrders";
import { formatINR } from "@/lib/pricing";
import { POLICY, SITE } from "@/lib/site";
import { AccountShell } from "../../_components/AccountShell";
import { BusyButton } from "../../_components/BusyButton";
import { OrderItemImage, StatusBadge } from "../../_components/OrderBits";
import { useRequireAuth } from "../../_components/useRequireAuth";
import { requestJson, RequestError } from "../../_lib/requestJson";
import { buyAgainLines, formatDate, returnMailto, variantParts } from "../../_lib/orders";
import { canRequestReturn, orderStatus, paymentLabel, timelineSteps, unitsRemaining } from "../../_lib/orderStatus";
import { addLinesToBag } from "../../_lib/buyAgain";

const h2: React.CSSProperties = { fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 1rem" };

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontFamily: "'Montserrat', sans-serif", fontSize: strong ? "1rem" : "0.875rem", fontWeight: strong ? 700 : 400, color: "#1E1E1E", padding: "0.35rem 0" }}>
      <dt>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </div>
  );
}

export default function OrderDetailClient({ number }: { number: string }) {
  const { isAuthenticated, verified } = useRequireAuth();
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [sampleStatus, setSampleStatus] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [cancelTarget, setCancelTarget] = useState<CancelDialogOrder | null>(null);
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const [bagMessage, setBagMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!number) {
      setState("missing");
      return;
    }
    try {
      const data = await requestJson<{ order: CustomerOrderDetail; sampleStatus?: string }>(`/api/customers/orders/${encodeURIComponent(number)}`);
      setOrder(data.order);
      setSampleStatus(data.sampleStatus || null);
      setState("ready");
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) setState("missing");
      else {
        setLoadError(err instanceof Error ? err.message : "We couldn't load this order.");
        setState("error");
      }
    }
  }, [number]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Loading data from the server once signed in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [isAuthenticated, load]);

  if (!isAuthenticated) return <PageLoader label={verified ? "Taking you to sign in" : "Loading your order"} />;

  const back = (
    <Link href="/account/orders" className="acct-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontFamily: "'Montserrat', sans-serif", fontSize: "0.85rem", marginBottom: "1.5rem", minHeight: 40 }}>
      <ArrowLeft size={16} aria-hidden="true" />
      All orders
    </Link>
  );

  if (state === "loading") {
    return (
      <AccountShell title="Order details">
        {back}
        <PageLoader label="Loading your order" />
      </AccountShell>
    );
  }
  if (state === "missing" || state === "error" || !order) {
    return (
      <AccountShell title="Order details">
        {back}
        <div className="acct-card" role="alert" style={{ textAlign: "center" }}>
          <p className="acct-muted" style={{ marginBottom: "1rem", color: "#1E1E1E" }}>
            {state === "missing" ? "We couldn't find this order in your account." : loadError}
          </p>
          {state === "error" ? (
            <button type="button" className="acct-btn" onClick={() => { setState("loading"); load(); }}>
              Try again
            </button>
          ) : (
            <Link href="/account/orders" className="acct-btn">
              See your orders
            </Link>
          )}
        </div>
      </AccountShell>
    );
  }

  const status = orderStatus({
    cancelledAt: order.cancelledAt,
    fulfillmentStatus: order.fulfillmentStatus,
    financialStatus: order.financialStatus,
    delivered: sampleStatus === "Delivered",
  });
  const steps = timelineSteps(status.stage);
  const units = unitsRemaining(order.lineItems);
  const payment = paymentLabel(order.financialStatus);
  const lines = buyAgainLines(order.lineItems);
  const discount = parseFloat(order.discount);
  const refunded = parseFloat(order.refunded);
  const total = parseFloat(order.total);
  const address = order.shippingAddress;

  const buyAgain = async () => {
    setAdding(true);
    setBagMessage(null);
    try {
      await addLinesToBag(lines);
      setBagMessage({ kind: "success", text: "Added to your bag." });
    } catch (err) {
      setBagMessage({ kind: "error", text: err instanceof Error ? err.message : "We couldn't add these items to your bag." });
    } finally {
      setAdding(false);
    }
  };

  const handleCancel = async (reason: string, note: string, quantity: number) => {
    if (!cancelTarget) return;
    const { item } = cancelTarget;
    const result = item
      ? await requestJson<{ message?: string }>(`/api/orders/${encodeURIComponent(cancelTarget.id)}/items/cancel`, { method: "POST", json: { itemId: item.id, quantity, reason, note } })
      : await requestJson<{ message?: string }>(`/api/orders/${encodeURIComponent(cancelTarget.id)}/cancel`, { method: "POST", json: { reason, note } });
    setCancelTarget(null);
    setNotice(result.message || "Your order has been updated.");
    await load();
  };

  return (
    <AccountShell title={`Order ${order.orderNumber}`}>
      {back}

      {notice && (
        <p role="status" className="acct-alert acct-alert-success" style={{ marginBottom: "1.5rem" }}>
          {notice}
        </p>
      )}

      <div className="acct-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <section className="acct-card" aria-labelledby="status-heading">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <h2 id="status-heading" style={{ ...h2, margin: 0 }}>
                Status
              </h2>
              <StatusBadge status={status} />
            </div>
            <p className="acct-muted" style={{ color: "#1E1E1E" }}>
              Placed on {formatDate(new Date(order.createdAt))}
              {order.cancelledAt ? ` · Cancelled on ${formatDate(new Date(order.cancelledAt))}` : ""}
            </p>
            <p className="acct-muted" style={{ marginTop: "0.25rem" }}>{status.detail}</p>

            {steps.length > 0 && (
              <ol style={{ listStyle: "none", padding: 0, margin: "1.5rem 0 0", display: "grid", gap: "0.75rem" }}>
                {steps.map((step) => (
                  <li key={step.stage} aria-current={step.current ? "step" : undefined} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontFamily: "'Montserrat', sans-serif", fontSize: "0.875rem", color: step.done ? "#1E1E1E" : "rgba(30,30,30,0.7)", fontWeight: step.current ? 700 : 500 }}>
                    <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: step.done ? "#6B4E37" : "transparent", border: step.done ? "none" : "2px solid rgba(30,30,30,0.25)", color: "#FFFFFF", flexShrink: 0 }}>
                      {step.done && <Check size={14} />}
                    </span>
                    {step.label}
                    <span className="sr-only">{step.done ? " (done)" : " (not yet)"}</span>
                  </li>
                ))}
              </ol>
            )}
            {status.stage === "SHIPPED" && !sampleStatus && (
              <p className="acct-hint" style={{ marginTop: "0.75rem" }}>
                We&apos;ll show Delivered once the courier confirms it. Until then, use the tracking link below.
              </p>
            )}

            {order.tracking.length > 0 && (
              <div style={{ marginTop: "1.5rem" }}>
                <h3 className="acct-dt">Tracking</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
                  {order.tracking.map((t, i) => (
                    <li key={i} className="acct-muted" style={{ color: "#1E1E1E" }}>
                      {[t.company, t.number].filter(Boolean).join(" · ")}{" "}
                      {t.url && /^https:\/\//.test(t.url) && (
                        <a href={t.url} target="_blank" rel="noopener noreferrer" className="acct-link">
                          Track with courier<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
              {lines.length > 0 && (
                <BusyButton small busy={adding} busyLabel="Adding…" onClick={buyAgain}>
                  Buy again
                </BusyButton>
              )}
              {canRequestReturn(status.stage, status.partial) && (
                <a href={returnMailto(order.orderNumber)} className="acct-btn-outline acct-btn-small">
                  Request a return
                </a>
              )}
              {order.canCancel && (
                <button
                  type="button"
                  className="acct-btn-outline acct-btn-small"
                  style={{ color: "#B91C1C", borderColor: "rgba(185,28,28,0.5)" }}
                  onClick={() => setCancelTarget({ id: order.id, orderNumber: order.orderNumber, total, isPrepaid: order.isPrepaid })}
                >
                  Cancel order
                </button>
              )}
            </div>
            {bagMessage && (
              <p role={bagMessage.kind === "error" ? "alert" : "status"} className={`acct-alert acct-alert-${bagMessage.kind}`} style={{ marginTop: "1rem" }}>
                {bagMessage.text}
              </p>
            )}
            {canRequestReturn(status.stage, status.partial) && (
              <p className="acct-hint" style={{ marginTop: "0.75rem" }}>
                Returns are accepted within {POLICY.returnDays} days of delivery. Damaged or wrong items must be reported within {POLICY.damageReportHours} hours. We&apos;ll reply by email.
              </p>
            )}
          </section>

          <section className="acct-card" aria-labelledby="delivery-heading">
            <h2 id="delivery-heading" style={h2}>
              Delivery and payment
            </h2>
            <div className="acct-grid-2" style={{ gap: "1.25rem" }}>
              <div>
                <p className="acct-dt">Delivery address</p>
                {address ? (
                  <p className="acct-muted" style={{ color: "#1E1E1E" }}>
                    {address.name && (
                      <>
                        {address.name}
                        <br />
                      </>
                    )}
                    {[address.address1, address.address2].filter(Boolean).join(", ")}
                    <br />
                    {[address.city, address.province].filter(Boolean).join(", ")} {address.zip}
                    {address.phone && (
                      <>
                        <br />
                        Phone: {address.phone}
                      </>
                    )}
                  </p>
                ) : (
                  <p className="acct-muted">Not available</p>
                )}
              </div>
              {payment && (
                <div>
                  <p className="acct-dt">Payment</p>
                  <p className="acct-muted" style={{ color: "#1E1E1E" }}>{payment}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: "1.5rem" }}>
          <section className="acct-card" aria-labelledby="items-heading">
            <h2 id="items-heading" style={h2}>
              Items ({units})
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "1rem" }}>
              {order.lineItems.map((item, idx) => {
                const { size, color } = variantParts(item.variantTitle);
                const details = [size && `Size ${size}`, color && `Colour ${color}`, `Qty ${item.quantity}`].filter(Boolean).join(" · ");
                return (
                  <li key={`${item.variantId}-${idx}`} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <OrderItemImage src={item.image} size={64} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.2rem" }}>
                        {item.productHandle ? (
                          <Link href={`/products/${encodeURIComponent(item.productHandle)}`} style={{ color: "inherit" }}>
                            {item.title}
                          </Link>
                        ) : (
                          item.title
                        )}
                      </p>
                      <p className="acct-muted">
                        {item.quantity === 0 ? "Removed from this order" : details}
                        {item.cancelledQuantity > 0 && item.quantity > 0 && ` (${item.cancelledQuantity} removed)`}
                      </p>
                    </div>
                    <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#1E1E1E", whiteSpace: "nowrap" }}>
                      {formatINR(item.paidTotal)}
                    </span>
                    {order.canCancel && item.quantity > 0 && (
                      <button
                        type="button"
                        className="acct-btn-outline acct-btn-small"
                        aria-label={`Edit ${item.title}`}
                        onClick={() =>
                          setCancelTarget({
                            id: order.id,
                            orderNumber: order.orderNumber,
                            total,
                            isPrepaid: order.isPrepaid,
                            item: {
                              // The item-cancel API identifies lines by variant ID.
                              id: item.variantId,
                              title: item.title,
                              quantity: item.quantity,
                              unitPrice: parseFloat(item.paidUnitPrice),
                              isLastItem: units === item.quantity,
                              image: item.image,
                              details: [size && `Size ${size}`, color && `Colour ${color}`].filter(Boolean).join(" · "),
                            },
                          })
                        }
                      >
                        Edit
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="acct-card" aria-labelledby="summary-heading">
            <h2 id="summary-heading" style={h2}>
              Price details
            </h2>
            <dl style={{ margin: 0 }}>
              <SummaryRow label="Items" value={formatINR(order.itemsSubtotal)} />
              {discount > 0 && (
                <SummaryRow label={order.discountCodes.length ? `Discount (${order.discountCodes.join(", ")})` : "Discount"} value={`−${formatINR(discount)}`} />
              )}
              <SummaryRow label="Shipping" value={parseFloat(order.shipping) > 0 ? formatINR(order.shipping) : "Free"} />
              {parseFloat(order.tax) > 0 && <SummaryRow label="Tax" value={formatINR(order.tax)} />}
              <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                <SummaryRow label="Total" value={formatINR(total)} strong />
              </div>
              {refunded > 0 && <SummaryRow label="Refunded" value={formatINR(refunded)} />}
            </dl>
            <p className="acct-hint" style={{ marginTop: "1rem" }}>
              Questions about this order? Email{" "}
              <a href={`mailto:${SITE.supportEmail}?subject=${encodeURIComponent(`Order ${order.orderNumber}`)}`} className="acct-link">
                {SITE.supportEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </div>

      {cancelTarget && <CancelOrderDialog order={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} />}
    </AccountShell>
  );
}
