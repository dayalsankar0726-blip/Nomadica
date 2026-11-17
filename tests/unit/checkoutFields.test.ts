import { describe, expect, it } from "vitest";
import {
  fieldForMessage,
  FIELD_MESSAGES,
  isValidPin,
  matchIndianState,
  normalizeIndianMobile,
  validateShippingFields,
} from "@/app/checkout/checkoutFields";

describe("normalizeIndianMobile", () => {
  it("normalises valid numbers to +91 form", () => {
    expect(normalizeIndianMobile("9876543210")).toBe("+919876543210");
    expect(normalizeIndianMobile("+91 98765-43210")).toBe("+919876543210");
    expect(normalizeIndianMobile("098765 43210")).toBe("+919876543210");
  });

  it("rejects landlines, short numbers and other countries", () => {
    expect(normalizeIndianMobile("4422334455")).toBeNull();
    expect(normalizeIndianMobile("987654321")).toBeNull();
    expect(normalizeIndianMobile("+1 4155552671")).toBeNull();
    expect(normalizeIndianMobile("")).toBeNull();
  });
});

describe("isValidPin", () => {
  it("accepts 6-digit PINs not starting with 0", () => {
    expect(isValidPin("600001")).toBe(true);
    expect(isValidPin("060001")).toBe(false);
    expect(isValidPin("60001")).toBe(false);
    expect(isValidPin("60000a")).toBe(false);
  });
});

describe("matchIndianState", () => {
  it("maps India Post spellings to dropdown names", () => {
    expect(matchIndianState("Tamil Nadu")).toBe("Tamil Nadu");
    expect(matchIndianState("tamil nadu")).toBe("Tamil Nadu");
    expect(matchIndianState("Jammu & Kashmir")).toBe("Jammu and Kashmir");
    expect(matchIndianState("Pondicherry")).toBe("Puducherry");
    expect(matchIndianState("Atlantis")).toBe("");
  });
});

describe("validateShippingFields", () => {
  const valid = {
    email: "a@b.co", phone: "9876543210", firstName: "Asha", lastName: "Rao",
    address1: "12 MG Road", city: "Chennai", province: "Tamil Nadu", zip: "600001",
  };

  it("returns no errors for a valid form", () => {
    expect(validateShippingFields(valid)).toEqual({});
  });

  it("returns a friendly message per invalid field", () => {
    const errors = validateShippingFields({ ...valid, phone: "123", zip: "", firstName: " " });
    expect(errors).toEqual({ phone: FIELD_MESSAGES.phone, zip: FIELD_MESSAGES.zip, firstName: FIELD_MESSAGES.firstName });
  });

  it("maps a server message back to its field", () => {
    expect(fieldForMessage(FIELD_MESSAGES.zip)).toBe("zip");
    expect(fieldForMessage("Checkout failed")).toBeNull();
  });
});
