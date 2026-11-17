import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { CheckoutError, readShipping, verifySignature } from "@/lib/checkout/validation";

const SECRET = "test_secret";
const sign = (orderId: string, paymentId: string) =>
  crypto.createHmac("sha256", SECRET).update(`${orderId}|${paymentId}`).digest("hex");

describe("verifySignature", () => {
  it("accepts a correct Razorpay signature", () => {
    expect(verifySignature("order_1", "pay_1", sign("order_1", "pay_1"), SECRET)).toBe(true);
  });

  it("rejects a signature for a different payment", () => {
    expect(verifySignature("order_1", "pay_2", sign("order_1", "pay_1"), SECRET)).toBe(false);
  });

  it("rejects malformed signatures without throwing", () => {
    expect(verifySignature("order_1", "pay_1", "short", SECRET)).toBe(false);
    expect(verifySignature("order_1", "pay_1", "", SECRET)).toBe(false);
  });
});

describe("readShipping", () => {
  const valid = {
    email: "  Traveler@Example.com ",
    firstName: "Asha",
    lastName: "Rao",
    address1: "12 MG Road",
    city: "Chennai",
    province: "Tamil Nadu",
    zip: "600001",
    phone: "98765 43210",
  };

  it("trims and normalises valid details", () => {
    const details = readShipping(valid);
    expect(details.email).toBe("traveler@example.com");
    expect(details.address2).toBe("");
    expect(details.phone).toBe("+919876543210");
  });

  it("requires an Indian mobile number", () => {
    expect(() => readShipping({ ...valid, phone: "" })).toThrow(/mobile number/);
    expect(() => readShipping({ ...valid, phone: "5876543210" })).toThrow(/mobile number/);
    expect(() => readShipping({ ...valid, phone: "98765" })).toThrow(/mobile number/);
  });

  it("accepts +91, 91 and 0 prefixes", () => {
    for (const phone of ["+91 98765 43210", "919876543210", "09876543210", "98765-43210"]) {
      expect(readShipping({ ...valid, phone }).phone).toBe("+919876543210");
    }
  });

  it("names the field that failed", () => {
    try {
      readShipping({ ...valid, zip: "12" });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CheckoutError);
      expect((err as CheckoutError).field).toBe("zip");
    }
  });

  it("rejects an invalid email", () => {
    expect(() => readShipping({ ...valid, email: "not-an-email" })).toThrow(CheckoutError);
  });

  it("rejects a PIN code that is not 6 digits", () => {
    expect(() => readShipping({ ...valid, zip: "1234" })).toThrow(/PIN code/);
    expect(() => readShipping({ ...valid, zip: "060001" })).toThrow(/PIN code/);
  });

  it("rejects missing required fields", () => {
    expect(() => readShipping({ ...valid, city: "" })).toThrow(/city/i);
  });

  it("ignores non-string values", () => {
    expect(() => readShipping({ ...valid, firstName: { $ne: "" } })).toThrow(/first name/);
  });
});
