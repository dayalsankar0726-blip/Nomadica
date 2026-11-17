// app/order-tracking/page.tsx
"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Truck, MapPin, ArrowLeft, Check, Package, HelpCircle } from "lucide-react";
import Image from "next/image";
import { PageLoader } from "@/components/ui/PageLoader";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import { useAuth, getStoredAuth } from "@/utils/hooks/useAuth";
import { formatINR } from "@/lib/pricing";
import { POLICY, SITE } from "@/lib/site";
import { groupByParcel, paymentSummary, trackingState, TrackedOrder, TrackedShipment } from "./trackingStatus";

const BODY = "'Montserrat', sans-serif";
const HEADING = "'Playfair Display', serif";
const MUTED = "rgba(30,30,30,0.7)";
const BROWN = "#6B4E37";
const ERROR = "#B91C1C";

type LineItem = {
  id: string;
  title?: string;
  quantity: number;
  variant?: { title?: string; price?: { amount?: string }; image?: { url?: string } | null };
};

type OrderResult = TrackedOrder & {
  totalPrice?: { amount?: string };
  subtotal?: string | null;
  shipping?: string | null;
  discount?: string | null;
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
  } | null;
  lineItems?: { edges?: Array<{ node: LineItem }> };
};

type SearchError = "not_found" | "unavailable" | null;

const formatDate = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
};

const card: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: "8px",
  padding: "1.5rem",
  boxShadow: "0 4px 20px rgba(0,0,0,0.01)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: BODY,
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#1E1E1E",
  marginBottom: "0.4rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "44px",
  padding: "0.65rem 1rem",
  border: "1px solid rgba(0,0,0,0.25)",
  borderRadius: "4px",
  fontFamily: BODY,
  fontSize: "0.9rem",
};

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  // Only the order number is accepted from the link; the email is never put in a URL.
  const [orderNumber, setOrderNumber] = useState(() => searchParams.get("order") || "");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<SearchError>(null);
  const [signedIn, setSignedIn] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const signed = isAuthenticated || getStoredAuth().isAuthenticated;
    Promise.resolve().then(() => setSignedIn(signed));
  }, [isAuthenticated]);

  // Arriving from the order confirmation: the number is filled in, so start at the email.
  useEffect(() => {
    if (searchParams.get("order")) emailRef.current?.focus();
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      if (res.status === 404 || res.status === 400) {
        setError("not_found");
        return;
      }
      if (!res.ok) {
        setError("unavailable");
        return;
      }
      const data = await res.json();
      if (data?.order) {
        setOrder(data.order);
        setTimeout(() => resultRef.current?.focus(), 0);
      } else {
        setError("not_found");
      }
    } catch (err) {
      console.error("Tracking query failed:", err);
      setError("unavailable");
    } finally {
      setIsSearching(false);
    }
  };

  const items: LineItem[] = order?.lineItems?.edges?.map((e) => e.node) ?? [];
  const state = order ? trackingState(order) : null;
  const payment = order ? paymentSummary(order) : null;
  const parcels = order ? groupByParcel(items, order.shipments ?? []) : [];
  const total = parseFloat(order?.totalPrice?.amount || "0");
  const estimate = order?.shipments?.map((s) => s.estimatedDeliveryAt).filter(Boolean).sort().pop();

  return (
    <div style={{ backgroundColor: "#FDFDFD", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1rem 4rem" }} className="sm:px-6">
        {signedIn && (
          <div style={{ marginBottom: "1rem" }}>
            <Link
              href="/account/orders"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontFamily: BODY, fontSize: "0.875rem", color: MUTED, textDecoration: "none", fontWeight: 500, minHeight: "44px" }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to my orders
            </Link>
          </div>
        )}

        <h1 style={{ fontFamily: HEADING, fontSize: "clamp(2rem, 3.5vw, 2.5rem)", fontWeight: 600, color: "#1E1E1E", marginBottom: "1.5rem" }}>
          Track your order
        </h1>

        <div style={{ ...card, padding: "1.75rem 1.5rem", marginBottom: "2rem" }}>
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-start">
            <div>
              <label htmlFor="track-order" style={labelStyle}>Order number</label>
              <input
                id="track-order"
                type="text"
                autoComplete="off"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
                aria-describedby="track-order-hint"
                style={inputStyle}
              />
              <p id="track-order-hint" style={{ fontFamily: BODY, fontSize: "0.75rem", color: MUTED, margin: "0.4rem 0 0" }}>
                It&apos;s on your order confirmation. With or without the #.
              </p>
            </div>
            <div>
              <label htmlFor="track-email" style={labelStyle}>Email used for the order</label>
              <input
                id="track-email"
                ref={emailRef}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="sm:mt-[1.65rem]"
              style={{
                backgroundColor: BROWN,
                color: "#FFFFFF",
                border: "none",
                borderRadius: "4px",
                padding: "0 2rem",
                minHeight: "44px",
                fontFamily: BODY,
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: isSearching ? "wait" : "pointer",
                opacity: isSearching ? 0.7 : 1,
              }}
            >
              {isSearching ? "Tracking…" : "Track"}
            </button>
          </form>

          <div role="alert" aria-live="assertive">
            {error && (
              <p style={{ color: ERROR, fontSize: "0.875rem", fontFamily: BODY, margin: "1rem 0 0", fontWeight: 500, lineHeight: 1.5 }}>
                {error === "not_found"
                  ? "We couldn't find an order with that number and email. Check both and try again."
                  : "We couldn't reach our order system just now. Please try again in a moment."}
              </p>
            )}
          </div>
        </div>

        {isSearching && <PageLoader />}

        {!isSearching && order && state && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem", minWidth: 0 }}>
              {/* Status and timeline */}
              <section style={card} aria-labelledby="track-status">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <span style={{ fontFamily: BODY, fontSize: "0.75rem", fontWeight: 600, color: MUTED, letterSpacing: "0.08em", display: "block", textTransform: "uppercase" }}>
                      Order {order.orderNumber}
                    </span>
                    <h2 id="track-status" ref={resultRef} tabIndex={-1} style={{ fontFamily: HEADING, fontSize: "1.6rem", fontWeight: 600, color: state.cancelled ? ERROR : "#1E1E1E", margin: "0.25rem 0 0", outline: "none" }}>
                      {state.label}
                    </h2>
                  </div>
                  <div>
                    <span style={{ fontFamily: BODY, fontSize: "0.75rem", color: MUTED, display: "block" }}>Placed on</span>
                    <span style={{ fontFamily: BODY, fontSize: "0.875rem", fontWeight: 600, color: "#1E1E1E", display: "block", marginTop: "0.15rem" }}>
                      {formatDate(order.createdAt, true)}
                    </span>
                  </div>
                </div>

                {state.cancelled ? (
                  <p style={{ fontFamily: BODY, fontSize: "0.875rem", color: MUTED, margin: "1.25rem 0 0", lineHeight: 1.6 }}>
                    This order was cancelled{order.cancelledAt ? ` on ${formatDate(order.cancelledAt)}` : ""}.
                    {payment?.status === "Refunded" || payment?.status === "Partly refunded"
                      ? ` Refunds usually reach your original payment method within ${POLICY.refundDays} business days.`
                      : ""}
                  </p>
                ) : (
                  <ol style={{ listStyle: "none", padding: 0, margin: "1.75rem 0 0", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "0.25rem" }}>
                    {state.steps.map((step, idx) => {
                      const current = step.done && !state.steps[idx + 1]?.done;
                      return (
                        <li key={step.key} aria-current={current ? "step" : undefined} style={{ textAlign: "center", position: "relative" }}>
                          {idx > 0 && (
                            <span aria-hidden="true" style={{ position: "absolute", top: "15px", right: "50%", width: "100%", height: "2px", backgroundColor: step.done ? "#4F6B5A" : "rgba(0,0,0,0.15)" }} />
                          )}
                          <span
                            aria-hidden="true"
                            style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "50%", backgroundColor: step.done ? "#4F6B5A" : "#FFFFFF", border: step.done ? "none" : "2px solid rgba(0,0,0,0.2)", color: "#FFFFFF" }}
                          >
                            {step.done && <Check size={16} />}
                          </span>
                          <span style={{ display: "block", fontFamily: BODY, fontSize: "0.8rem", fontWeight: current ? 700 : 500, color: step.done ? "#1E1E1E" : MUTED, marginTop: "0.4rem" }}>
                            {step.label}
                            <span className="sr-only">{step.done ? " (done)" : " (not yet)"}</span>
                          </span>
                          {step.date && <span style={{ display: "block", fontFamily: BODY, fontSize: "0.75rem", color: MUTED }}>{formatDate(step.date)}</span>}
                        </li>
                      );
                    })}
                  </ol>
                )}

                {!state.cancelled && !state.delivered && (
                  <p style={{ fontFamily: BODY, fontSize: "0.85rem", color: "#1E1E1E", backgroundColor: "#F5F1EA", borderRadius: "6px", padding: "0.75rem 1rem", margin: "1.5rem 0 0", lineHeight: 1.6 }}>
                    {estimate
                      ? `Expected delivery: ${formatDate(estimate)}.`
                      : state.shipped
                        ? `On its way. Orders usually arrive within ${POLICY.deliveryDays} business days of dispatch.`
                        : `Orders are usually packed within ${POLICY.processingDays} business days and delivered ${POLICY.deliveryDays} business days after dispatch.`}
                  </p>
                )}
              </section>

              {/* Items, grouped by parcel */}
              <section style={card} aria-labelledby="track-items">
                <h2 id="track-items" style={{ fontFamily: HEADING, fontSize: "1.2rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 1.25rem" }}>
                  Items
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
                  {parcels.map((group, gIdx) => (
                    <div key={group.shipment?.id ?? "unshipped"}>
                      {(parcels.length > 1 || group.shipment) && (
                        <ParcelHeader shipment={group.shipment} index={gIdx} cancelled={state.cancelled} />
                      )}
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {group.items.map(({ item, quantity }) => {
                          const title = item.title || "Item";
                          const image = item.variant?.image?.url || "";
                          const unit = item.variant?.price?.amount;
                          const options = item.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : "";
                          return (
                            <li key={item.id} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                              <div style={{ position: "relative", width: "60px", aspectRatio: "3/4", overflow: "hidden", borderRadius: "4px", backgroundColor: "#F2F0EB", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {image ? (
                                  <Image src={getShopifyImageUrl(image, 150)} alt={title} fill sizes="60px" style={{ objectFit: "cover" }} />
                                ) : (
                                  <Package size={20} aria-hidden="true" style={{ color: "rgba(0,0,0,0.25)" }} />
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                                <div style={{ minWidth: 0 }}>
                                  <h3 style={{ fontFamily: HEADING, fontSize: "1rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.2rem" }}>{title}</h3>
                                  <p style={{ fontFamily: BODY, fontSize: "0.8rem", color: MUTED, margin: 0 }}>
                                    {options ? `${options} · ` : ""}Qty {quantity}
                                  </p>
                                </div>
                                {unit && (
                                  <span style={{ fontFamily: BODY, fontSize: "0.875rem", fontWeight: 600, color: "#1E1E1E" }}>
                                    {formatINR(parseFloat(unit) * quantity)}
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {order.shippingAddress && (
                <section style={card} aria-labelledby="track-address">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
                    <MapPin size={18} aria-hidden="true" style={{ color: BROWN }} />
                    <h2 id="track-address" style={{ fontFamily: HEADING, fontSize: "1.1rem", fontWeight: 600, color: "#1E1E1E", margin: 0 }}>Delivery address</h2>
                  </div>
                  <p style={{ fontFamily: BODY, fontSize: "0.85rem", color: MUTED, lineHeight: 1.6, margin: 0 }}>
                    <strong style={{ color: "#1E1E1E" }}>
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </strong>
                    <br />
                    {order.shippingAddress.address1}
                    {order.shippingAddress.address2 && <>, {order.shippingAddress.address2}</>}
                    <br />
                    {[order.shippingAddress.city, order.shippingAddress.province].filter(Boolean).join(", ")} {order.shippingAddress.zip}
                  </p>
                </section>
              )}

              <section style={card} aria-labelledby="track-summary">
                <h2 id="track-summary" style={{ fontFamily: HEADING, fontSize: "1.1rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 1rem" }}>Payment</h2>
                <dl style={{ display: "grid", gap: "0.65rem", margin: 0, fontFamily: BODY, fontSize: "0.85rem" }}>
                  {payment?.method && (
                    <Row label="Method" value={payment.method} />
                  )}
                  {payment?.status && <Row label="Status" value={payment.status} />}
                  {order.subtotal != null && <Row label="Subtotal" value={formatINR(order.subtotal)} />}
                  {order.discount != null && parseFloat(order.discount) > 0 && <Row label="Discount" value={`−${formatINR(order.discount)}`} />}
                  {order.shipping != null && <Row label="Shipping" value={parseFloat(order.shipping) === 0 ? "Free" : formatINR(order.shipping)} />}
                  <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.08)", margin: "0.25rem 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <dt style={{ fontFamily: HEADING, fontSize: "1.05rem", fontWeight: 600, color: "#1E1E1E" }}>Total</dt>
                    <dd style={{ fontFamily: HEADING, fontSize: "1.3rem", fontWeight: 700, color: "#1E1E1E", margin: 0 }}>{formatINR(total)}</dd>
                  </div>
                </dl>
                <p style={{ fontFamily: BODY, fontSize: "0.75rem", color: MUTED, textAlign: "right", margin: "0.25rem 0 0" }}>Inclusive of all taxes</p>
              </section>

              <section style={card} aria-labelledby="track-help">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <HelpCircle size={18} aria-hidden="true" style={{ color: BROWN }} />
                  <h2 id="track-help" style={{ fontFamily: HEADING, fontSize: "1.1rem", fontWeight: 600, color: "#1E1E1E", margin: 0 }}>Need help?</h2>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem", fontFamily: BODY, fontSize: "0.85rem", lineHeight: 1.5 }}>
                  {!state.cancelled && !state.steps[1].done && (
                    <li>
                      {signedIn ? (
                        <Link href="/account/orders" style={{ color: BROWN, fontWeight: 600 }}>Cancel this order in My orders</Link>
                      ) : (
                        <>Want to cancel? Contact us with your order number before it&apos;s packed.</>
                      )}
                    </li>
                  )}
                  {state.delivered && (
                    <li>
                      Returns are accepted within {POLICY.returnDays} days of delivery.{" "}
                      <Link href="/support/return-policy" style={{ color: BROWN, fontWeight: 600 }}>Return policy</Link>
                    </li>
                  )}
                  <li>
                    <Link href="/support/contact" style={{ color: BROWN, fontWeight: 600 }}>Contact support</Link> or email{" "}
                    <a href={`mailto:${SITE.supportEmail}`} style={{ color: BROWN }}>{SITE.supportEmail}</a>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        )}

        {!isSearching && !order && !error && (
          <div style={{ ...card, textAlign: "center", padding: "3rem 1.5rem" }}>
            <Truck size={44} aria-hidden="true" style={{ color: "rgba(0,0,0,0.2)", margin: "0 auto 1.25rem" }} />
            <h2 style={{ fontFamily: HEADING, fontSize: "1.35rem", fontWeight: 600, color: "#1E1E1E", marginBottom: "0.75rem" }}>
              Where&apos;s my order?
            </h2>
            <p style={{ fontFamily: BODY, fontSize: "0.875rem", color: MUTED, maxWidth: "440px", margin: "0 auto", lineHeight: 1.6 }}>
              Enter your order number and the email address you used at checkout to see where your order is.
              {signedIn && (
                <>
                  {" "}You can also see all your orders in <Link href="/account/orders" style={{ color: BROWN, fontWeight: 600 }}>My orders</Link>.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <dt style={{ color: MUTED }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, color: "#1E1E1E", textAlign: "right" }}>{value}</dd>
    </div>
  );
}

function ParcelHeader({ shipment, index, cancelled }: { shipment: TrackedShipment | null; index: number; cancelled: boolean }) {
  if (!shipment) {
    return (
      <p style={{ fontFamily: BODY, fontSize: "0.8rem", fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.75rem" }}>
        {cancelled ? "Not shipped" : "Not shipped yet"}
      </p>
    );
  }
  const delivered = shipment.displayStatus?.toUpperCase() === "DELIVERED" || !!shipment.deliveredAt;
  const tracking = (shipment.tracking ?? []).filter((t) => t.number || t.url);
  return (
    <div style={{ marginBottom: "0.85rem", padding: "0.85rem 1rem", backgroundColor: "rgba(196,181,160,0.1)", border: "1px solid rgba(196,181,160,0.3)", borderRadius: "6px", fontFamily: BODY, fontSize: "0.85rem", color: "#1E1E1E", lineHeight: 1.6 }}>
      <strong>
        Parcel {index + 1}: {delivered ? `Delivered${shipment.deliveredAt ? ` ${formatDate(shipment.deliveredAt)}` : ""}` : `Shipped${shipment.createdAt ? ` ${formatDate(shipment.createdAt)}` : ""}`}
      </strong>
      {tracking.map((t, i) => (
        <div key={i}>
          {t.company && <>Courier: {t.company}<br /></>}
          {t.number && <>Tracking number: {t.number}<br /></>}
          {t.url && (
            <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ color: BROWN, fontWeight: 600 }}>
              Track on the courier&apos;s website<span className="sr-only"> (opens in a new tab)</span> →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <OrderTrackingContent />
    </Suspense>
  );
}
