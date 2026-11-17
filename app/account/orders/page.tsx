// app/account/orders/page.tsx
"use client";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { HelpCircle, Package, Search } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { CancelOrderDialog, type CancelDialogOrder } from "@/components/orders/CancelOrderDialog";
import { formatINR } from "@/lib/pricing";
import { POLICY } from "@/lib/site";
import { AccountShell } from "../_components/AccountShell";
import { BusyButton } from "../_components/BusyButton";
import { OrderItemImage, StatusBadge } from "../_components/OrderBits";
import { useRequireAuth } from "../_components/useRequireAuth";
import { requestJson } from "../_lib/requestJson";
import { buyAgainLines, formatDate, mapOrder, returnMailto, type OrderView } from "../_lib/orders";
import { STAGE_FILTERS, STAGE_LABELS, canRequestReturn, type OrderStage } from "../_lib/orderStatus";
import { addLinesToBag } from "../_lib/buyAgain";

type SortKey = "NEWEST" | "OLDEST" | "PRICE_HIGH" | "PRICE_LOW";
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "NEWEST", label: "Newest first" },
  { key: "OLDEST", label: "Oldest first" },
  { key: "PRICE_HIGH", label: "Price: high to low" },
  { key: "PRICE_LOW", label: "Price: low to high" },
];

function OrderCard({ order, onEdit, onCancel }: { order: OrderView; onEdit: (target: CancelDialogOrder) => void; onCancel: (target: CancelDialogOrder) => void }) {
  const [adding, setAdding] = useState(false);
  const [bagMessage, setBagMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const { stage, partial } = order.status;
  const lines = buyAgainLines(order.items);
  const detailHref = `/account/orders/${order.number}`;

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

  return (
    <article
      aria-labelledby={`order-${order.number}`}
      style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", overflow: "hidden" }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem 1rem", flexWrap: "wrap", padding: "1.1rem 1.5rem", backgroundColor: "#FAF9F7", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem 0.75rem", flexWrap: "wrap" }}>
          <h2 id={`order-${order.number}`} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9rem", fontWeight: 700, color: "#1E1E1E", margin: 0 }}>
            Order {order.orderNumber}
          </h2>
          <span className="acct-muted">Placed on {formatDate(order.createdAt)}</span>
          {stage !== "CANCELLED" && (
            <span className="acct-muted">
              · {order.units} {order.units === 1 ? "item" : "items"}
            </span>
          )}
          <StatusBadge status={order.status} />
        </div>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600, color: "#1E1E1E" }}>{formatINR(order.total)}</span>
      </header>

      <div style={{ padding: "1.25rem 1.5rem" }}>
        <p className="acct-muted" style={{ color: "#1E1E1E", marginBottom: "1rem" }}>
          {stage === "CANCELLED" && order.cancelledAt ? `Cancelled on ${formatDate(order.cancelledAt)}.` : order.status.detail}
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "1.25rem" }}>
          {order.items.map((item, idx) => {
            const details = [item.size && `Size ${item.size}`, item.color && `Colour ${item.color}`, `Qty ${item.quantity}`].filter(Boolean).join(" · ");
            return (
              <li key={`${item.lineId}-${idx}`} style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <OrderItemImage src={item.image} />
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.3rem" }}>
                    {item.productHandle ? (
                      <Link href={`/products/${encodeURIComponent(item.productHandle)}`} style={{ color: "inherit", textDecoration: "none" }}>
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                  </h3>
                  <p className="acct-muted">
                    {item.quantity === 0 ? "You removed this item." : details}
                    {item.cancelledQuantity > 0 && item.quantity > 0 && ` (${item.cancelledQuantity} removed)`}
                  </p>
                  {item.quantity > 0 && <p className="acct-muted">{formatINR(item.paidUnitPrice * item.quantity)}</p>}
                </div>
                {order.canCancel && item.quantity > 0 && (
                  <button
                    type="button"
                    className="acct-btn-outline acct-btn-small"
                    aria-label={`Edit ${item.title}`}
                    onClick={() =>
                      onEdit({
                        id: order.id,
                        orderNumber: order.orderNumber,
                        total: order.total,
                        isPrepaid: order.isPrepaid,
                        item: {
                          id: item.lineId,
                          title: item.title,
                          quantity: item.quantity,
                          unitPrice: item.paidUnitPrice,
                          isLastItem: order.units === item.quantity,
                          image: item.image || undefined,
                          details: [item.size && `Size ${item.size}`, item.color && `Colour ${item.color}`].filter(Boolean).join(" · "),
                        },
                      })
                    }
                  >
                    Edit item
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <footer style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", padding: "1rem 1.5rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <Link href={detailHref} className="acct-btn acct-btn-small">
          {stage === "SHIPPED" ? "Track order" : "View details"}
        </Link>
        {lines.length > 0 && (
          <BusyButton variant="outline" small busy={adding} busyLabel="Adding…" onClick={buyAgain}>
            Buy again
          </BusyButton>
        )}
        {canRequestReturn(stage, partial) && (
          <a href={returnMailto(order.orderNumber)} className="acct-btn-outline acct-btn-small">
            Request a return
          </a>
        )}
        {order.canCancel && (
          <button
            type="button"
            className="acct-btn-outline acct-btn-small"
            style={{ color: "#B91C1C", borderColor: "rgba(185,28,28,0.5)", marginLeft: "auto" }}
            onClick={() => onCancel({ id: order.id, orderNumber: order.orderNumber, total: order.total, isPrepaid: order.isPrepaid })}
          >
            Cancel order
          </button>
        )}
        {bagMessage && (
          <p role={bagMessage.kind === "error" ? "alert" : "status"} className={`acct-alert acct-alert-${bagMessage.kind}`} style={{ flexBasis: "100%" }}>
            {bagMessage.text}
          </p>
        )}
        {order.canCancel && (
          <p className="acct-hint" style={{ flexBasis: "100%", margin: 0 }}>
            You can edit items or cancel until we start packing.
          </p>
        )}
        {canRequestReturn(stage, partial) && (
          <p className="acct-hint" style={{ flexBasis: "100%", margin: 0 }}>
            Returns are accepted within {POLICY.returnDays} days of delivery.
          </p>
        )}
      </footer>
    </article>
  );
}

function OrdersContent() {
  const { isAuthenticated, verified } = useRequireAuth();
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStage>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("NEWEST");
  const [cancelTarget, setCancelTarget] = useState<CancelDialogOrder | null>(null);
  const [notice, setNotice] = useState("");
  const noticeRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await requestJson<{ orders?: { edges?: Array<{ node: unknown }> } }>("/api/orders");
      setOrders((data.orders?.edges || []).map((e) => mapOrder(e.node)));
      setState("ready");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "We couldn't load your orders.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Loading data from the server once signed in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const handleCancelOrder = async (reason: string, note: string, quantity: number) => {
    if (!cancelTarget) return;
    const { item } = cancelTarget;
    const result = item
      ? await requestJson<{ message?: string }>(`/api/orders/${encodeURIComponent(cancelTarget.id)}/items/cancel`, { method: "POST", json: { itemId: item.id, quantity, reason, note } })
      : await requestJson<{ message?: string }>(`/api/orders/${encodeURIComponent(cancelTarget.id)}/cancel`, { method: "POST", json: { reason, note } });
    setCancelTarget(null);
    setNotice(result.message || (item ? `${item.title} has been updated.` : `Order ${cancelTarget.orderNumber} has been cancelled.`));
    // Show Shopify's own totals and statuses rather than estimating them here.
    await load();
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders
      .filter((o) => (statusFilter === "ALL" || o.status.stage === statusFilter))
      .filter((o) => !q || o.orderNumber.toLowerCase().includes(q) || o.items.some((i) => i.title.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sortBy === "OLDEST") return a.createdAt.getTime() - b.createdAt.getTime();
        if (sortBy === "PRICE_HIGH") return b.total - a.total;
        if (sortBy === "PRICE_LOW") return a.total - b.total;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }, [orders, searchQuery, statusFilter, sortBy]);

  if (!isAuthenticated) return <PageLoader label={verified ? "Taking you to sign in" : "Loading your orders"} />;

  const filtersActive = searchQuery.trim() !== "" || statusFilter !== "ALL";

  return (
    <AccountShell
      title="My orders"
      actions={
        <Link href="/support" className="acct-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: "'Montserrat', sans-serif", fontSize: "0.85rem", minHeight: 40 }}>
          <HelpCircle size={16} aria-hidden="true" />
          Need help?
        </Link>
      }
    >
      {notice && (
        <div ref={noticeRef} tabIndex={-1} role="status" className="acct-alert acct-alert-success" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}>
          <span>{notice}</span>
          <button type="button" className="acct-icon-btn" onClick={() => setNotice("")} aria-label="Dismiss message" style={{ width: 32, height: 32, color: "#166534" }}>
            ×
          </button>
        </div>
      )}

      {state === "ready" && orders.length > 0 && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.75rem", alignItems: "flex-end" }}>
          <div style={{ position: "relative", flex: "1 1 260px" }}>
            <label htmlFor="orders-search" className="acct-label">
              Search orders
            </label>
            <Search size={18} aria-hidden="true" style={{ position: "absolute", left: "0.9rem", bottom: "13px", color: "rgba(30,30,30,0.6)" }} />
            <input
              id="orders-search"
              type="search"
              className="acct-input acct-input-boxed"
              style={{ paddingLeft: "2.6rem" }}
              placeholder="Order number or product"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ flex: "0 1 200px" }}>
            <label htmlFor="orders-status" className="acct-label">
              Status
            </label>
            <select id="orders-status" className="acct-input acct-input-boxed" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | OrderStage)}>
              <option value="ALL">All orders</option>
              {STAGE_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: "0 1 200px" }}>
            <label htmlFor="orders-sort" className="acct-label">
              Sort by
            </label>
            <select id="orders-sort" className="acct-input acct-input-boxed" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {state === "loading" ? (
        <PageLoader label="Loading your orders" />
      ) : state === "error" ? (
        <div role="alert" className="acct-card" style={{ textAlign: "center" }}>
          <p className="acct-muted" style={{ color: "#7F1D1D", marginBottom: "1rem" }}>
            {loadError}
          </p>
          <button
            type="button"
            className="acct-btn"
            onClick={() => {
              setState("loading");
              load();
            }}
          >
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="acct-card" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
          <Package size={36} aria-hidden="true" style={{ color: "rgba(30,30,30,0.35)", marginBottom: "1rem" }} />
          <h2 className="acct-card-title" style={{ marginBottom: "0.5rem" }}>
            No orders yet
          </h2>
          <p className="acct-muted" style={{ marginBottom: "1.5rem" }}>
            When you place an order, you&apos;ll be able to track it here.
          </p>
          <Link href="/shop" className="acct-btn">
            Start shopping
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="acct-card" style={{ textAlign: "center" }} role="status">
          <p className="acct-muted" style={{ marginBottom: "1rem" }}>
            No orders match your search.
          </p>
          {filtersActive && (
            <button
              type="button"
              className="acct-btn-outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
            >
              Clear search and filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <p className="acct-muted" aria-live="polite">
            {filtered.length === orders.length ? `${orders.length} ${orders.length === 1 ? "order" : "orders"}` : `Showing ${filtered.length} of ${orders.length} orders`}
          </p>
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} onEdit={setCancelTarget} onCancel={setCancelTarget} />
          ))}
        </div>
      )}

      {cancelTarget && <CancelOrderDialog order={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancelOrder} />}
    </AccountShell>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <OrdersContent />
    </Suspense>
  );
}
