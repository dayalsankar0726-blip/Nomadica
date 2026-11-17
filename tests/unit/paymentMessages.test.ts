import { describe, expect, it } from "vitest";
import {
  cancelledPaymentMessage,
  failedPaymentMessage,
  unconfirmedPaymentMessage,
} from "@/lib/checkout/paymentMessages";

describe("failed payment messages", () => {
  it("shows Razorpay's reason and tells the customer they weren't charged", () => {
    const msg = failedPaymentMessage({
      code: "BAD_REQUEST_ERROR",
      description: "Your payment has been declined as the card has insufficient funds",
      reason: "insufficient_funds",
    });
    expect(msg).toContain("Payment failed: Your payment has been declined as the card has insufficient funds.");
    expect(msg).toContain("You have not been charged.");
    expect(msg).toContain("Cash on Delivery");
  });

  it("hides technical or missing reasons behind a plain message", () => {
    expect(failedPaymentMessage({ description: "undefined" })).toContain("Your payment could not be completed.");
    expect(failedPaymentMessage({})).toContain("Your payment could not be completed.");
    expect(failedPaymentMessage(null)).toContain("Your payment could not be completed.");
  });

  it("doesn't double the full stop", () => {
    expect(failedPaymentMessage({ description: "Payment was cancelled by the bank." })).toContain("bank. You have");
  });

  it("separates a cancelled payment from a failed one", () => {
    expect(cancelledPaymentMessage()).toMatch(/^Payment cancelled\. You have not been charged\./);
  });

  it("tells the customer not to pay again when the payment went through but wasn't confirmed", () => {
    const msg = unconfirmedPaymentMessage("pay_123");
    expect(msg).toContain("payment reference pay_123");
    expect(msg).toContain("don't pay again");
  });
});
