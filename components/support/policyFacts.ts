// components/support/policyFacts.ts
// Policy sentences built from POLICY in lib/site.ts, so every support page says the same thing.
import { POLICY } from "@/lib/site";
import { formatINR } from "@/lib/pricing";

/** Date shown as "Last updated" on support pages whose text changed in this revision. */
export const POLICY_LAST_UPDATED = "14 November 2026";

export const FEE = formatINR(POLICY.shippingFee);
export const FREE_FROM = formatINR(POLICY.freeShippingThreshold);

export const SHIPPING_FEE_TEXT = `Shipping is ${FEE} on orders below ${FREE_FROM}, and free on orders of ${FREE_FROM} or more.`;
export const DELIVERY_TIME_TEXT = `We pack orders within ${POLICY.processingDays} business days. Once dispatched, delivery takes ${POLICY.deliveryDays} business days.`;
export const INDIA_ONLY_TEXT = "We currently ship within India only.";
export const RETURN_WINDOW_TEXT = `You can request a return within ${POLICY.returnDays} days of delivery.`;
export const DAMAGE_TEXT = `If an item arrives damaged or you receive the wrong item, tell us within ${POLICY.damageReportHours} hours of delivery, with photos.`;
export const REFUND_TEXT = `Approved refunds are processed within ${POLICY.refundDays} business days to your original payment method. Your bank may take an additional 5–10 business days to show the credit.`;
export const CANCEL_TEXT = `You can cancel an order yourself from My Orders until it is packed. Prepaid orders are refunded in full automatically, within ${POLICY.refundDays} business days. Once an order is packed or dispatched it can no longer be cancelled; you can request a return after delivery instead. The same applies to cash on delivery orders.`;
export const CHANGE_TEXT = "Until your order is packed, you can also lower the quantity of an item or remove an item from My Orders.";
export const PAYMENT_METHODS_TEXT = "UPI, credit and debit cards, net banking and wallets (processed securely by Razorpay), and cash on delivery.";
