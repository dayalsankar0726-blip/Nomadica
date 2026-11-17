"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { Truck, Shield, ChevronLeft, CheckCircle, ShoppingBag, CreditCard, ChevronDown } from "lucide-react";
import { api } from "@/components/api/api";
import { useAuth, getStoredAuth } from "@/utils/hooks/useAuth";
import { PageLoader } from "@/components/ui/PageLoader";
import { formatINR } from "@/lib/pricing";
import { POLICY, SITE } from "@/lib/site";
import {
  RazorpayPaymentError,
  cancelledPaymentMessage,
  failedPaymentMessage,
  unconfirmedPaymentMessage,
} from "@/lib/checkout/paymentMessages";
import {
  INDIAN_STATES,
  SHIPPING_FIELDS,
  ShippingField,
  fieldForMessage,
  isValidPin,
  matchIndianState,
  normalizeIndianMobile,
  validateShippingFields,
} from "./checkoutFields";

const BODY = "'Montserrat', sans-serif";
const HEADING = "'Playfair Display', serif";
const MUTED = "rgba(30,30,30,0.7)";
const BROWN = "#6B4E37";
const ERROR = "#B91C1C";
const SAVED_ADDRESS_KEY = "nomadica_saved_address";

type RazorpayState = "loading" | "ready" | "failed";
type PayMethod = "online" | "cod";

type FormValues = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  zip: string;
};

const EMPTY_FORM: FormValues = { email: "", phone: "", firstName: "", lastName: "", address1: "", address2: "", city: "", province: "", zip: "" };

type CartLine = {
  id: string;
  quantity: number;
  merchandise?: {
    title?: string;
    image?: string;
    selectedOptions?: Array<{ name?: string; value?: string }>;
    price?: { amount?: string };
    product?: { title?: string; images?: { edges?: Array<{ node?: { url?: string } }> } };
  };
};

type CartData = { id: string; lines: { edges: Array<{ node: CartLine }> }; cost?: { subtotalAmount?: { amount?: string } } };

type Pricing = { subtotal: number; discount: number; discountCodes: string[]; shipping: number; freeShippingThreshold?: number; total: number };

type SavedAddress = {
  id?: string;
  label?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  phone?: string;
  default?: boolean;
};

type Confirmation = {
  orderNumber: string;
  method: PayMethod;
  form: FormValues;
  items: Array<{ id: string; title: string; options: string; quantity: number; lineTotal: number; image: string }>;
  pricing: Pricing;
  signedIn: boolean;
};

/** "Size: M · Colour: Black" from the variant's options, else its title; "" for one-variant products. */
function variantLabel(line: CartLine): string {
  const options = line.merchandise?.selectedOptions?.filter((o) => o?.name && o?.value && o.value !== "Default Title");
  if (options && options.length > 0) return options.map((o) => `${o.name}: ${o.value}`).join(" · ");
  const title = line.merchandise?.title || "";
  return title && title !== "Default Title" ? title : "";
}

const lineImage = (line: CartLine) => line.merchandise?.product?.images?.edges?.[0]?.node?.url || line.merchandise?.image || "";

/** City and state for an Indian PIN code from India Post's free API. Best effort: null on any failure. */
async function lookupPin(pin: string, signal: AbortSignal): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const office = Array.isArray(data) && data[0]?.Status === "Success" ? data[0]?.PostOffice?.[0] : null;
    if (!office) return null;
    return { city: String(office.District || office.Block || "").trim(), state: matchIndianState(office.State) };
  } catch {
    return null;
  }
}

const isSignedIn = (isAuthenticated: boolean) => isAuthenticated || (typeof window !== "undefined" && getStoredAuth().isAuthenticated);

function CheckoutContent({ razorpay }: { razorpay: RazorpayState }) {
  const searchParams = useSearchParams();
  const cartIdParam = searchParams.get("cartId");

  const { isAuthenticated, user } = useAuth();
  const [cart, setCart] = useState<CartData | null>(null);
  // Price summary worked out by the server; it is exactly what will be charged.
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartError, setCartError] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ShippingField, string>>>({});
  const [pinHint, setPinHint] = useState("");
  // Once the shopper types, late-arriving saved details must not overwrite their input.
  const userEdited = useRef(false);
  const prefilled = useRef(false);
  const pinLookup = useRef<AbortController | null>(null);
  const autoFilled = useRef<{ city: string; province: string }>({ city: "", province: "" });

  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("online");
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [discountBusy, setDiscountBusy] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  // Bring payment errors into view; the customer may be scrolled down at the pay button.
  useEffect(() => {
    if (errorMessage) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current?.focus();
    }
  }, [errorMessage]);

  const activeCartId = () => cartIdParam || (typeof window !== "undefined" ? localStorage.getItem("nomadica_cart_id") : null);

  const loadCart = useCallback(() => {
    const id = cartIdParam || localStorage.getItem("nomadica_cart_id");
    const request = id ? api.cart.get(id) : Promise.resolve(null);
    return request
      .then((res) => {
        setCart(res?.cart ?? null);
        setPricing(res?.pricing ?? null);
        setCartError(false);
      })
      .catch((err) => {
        console.error("Failed to load cart:", err);
        setCartError(true);
      })
      .finally(() => setLoadingCart(false));
  }, [cartIdParam]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  /** Fills the form from a saved address. `force` is for the shopper's own choice of address. */
  const applyAddress = useCallback(
    (addr: SavedAddress | null | undefined, force = false) => {
      if (!addr || (!force && userEdited.current)) return;
      setSelectedAddressId(addr.id || "");
      const parts = (addr.name || "").trim().split(/\s+/);
      setForm((prev) => ({
        ...prev,
        firstName: addr.firstName || parts[0] || prev.firstName,
        lastName: addr.lastName || parts.slice(1).join(" ") || prev.lastName,
        phone: addr.phone ? addr.phone.replace(/^\+91/, "") : prev.phone,
        address1: addr.address1 || "",
        address2: addr.address2 || "",
        city: addr.city || "",
        province: matchIndianState(addr.province),
        zip: addr.zip || "",
      }));
      setFieldErrors({});
      setPinHint("");
    },
    []
  );

  // Signed-in shoppers: their name and email, once only, so they can still change them.
  useEffect(() => {
    if (prefilled.current) return;
    const activeUser = user || getStoredAuth().user;
    if (!activeUser) return;
    prefilled.current = true;
    const phone = normalizeIndianMobile(activeUser.phone);
    Promise.resolve().then(() =>
      setForm((prev) => ({
        ...prev,
        email: prev.email || activeUser.email || "",
        firstName: prev.firstName || activeUser.firstName || "",
        lastName: prev.lastName || activeUser.lastName || "",
        phone: prev.phone || (phone ? phone.slice(3) : ""),
      }))
    );
  }, [user]);

  // Saved addresses: kept in this browser only for signed-in shoppers (shared devices).
  useEffect(() => {
    if (!isSignedIn(isAuthenticated)) {
      try {
        localStorage.removeItem(SAVED_ADDRESS_KEY);
      } catch {}
      return;
    }
    let cached: SavedAddress | null = null;
    try {
      cached = JSON.parse(localStorage.getItem(SAVED_ADDRESS_KEY) || "null");
    } catch {}
    if (cached) Promise.resolve().then(() => applyAddress(cached));
    api.customer
      .addresses()
      .then((res) => {
        const list: SavedAddress[] = res?.addresses || [];
        setAddresses(list);
        applyAddress(list.find((a) => a.default) || list[0]);
      })
      .catch((err) => console.error("Failed to load addresses:", err));
  }, [isAuthenticated, applyAddress]);

  const setField = (name: keyof FormValues, value: string) => {
    userEdited.current = true;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name in fieldErrors) {
      const next = validateShippingFields({ ...form, [name]: value });
      setFieldErrors((prev) => {
        const copy = { ...prev };
        const field = name as ShippingField;
        if (next[field]) copy[field] = next[field];
        else delete copy[field];
        return copy;
      });
    }
  };

  const validateOnBlur = (name: ShippingField) => {
    if (!form[name].trim() && !fieldErrors[name]) return;
    const message = validateShippingFields(form)[name];
    setFieldErrors((prev) => {
      const copy = { ...prev };
      if (message) copy[name] = message;
      else delete copy[name];
      return copy;
    });
  };

  const handleZipChange = (raw: string) => {
    const zip = raw.replace(/\D/g, "").slice(0, 6);
    setField("zip", zip);
    setPinHint("");
    pinLookup.current?.abort();
    if (!isValidPin(zip)) return;
    const controller = new AbortController();
    pinLookup.current = controller;
    const timer = setTimeout(() => controller.abort(), 5000);
    lookupPin(zip, controller.signal).then((place) => {
      clearTimeout(timer);
      if (!place || controller.signal.aborted) return;
      setForm((prev) => {
        const next = { ...prev };
        // Only fill fields that are empty or that we filled from an earlier PIN.
        if (place.city && (!prev.city || prev.city === autoFilled.current.city)) next.city = place.city;
        if (place.state && (!prev.province || prev.province === autoFilled.current.province)) next.province = place.state;
        autoFilled.current = { city: next.city, province: next.province };
        return next;
      });
      setFieldErrors((prev) => {
        const copy = { ...prev };
        if (place.city) delete copy.city;
        if (place.state) delete copy.province;
        return copy;
      });
      setPinHint([place.city, place.state].filter(Boolean).join(", "));
    });
  };

  const chooseNewAddress = () => {
    userEdited.current = true;
    setSelectedAddressId("new");
    setForm((prev) => ({ ...prev, address1: "", address2: "", city: "", province: "", zip: "" }));
    setPinHint("");
    setTimeout(() => document.getElementById("checkout-address1")?.focus(), 0);
  };

  const focusField = (field: ShippingField) => {
    const el = document.getElementById(`checkout-${field}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  const showServerError = (message: string) => {
    const field = fieldForMessage(message);
    if (field) {
      setFieldErrors((prev) => ({ ...prev, [field]: message }));
      focusField(field);
    } else {
      setErrorMessage(message);
    }
  };

  const handleApplyDiscount = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    const code = discountCode.trim();
    const cartId = cart?.id || activeCartId();
    setDiscountError("");
    if (!code) {
      setDiscountError("Enter a discount code.");
      return;
    }
    if (!cartId) return;
    setDiscountBusy(true);
    try {
      const res = await api.cart.applyDiscount(cartId, code);
      if (res.pricing) setPricing(res.pricing);
      if (!res.applied) setDiscountError(res.error || "That code isn't valid for this order.");
      else setDiscountCode("");
    } catch {
      setDiscountError("Couldn't apply the code. Please try again.");
    } finally {
      setDiscountBusy(false);
    }
  };

  const handleRemoveDiscount = async () => {
    const cartId = cart?.id || activeCartId();
    if (!cartId) return;
    setDiscountError("");
    setDiscountBusy(true);
    try {
      const res = await api.cart.removeDiscount(cartId);
      if (!res?.pricing) throw new Error(res?.error || "No pricing returned");
      setPricing(res.pricing);
    } catch {
      setDiscountError("Couldn't remove the code. Please try again.");
    } finally {
      setDiscountBusy(false);
    }
  };

  const finishOrder = (orderNumber: string, method: PayMethod, signedIn: boolean) => {
    if (!cart) return;
    const items = cart.lines.edges.map(({ node }) => ({
      id: node.id,
      title: node.merchandise?.product?.title || "Item",
      options: variantLabel(node),
      quantity: node.quantity,
      lineTotal: parseFloat(node.merchandise?.price?.amount || "0") * node.quantity,
      image: lineImage(node),
    }));
    setConfirmation({ orderNumber, method, form, items, pricing: summary, signedIn });
    if (signedIn) {
      try {
        const { email: _email, ...address } = form;
        void _email;
        localStorage.setItem(SAVED_ADDRESS_KEY, JSON.stringify(address));
      } catch {}
    }
    localStorage.removeItem("nomadica_cart_id");
    window.dispatchEvent(new CustomEvent("cart-updated", { detail: { openDrawer: false } }));
    window.scrollTo({ top: 0 });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage("");

    if (!cart || cart.lines.edges.length === 0) {
      setErrorMessage("Your bag is empty.");
      return;
    }

    const errors = validateShippingFields(form);
    setFieldErrors(errors);
    const firstInvalid = SHIPPING_FIELDS.find((f) => errors[f]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    const signedIn = isSignedIn(isAuthenticated);
    const details = { cartId: cart.id, ...form, phone: normalizeIndianMobile(form.phone) ?? form.phone };

    if (paymentMethod === "online") {
      const RazorpayConstructor = (window as unknown as { Razorpay?: new (opts: unknown) => { on: (e: string, cb: (r: { error?: RazorpayPaymentError }) => void) => void; open: () => void } }).Razorpay;
      // Check before creating the payment order, so a slow script never leaves an orphan order.
      if (!RazorpayConstructor) {
        setErrorMessage(
          razorpay === "failed"
            ? "Online payment couldn't load. Check your connection and reload the page, or choose Cash on Delivery."
            : "Secure payment is still loading. Please try again in a moment."
        );
        return;
      }
      setIsSubmitting(true);
      try {
        const createResult = await api.checkout.process({ action: "create", ...details });
        if (!createResult.success || !createResult.orderId) {
          throw new Error(createResult.error || "Couldn't start the payment. Please try again.");
        }
        const { orderId, amount, keyId } = createResult;

        // The most recent failure, shown when the customer closes the window without paying.
        let lastPaymentError: RazorpayPaymentError | null = null;
        const rzp = new RazorpayConstructor({
          key: keyId,
          amount,
          currency: "INR",
          name: SITE.name,
          description: "Order payment",
          image: `${window.location.origin}/Logo.png`,
          order_id: orderId,
          prefill: {
            name: `${form.firstName} ${form.lastName}`.trim(),
            email: form.email,
            contact: details.phone,
          },
          theme: { color: "#1E1E1E" },
          handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            setIsSubmitting(true);
            try {
              const verifyResult = await api.checkout.process({
                action: "verify",
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                ...details,
              });
              if (verifyResult.success) {
                finishOrder(verifyResult.orderNumber, "online", signedIn);
              } else {
                // Razorpay has taken the money; the webhook still creates the order.
                console.error("Verification failed:", verifyResult.error);
                setErrorMessage(unconfirmedPaymentMessage(response.razorpay_payment_id));
              }
            } catch (verifyErr) {
              console.error("Verification error:", verifyErr);
              setErrorMessage(unconfirmedPaymentMessage(response.razorpay_payment_id));
            } finally {
              setIsSubmitting(false);
            }
          },
          // Razorpay keeps its window open after a failure so the customer can retry there.
          retry: { enabled: true, max_count: 3 },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false);
              setErrorMessage(lastPaymentError ? failedPaymentMessage(lastPaymentError) : cancelledPaymentMessage());
            },
          },
        });
        rzp.on("payment.failed", (response) => {
          lastPaymentError = response?.error ?? {};
        });
        rzp.open();
      } catch (err) {
        console.error("Razorpay initiation error:", err);
        showServerError(err instanceof Error && err.message ? err.message : "Couldn't start the payment. Please try again.");
        setIsSubmitting(false);
      }
      return;
    }

    // Cash on delivery
    setIsSubmitting(true);
    try {
      const result = await api.checkout.process({ action: "cod", ...details });
      if (result.success) {
        finishOrder(result.orderNumber, "cod", signedIn);
      } else {
        showServerError(result.error || result.message || "Couldn't place your order. Please try again.");
      }
    } catch (err) {
      showServerError(err instanceof Error && err.message ? err.message : "Couldn't place your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtotal: number = pricing?.subtotal ?? parseFloat(cart?.cost?.subtotalAmount?.amount || "0");
  const summary: Pricing = {
    subtotal,
    discount: pricing?.discount ?? 0,
    discountCodes: pricing?.discountCodes ?? [],
    shipping: pricing?.shipping ?? 0,
    total: pricing?.total ?? subtotal + (pricing?.shipping ?? 0),
  };

  if (confirmation) {
    return <OrderConfirmation confirmation={confirmation} />;
  }

  if (loadingCart) {
    return <PageLoader />;
  }

  if (cartError) {
    return (
      <div role="alert" style={{ padding: "6rem 1rem", textAlign: "center", backgroundColor: "#FFFFFF", minHeight: "70vh", fontFamily: BODY }}>
        <h1 style={{ fontFamily: HEADING, fontSize: "2rem", marginBottom: "0.75rem" }}>We couldn&apos;t load your order</h1>
        <p style={{ color: MUTED, marginBottom: "1.75rem" }}>Your bag is still saved. Check your connection and try again.</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setLoadingCart(true);
              loadCart();
            }}
            style={primaryButton(false)}
          >
            Try again
          </button>
          <Link href="/cart" style={secondaryLink}>Back to bag</Link>
        </div>
      </div>
    );
  }

  if (!cart || cart.lines.edges.length === 0) {
    return (
      <div style={{ padding: "6rem 1rem", textAlign: "center", backgroundColor: "#FFFFFF", minHeight: "70vh", fontFamily: BODY }}>
        <h1 style={{ fontFamily: HEADING, fontSize: "2rem", marginBottom: "0.75rem" }}>Your bag is empty</h1>
        <p style={{ color: MUTED, marginBottom: "1.75rem" }}>Add something to your bag to check out.</p>
        <Link href="/shop" style={{ ...primaryButton(false), display: "inline-flex", textDecoration: "none" }}>Explore the collection</Link>
      </div>
    );
  }

  const signedIn = isSignedIn(isAuthenticated);
  const itemCount = cart.lines.edges.reduce((n, { node }) => n + node.quantity, 0);
  const onlineBlocked = paymentMethod === "online" && razorpay !== "ready";
  const submitDisabled = isSubmitting || onlineBlocked;
  const submitLabel = isSubmitting
    ? paymentMethod === "online"
      ? "Opening secure payment…"
      : "Placing your order…"
    : paymentMethod === "online"
      ? razorpay === "loading"
        ? "Loading secure payment…"
        : razorpay === "failed"
          ? "Online payment unavailable"
          : `Pay ${formatINR(summary.total)} securely`
      : `Place order · Pay ${formatINR(summary.total)} on delivery`;

  const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem", color: "#1E1E1E" };
  const inputProps = (name: ShippingField) => ({
    id: `checkout-${name}`,
    name,
    value: form[name],
    className: "form-input",
    required: true,
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `checkout-${name}-error` : undefined,
    onBlur: () => validateOnBlur(name),
    style: fieldErrors[name] ? { borderColor: ERROR } : undefined,
  });
  const fieldError = (name: ShippingField) =>
    fieldErrors[name] ? (
      <p id={`checkout-${name}-error`} style={{ color: ERROR, fontSize: "0.8rem", margin: "0.375rem 0 0" }}>
        {fieldErrors[name]}
      </p>
    ) : null;

  /** The order summary; drawn twice (collapsible at the top on phones, beside the form on desktop). */
  const renderSummary = (prefix: string) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <ul style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem", listStyle: "none", padding: 0 }}>
        {cart.lines.edges.map(({ node: line }) => {
          const price = parseFloat(line.merchandise?.price?.amount || "0");
          const title = line.merchandise?.product?.title || "Item";
          const options = variantLabel(line);
          const image = lineImage(line);
          return (
            <li key={line.id} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div style={{ width: "52px", aspectRatio: "3/4", overflow: "hidden", backgroundColor: "#F2F0EB", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <ShoppingBag size={20} aria-hidden="true" style={{ color: "rgba(0,0,0,0.25)" }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.8125rem", margin: "0 0 0.125rem" }}>{title}</p>
                  <p style={{ fontSize: "0.75rem", color: MUTED, margin: 0 }}>
                    {options ? `${options} · ` : ""}Qty {line.quantity}
                  </p>
                </div>
                <span style={{ fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap" }}>{formatINR(price * line.quantity)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Discount code */}
      <div style={{ marginBottom: "1.25rem" }}>
        {summary.discountCodes.length > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", fontSize: "0.8125rem" }}>
            <span>
              Code <strong>{summary.discountCodes.join(", ")}</strong> applied
            </span>
            <button
              type="button"
              onClick={handleRemoveDiscount}
              disabled={discountBusy || isSubmitting}
              style={{ background: "none", border: "none", color: ERROR, fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", minHeight: "44px", padding: "0 0.25rem" }}
            >
              {discountBusy ? "Removing…" : "Remove"}
            </button>
          </div>
        ) : (
          <>
            <label htmlFor={`${prefix}-discount`} style={labelStyle}>Discount code</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                id={`${prefix}-discount`}
                type="text"
                autoComplete="off"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyDiscount(e as unknown as React.FormEvent);
                }}
                disabled={discountBusy || isSubmitting}
                aria-invalid={discountError ? true : undefined}
                aria-describedby={`${prefix}-discount-message`}
                className="form-input"
                style={{ padding: "0.6rem 0.75rem", textTransform: "uppercase", minWidth: 0, ...(discountError ? { borderColor: ERROR } : {}) }}
              />
              <button type="button" onClick={handleApplyDiscount} disabled={discountBusy || isSubmitting} style={{ ...primaryButton(discountBusy), padding: "0 1.1rem", minHeight: "44px" }}>
                {discountBusy ? "Applying…" : "Apply"}
              </button>
            </div>
          </>
        )}
        <p id={`${prefix}-discount-message`} aria-live="polite" style={{ color: ERROR, fontSize: "0.8rem", margin: discountError ? "0.375rem 0 0" : 0 }}>
          {discountError}
        </p>
      </div>

      <dl style={{ display: "flex", flexDirection: "column", gap: "0.75rem", borderTop: "1px solid rgba(30,30,30,0.08)", paddingTop: "1.25rem", margin: "0 0 1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: MUTED }}>
          <dt>Subtotal</dt>
          <dd style={{ margin: 0 }}>{formatINR(summary.subtotal)}</dd>
        </div>
        {summary.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#15803D" }}>
            <dt>Discount{summary.discountCodes.length ? ` (${summary.discountCodes.join(", ")})` : ""}</dt>
            <dd style={{ margin: 0 }}>−{formatINR(summary.discount)}</dd>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: MUTED }}>
          <dt>Shipping</dt>
          <dd style={{ margin: 0 }}>{summary.shipping === 0 ? "Free" : formatINR(summary.shipping)}</dd>
        </div>
      </dl>

      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(30,30,30,0.08)", paddingTop: "1.25rem", fontSize: "1.125rem", fontWeight: 700, color: "#1E1E1E" }}>
        <span style={{ fontFamily: HEADING }}>Total</span>
        <span>{formatINR(summary.total)}</span>
      </div>
      <p style={{ fontSize: "0.75rem", color: MUTED, textAlign: "right", margin: "0.25rem 0 0" }}>Inclusive of all taxes</p>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid rgba(30,30,30,0.06)" }}>
        <Shield size={16} aria-hidden="true" style={{ color: "#4F6B5A", flexShrink: 0 }} />
        <span style={{ fontSize: "0.8rem", color: MUTED, lineHeight: 1.5 }}>Secure payment by Razorpay. We never see or store your card details.</span>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: "#FFFFFF", minHeight: "100vh", paddingBottom: "5rem", fontFamily: BODY }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 1rem 0" }} className="sm:px-6">
        <Link href="/cart" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", color: MUTED, textDecoration: "none", minHeight: "44px" }}>
          <ChevronLeft size={16} aria-hidden="true" />
          Back to bag
        </Link>

        <h1 style={{ fontFamily: HEADING, fontSize: "clamp(1.85rem, 4vw, 2.25rem)", fontWeight: 600, margin: "0.5rem 0 1rem" }}>Checkout</h1>

        {/* Progress */}
        <nav aria-label="Checkout progress" style={{ marginBottom: "1.75rem" }}>
          <ol style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", listStyle: "none", padding: 0, margin: 0, fontSize: "0.8125rem" }}>
            <li>
              <Link href="/cart" style={{ color: MUTED }}>1. Bag</Link>
            </li>
            <li aria-hidden="true" style={{ color: MUTED }}>›</li>
            <li aria-current="step" style={{ fontWeight: 700, color: "#1E1E1E" }}>2. Delivery &amp; payment</li>
            <li aria-hidden="true" style={{ color: MUTED }}>›</li>
            <li style={{ color: MUTED }}>3. Confirmation</li>
          </ol>
        </nav>

        {!signedIn && (
          <p style={{ fontSize: "0.875rem", color: MUTED, margin: "0 0 1.5rem" }}>
            Have an account?{" "}
            <Link href={`/account/login?redirect=${encodeURIComponent("/checkout")}`} style={{ color: BROWN, fontWeight: 600 }}>
              Sign in for faster checkout
            </Link>
          </p>
        )}

        {/* Phones: summary at the top, collapsed */}
        <details className="lg:hidden" style={{ border: "1px solid rgba(30,30,30,0.12)", marginBottom: "1.5rem", backgroundColor: "#FAFAF8" }}>
          <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "0.9rem 1rem", minHeight: "48px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, listStyle: "none" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              Order summary ({itemCount} item{itemCount !== 1 ? "s" : ""})
              <ChevronDown size={16} aria-hidden="true" />
            </span>
            <span>{formatINR(summary.total)}</span>
          </summary>
          <div style={{ padding: "0 1rem 1.25rem" }}>
            {renderSummary("mobile")}
            <Link href="/cart" style={{ display: "inline-block", marginTop: "1rem", color: BROWN, fontWeight: 600, fontSize: "0.875rem" }}>Edit bag</Link>
          </div>
        </details>

        {errorMessage && (
          <div
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            style={{ backgroundColor: "#FEF2F2", borderLeft: `4px solid ${ERROR}`, color: ERROR, padding: "1rem", marginBottom: "2rem", fontSize: "0.9rem", lineHeight: 1.5, outline: "none" }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handlePlaceOrder} noValidate className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 lg:gap-16 items-start">
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", minWidth: 0 }}>
            {/* Saved addresses (signed-in shoppers) */}
            {signedIn && addresses.length > 0 && (
              <fieldset style={{ border: "1px solid rgba(30,30,30,0.1)", padding: "1.5rem", margin: 0 }}>
                <legend style={{ fontFamily: HEADING, fontSize: "1.2rem", fontWeight: 600, padding: "0 0.5rem" }}>Deliver to</legend>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                  {addresses.map((addr) => {
                    const checked = selectedAddressId === addr.id;
                    return (
                      <label
                        key={addr.id}
                        style={{ display: "flex", gap: "0.75rem", padding: "1rem", border: checked ? "2px solid #1E1E1E" : "1px solid rgba(30,30,30,0.2)", cursor: "pointer", backgroundColor: checked ? "rgba(122,92,62,0.04)" : "transparent" }}
                      >
                        <input type="radio" name="saved-address" checked={checked} onChange={() => applyAddress(addr, true)} style={{ marginTop: "0.2rem", accentColor: BROWN }} />
                        <span style={{ fontSize: "0.8125rem", color: MUTED, lineHeight: 1.5 }}>
                          <strong style={{ display: "block", color: "#1E1E1E", fontSize: "0.875rem" }}>
                            {addr.name}
                            {addr.default ? " (default)" : ""}
                          </strong>
                          {addr.address1}
                          {addr.address2 ? `, ${addr.address2}` : ""}
                          <br />
                          {[addr.city, addr.province, addr.zip].filter(Boolean).join(", ")}
                        </span>
                      </label>
                    );
                  })}
                  <label
                    style={{ display: "flex", gap: "0.75rem", padding: "1rem", border: selectedAddressId === "new" ? "2px solid #1E1E1E" : "1px solid rgba(30,30,30,0.2)", cursor: "pointer", alignItems: "center" }}
                  >
                    <input type="radio" name="saved-address" checked={selectedAddressId === "new"} onChange={chooseNewAddress} style={{ accentColor: BROWN }} />
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Use a new address</span>
                  </label>
                </div>
              </fieldset>
            )}

            {/* Contact and delivery details */}
            <fieldset style={{ border: "1px solid rgba(30,30,30,0.1)", padding: "1.5rem", margin: 0, display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
              <legend style={{ fontFamily: HEADING, fontSize: "1.2rem", fontWeight: 600, padding: "0 0.5rem" }}>Contact &amp; delivery</legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-email" style={labelStyle}>Email address</label>
                  <input {...inputProps("email")} type="email" autoComplete="email" inputMode="email" onChange={(e) => setField("email", e.target.value)} />
                  {fieldError("email")}
                </div>
                <div>
                  <label htmlFor="checkout-phone" style={labelStyle}>Mobile number</label>
                  <div style={{ display: "flex" }}>
                    <span aria-hidden="true" style={{ display: "flex", alignItems: "center", padding: "0 0.75rem", border: "1px solid rgba(30,30,30,0.2)", borderRight: "none", fontSize: "0.9375rem", color: MUTED }}>+91</span>
                    <input
                      {...inputProps("phone")}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      maxLength={16}
                      aria-describedby={fieldErrors.phone ? "checkout-phone-error checkout-phone-hint" : "checkout-phone-hint"}
                      onChange={(e) => setField("phone", e.target.value)}
                    />
                  </div>
                  <p id="checkout-phone-hint" style={{ fontSize: "0.75rem", color: MUTED, margin: "0.375rem 0 0" }}>For delivery updates and the courier.</p>
                  {fieldError("phone")}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-firstName" style={labelStyle}>First name</label>
                  <input {...inputProps("firstName")} type="text" autoComplete="given-name" onChange={(e) => setField("firstName", e.target.value)} />
                  {fieldError("firstName")}
                </div>
                <div>
                  <label htmlFor="checkout-lastName" style={labelStyle}>Last name</label>
                  <input {...inputProps("lastName")} type="text" autoComplete="family-name" onChange={(e) => setField("lastName", e.target.value)} />
                  {fieldError("lastName")}
                </div>
              </div>

              <div>
                <label htmlFor="checkout-zip" style={labelStyle}>PIN code</label>
                <input
                  {...inputProps("zip")}
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9][0-9]{5}"
                  maxLength={6}
                  autoComplete="postal-code"
                  aria-describedby={[fieldErrors.zip && "checkout-zip-error", pinHint && "checkout-zip-hint"].filter(Boolean).join(" ") || undefined}
                  onChange={(e) => handleZipChange(e.target.value)}
                  style={{ maxWidth: "200px", ...(fieldErrors.zip ? { borderColor: ERROR } : {}) }}
                />
                <p id="checkout-zip-hint" aria-live="polite" style={{ fontSize: "0.75rem", color: MUTED, margin: pinHint ? "0.375rem 0 0" : 0 }}>
                  {pinHint && `Delivering to ${pinHint}`}
                </p>
                {fieldError("zip")}
              </div>

              <div>
                <label htmlFor="checkout-address1" style={labelStyle}>House number and street</label>
                <input {...inputProps("address1")} type="text" autoComplete="address-line1" onChange={(e) => setField("address1", e.target.value)} />
                {fieldError("address1")}
              </div>

              <div>
                <label htmlFor="checkout-address2" style={labelStyle}>Apartment, landmark (optional)</label>
                <input
                  id="checkout-address2"
                  name="address2"
                  type="text"
                  autoComplete="address-line2"
                  value={form.address2}
                  onChange={(e) => setField("address2", e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-city" style={labelStyle}>City</label>
                  <input {...inputProps("city")} type="text" autoComplete="address-level2" onChange={(e) => setField("city", e.target.value)} />
                  {fieldError("city")}
                </div>
                <div>
                  <label htmlFor="checkout-province" style={labelStyle}>State</label>
                  <select {...inputProps("province")} autoComplete="address-level1" onChange={(e) => setField("province", e.target.value)}>
                    <option value="">Choose your state</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {fieldError("province")}
                </div>
              </div>
              <p style={{ fontSize: "0.75rem", color: MUTED, margin: 0 }}>We deliver within India only.</p>
            </fieldset>

            {/* Payment */}
            <fieldset style={{ border: "1px solid rgba(30,30,30,0.1)", padding: "1.5rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <legend style={{ fontFamily: HEADING, fontSize: "1.2rem", fontWeight: 600, padding: "0 0.5rem" }}>Payment</legend>
              {(
                [
                  {
                    id: "online" as const,
                    icon: CreditCard,
                    label: "Pay online",
                    detail: "UPI, cards, net banking and wallets, through Razorpay's secure window.",
                  },
                  {
                    id: "cod" as const,
                    icon: Truck,
                    label: "Cash on delivery",
                    detail: `Pay ${formatINR(summary.total)} when your order is delivered. No extra charge.`,
                  },
                ]
              ).map((option) => {
                const checked = paymentMethod === option.id;
                return (
                  <label
                    key={option.id}
                    style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start", padding: "1rem", border: checked ? "2px solid #1E1E1E" : "1px solid rgba(30,30,30,0.2)", cursor: "pointer", backgroundColor: checked ? "rgba(122,92,62,0.04)" : "transparent" }}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={option.id}
                      checked={checked}
                      onChange={() => {
                        setPaymentMethod(option.id);
                        setErrorMessage("");
                      }}
                      style={{ marginTop: "0.2rem", accentColor: BROWN }}
                    />
                    <option.icon size={20} aria-hidden="true" style={{ color: "#1E1E1E", flexShrink: 0, marginTop: "0.05rem" }} />
                    <span>
                      <span style={{ display: "block", fontWeight: 600, fontSize: "0.9rem" }}>{option.label}</span>
                      <span style={{ display: "block", fontSize: "0.8125rem", color: MUTED, marginTop: "0.2rem", lineHeight: 1.5 }}>{option.detail}</span>
                    </span>
                  </label>
                );
              })}
              {paymentMethod === "online" && razorpay === "failed" && (
                <p role="alert" style={{ color: ERROR, fontSize: "0.8125rem", margin: 0 }}>
                  Online payment couldn&apos;t load. Check your connection and reload the page, or choose Cash on Delivery.
                </p>
              )}
            </fieldset>

            <div>
              <button type="submit" disabled={submitDisabled} aria-disabled={submitDisabled} style={{ ...primaryButton(submitDisabled), width: "100%", minHeight: "52px", fontSize: "0.9375rem" }}>
                {submitLabel}
              </button>
              <p style={{ fontSize: "0.8rem", color: MUTED, lineHeight: 1.6, margin: "0.85rem 0 0", textAlign: "center" }}>
                By placing this order you agree to our{" "}
                <Link href="/support/terms" style={{ color: BROWN }}>Terms</Link>,{" "}
                <Link href="/support/privacy-policy" style={{ color: BROWN }}>Privacy Policy</Link> and{" "}
                <Link href="/support/return-policy" style={{ color: BROWN }}>Return Policy</Link>.
              </p>
            </div>
          </div>

          {/* Desktop: summary beside the form */}
          <aside aria-labelledby="checkout-summary-heading" className="hidden lg:block lg:sticky lg:top-[100px]">
            <div style={{ padding: "1.75rem", border: "1px solid rgba(30,30,30,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid rgba(30,30,30,0.08)", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
                <h2 id="checkout-summary-heading" style={{ fontFamily: HEADING, fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Order Summary</h2>
                <Link href="/cart" style={{ color: BROWN, fontWeight: 600, fontSize: "0.8125rem" }}>Edit bag</Link>
              </div>
              {renderSummary("desktop")}
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function primaryButton(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.85rem 1.5rem",
    minHeight: "44px",
    backgroundColor: BROWN,
    color: "#FFFFFF",
    border: "none",
    borderRadius: "4px",
    fontFamily: BODY,
    fontSize: "0.875rem",
    fontWeight: 600,
    letterSpacing: "0.03em",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "opacity 0.15s ease",
  };
}

const secondaryLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.85rem 1.5rem",
  minHeight: "44px",
  border: "1px solid rgba(30,30,30,0.3)",
  borderRadius: "4px",
  color: "#1E1E1E",
  fontWeight: 600,
  fontSize: "0.875rem",
  textDecoration: "none",
};

function OrderConfirmation({ confirmation }: { confirmation: Confirmation }) {
  const { orderNumber, method, form, items, pricing, signedIn } = confirmation;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const trackHref = `/order-tracking?order=${encodeURIComponent(orderNumber)}`;
  const phone = normalizeIndianMobile(form.phone) ?? form.phone;

  return (
    <div style={{ backgroundColor: "#FAFAF8", minHeight: "100vh", padding: "2.5rem 1rem 5rem", fontFamily: BODY }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", backgroundColor: "#FFFFFF", border: "1px solid rgba(30,30,30,0.08)", padding: "2.5rem 1.5rem", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
        <div style={{ textAlign: "center" }}>
          <CheckCircle size={56} color="#4F6B5A" aria-hidden="true" style={{ margin: "0 auto 1rem" }} />
          <h1 ref={headingRef} tabIndex={-1} style={{ fontFamily: HEADING, fontSize: "2rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.5rem", outline: "none" }}>
            Thank you, your order is placed
          </h1>
          <p style={{ fontWeight: 600, fontSize: "1.1rem", margin: "0 0 0.75rem" }}>Order number: {orderNumber}</p>
          <p style={{ color: MUTED, lineHeight: 1.6, margin: "0 0 0.5rem" }}>
            {method === "cod" ? (
              <>Please pay <strong style={{ color: "#1E1E1E" }}>{formatINR(pricing.total)}</strong> in cash when your order is delivered.</>
            ) : (
              <>Your payment of <strong style={{ color: "#1E1E1E" }}>{formatINR(pricing.total)}</strong> was successful.</>
            )}
          </p>
          <p style={{ color: MUTED, lineHeight: 1.6, margin: 0 }}>
            A confirmation will be sent to <strong style={{ color: "#1E1E1E" }}>{form.email}</strong>.
          </p>
        </div>

        <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#F5F1EA", fontSize: "0.875rem", lineHeight: 1.6 }}>
          <strong>What happens next:</strong> orders are usually packed within {POLICY.processingDays} business days and delivered{" "}
          {POLICY.deliveryDays} business days after dispatch. Keep your order number to track it.
        </div>

        <section aria-labelledby="confirm-items" style={{ marginTop: "2rem" }}>
          <h2 id="confirm-items" style={{ fontFamily: HEADING, fontSize: "1.2rem", fontWeight: 600, margin: "0 0 1rem" }}>Your items</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {items.map((item) => (
              <li key={item.id} style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
                <div style={{ width: "48px", aspectRatio: "3/4", backgroundColor: "#F2F0EB", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <ShoppingBag size={18} aria-hidden="true" style={{ color: "rgba(0,0,0,0.25)" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem" }}>{item.title}</p>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: MUTED }}>
                    {item.options ? `${item.options} · ` : ""}Qty {item.quantity}
                  </p>
                </div>
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{formatINR(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl style={{ margin: "1.25rem 0 0", paddingTop: "1rem", borderTop: "1px solid rgba(30,30,30,0.08)", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: MUTED }}>
              <dt>Subtotal</dt>
              <dd style={{ margin: 0 }}>{formatINR(pricing.subtotal)}</dd>
            </div>
            {pricing.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#15803D" }}>
                <dt>Discount</dt>
                <dd style={{ margin: 0 }}>−{formatINR(pricing.discount)}</dd>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", color: MUTED }}>
              <dt>Shipping</dt>
              <dd style={{ margin: 0 }}>{pricing.shipping === 0 ? "Free" : formatINR(pricing.shipping)}</dd>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1rem" }}>
              <dt>Total (incl. taxes)</dt>
              <dd style={{ margin: 0 }}>{formatINR(pricing.total)}</dd>
            </div>
          </dl>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" style={{ marginTop: "2rem", fontSize: "0.875rem", lineHeight: 1.6 }}>
          <section aria-labelledby="confirm-address">
            <h2 id="confirm-address" style={{ fontFamily: HEADING, fontSize: "1.05rem", fontWeight: 600, margin: "0 0 0.5rem" }}>Delivery address</h2>
            <p style={{ margin: 0, color: MUTED }}>
              <strong style={{ color: "#1E1E1E" }}>{form.firstName} {form.lastName}</strong>
              <br />
              {form.address1}
              {form.address2 && <>, {form.address2}</>}
              <br />
              {form.city}, {form.province} {form.zip}
              <br />
              {phone}
            </p>
          </section>
          <section aria-labelledby="confirm-payment">
            <h2 id="confirm-payment" style={{ fontFamily: HEADING, fontSize: "1.05rem", fontWeight: 600, margin: "0 0 0.5rem" }}>Payment</h2>
            <p style={{ margin: 0, color: MUTED }}>{method === "cod" ? `Cash on delivery: pay ${formatINR(pricing.total)} at delivery` : "Paid online through Razorpay"}</p>
          </section>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "2.25rem" }}>
          {signedIn ? (
            <Link href="/account/orders" style={{ ...primaryButton(false), textDecoration: "none" }}>View my orders</Link>
          ) : (
            <Link href={trackHref} style={{ ...primaryButton(false), textDecoration: "none" }}>Track this order</Link>
          )}
          <Link href="/shop" style={secondaryLink}>Continue shopping</Link>
        </div>
        {!signedIn && (
          <p style={{ textAlign: "center", fontSize: "0.8rem", color: MUTED, margin: "1rem 0 0" }}>
            To track it later, use your order number and the email address above.
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const [razorpay, setRazorpay] = useState<RazorpayState>("loading");
  return (
    <>
      {/* Loaded as soon as the page is interactive, so "Pay" is ready by the time the form is filled. */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => setRazorpay("ready")}
        onError={() => setRazorpay("failed")}
      />
      <Suspense fallback={<PageLoader />}>
        <CheckoutContent razorpay={razorpay} />
      </Suspense>
    </>
  );
}
