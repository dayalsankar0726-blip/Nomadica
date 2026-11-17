// app/account/_lib/orders.ts
//
// Turns the /api/orders response into what the My Orders page shows.
import { SITE } from "@/lib/site";
import { orderStatus, unitsRemaining, type OrderStatus } from "./orderStatus";

export interface OrderItemView {
  /** The line's ID as /api/orders gives it; the item-cancel API expects this. */
  lineId: string;
  /** Shopify variant ID ('' when the product was deleted). */
  variantId: string;
  title: string;
  quantity: number;
  cancelledQuantity: number;
  paidUnitPrice: number;
  size: string | null;
  color: string | null;
  image: string | null;
  productHandle: string | null;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  /** Digits of the order number, used in /account/orders/<digits>. */
  number: string;
  createdAt: Date;
  cancelledAt: Date | null;
  status: OrderStatus;
  total: number;
  canCancel: boolean;
  isPrepaid: boolean;
  units: number;
  items: OrderItemView[];
}

/** "Size / Colour" from a variant title like "M / Black". Returns nulls for "Default Title". */
export function variantParts(title: string | null | undefined): { size: string | null; color: string | null } {
  if (!title || title === "Default Title") return { size: null, color: null };
  const [size, color] = title.split("/").map((p) => p.trim());
  return { size: size || null, color: color || null };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapOrder(node: any): OrderView {
  const items: OrderItemView[] = (node.lineItems?.edges || []).map((edge: any) => {
    const item = edge.node || {};
    const unit = parseFloat(item.variant?.price?.amount ?? "0") || 0;
    const paid = parseFloat(item.paidUnitPrice ?? "");
    const { size, color } = variantParts(item.variant?.title);
    return {
      // The API uses the variant ID as the line ID.
      variantId: item.variant?.id || (String(item.id || "").includes("ProductVariant") ? item.id : ""),
      title: item.title || "Item",
      quantity: Math.max(0, item.quantity ?? 0),
      cancelledQuantity: Math.max(0, item.cancelledQuantity ?? 0),
      paidUnitPrice: Number.isFinite(paid) ? paid : unit,
      size,
      color,
      image: item.variant?.image?.url || null,
      productHandle: item.variant?.productHandle || null,
      lineId: String(item.id || ""),
    };
  });
  const orderNumber = String(node.orderNumber || `#${String(node.id).split("/").pop()}`);
  return {
    id: node.id,
    orderNumber,
    number: orderNumber.replace(/[^0-9]/g, ""),
    createdAt: new Date(node.createdAt),
    cancelledAt: node.cancelledAt ? new Date(node.cancelledAt) : null,
    status: orderStatus({
      cancelledAt: node.cancelledAt,
      fulfillmentStatus: node.fulfillmentStatus,
      financialStatus: node.financialStatus,
      sampleStatus: node.status,
      // Only development sample data says "Delivered"; Shopify's Storefront API has no delivery status.
      delivered: String(node.status || "").toUpperCase() === "DELIVERED",
    }),
    total: parseFloat(node.totalPrice?.amount ?? "0") || 0,
    canCancel: !!node.canCancel && !node.cancelledAt,
    isPrepaid: node.isPrepaid !== false,
    units: unitsRemaining(items),
    items,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function formatDate(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Cart lines to buy an order again: the same variants and quantities, skipping deleted products. */
export function buyAgainLines(items: Array<{ variantId: string; quantity: number; cancelledQuantity: number }>) {
  return items
    .filter((i) => i.variantId.startsWith("gid://shopify/ProductVariant/"))
    .map((i) => ({ merchandiseId: i.variantId, quantity: i.quantity > 0 ? i.quantity : i.cancelledQuantity }))
    .filter((l) => l.quantity > 0);
}

/** Email link to ask for a return; there is no returns system, so support handles it. */
export function returnMailto(orderNumber: string) {
  const subject = encodeURIComponent(`Return request for order ${orderNumber}`);
  const body = encodeURIComponent(
    `Hello ${SITE.name} team,\n\nI'd like to return items from order ${orderNumber}.\n\nItems to return:\nReason:\n\nThank you.`
  );
  return `mailto:${SITE.supportEmail}?subject=${subject}&body=${body}`;
}
