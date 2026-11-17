// app/checkout/checkoutFields.ts
//
// Shipping form rules shared by the checkout page (inline errors) and the server
// (lib/checkout/validation.ts), so both give the shopper the same friendly message.
// Client-safe: no server imports.

/** Indian states and union territories, for the State dropdown. */
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

/** Spellings India Post (and older saved addresses) use, mapped to the dropdown's names. */
const STATE_ALIASES: Record<string, string> = {
  'andaman & nicobar islands': 'Andaman and Nicobar Islands',
  'andaman and nicobar': 'Andaman and Nicobar Islands',
  'jammu & kashmir': 'Jammu and Kashmir',
  'dadra & nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman & diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'new delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  'pondicherry': 'Puducherry',
  'orissa': 'Odisha',
  'uttaranchal': 'Uttarakhand',
};

/** The dropdown name for a state as typed or returned by India Post, or "" if unknown. */
export function matchIndianState(name: string | null | undefined): string {
  const key = String(name ?? '').trim().toLowerCase();
  if (!key) return '';
  const exact = INDIAN_STATES.find((s) => s.toLowerCase() === key);
  return exact ?? STATE_ALIASES[key] ?? '';
}

/** Indian PIN codes are 6 digits and never start with 0. */
export const PIN_PATTERN = /^[1-9][0-9]{5}$/;

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin.trim());
}

/**
 * An Indian mobile number in +91XXXXXXXXXX form, or null if it isn't one.
 * Accepts spaces, dashes and a leading +91, 91 or 0. Mobile numbers start with 6–9.
 */
export function normalizeIndianMobile(input: string | null | undefined): string | null {
  let digits = String(input ?? '').replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (/^91\d{10}$/.test(digits)) digits = digits.slice(2);
  else if (/^0\d{10}$/.test(digits)) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export type ShippingField = 'email' | 'phone' | 'firstName' | 'lastName' | 'address1' | 'city' | 'province' | 'zip';

/** Fields in the order they appear on the form, so the first error is the first field. */
export const SHIPPING_FIELDS: ShippingField[] = ['email', 'phone', 'firstName', 'lastName', 'address1', 'city', 'province', 'zip'];

export const FIELD_MESSAGES: Record<ShippingField, string> = {
  email: 'Enter a valid email address, like name@example.com.',
  phone: 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.',
  firstName: 'Enter your first name.',
  lastName: 'Enter your last name.',
  address1: 'Enter your house number and street.',
  city: 'Enter your city.',
  province: 'Choose your state.',
  zip: 'Enter a 6-digit PIN code.',
};

export type ShippingValues = Record<ShippingField, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Per-field error messages; empty when everything is valid. */
export function validateShippingFields(values: ShippingValues): Partial<Record<ShippingField, string>> {
  const errors: Partial<Record<ShippingField, string>> = {};
  const v = (f: ShippingField) => String(values[f] ?? '').trim();
  if (!EMAIL.test(v('email'))) errors.email = FIELD_MESSAGES.email;
  if (!normalizeIndianMobile(v('phone'))) errors.phone = FIELD_MESSAGES.phone;
  for (const f of ['firstName', 'lastName', 'address1', 'city', 'province'] as const) {
    if (!v(f)) errors[f] = FIELD_MESSAGES[f];
  }
  if (!isValidPin(v('zip'))) errors.zip = FIELD_MESSAGES.zip;
  return errors;
}

/** The field a server error message belongs to, so it can be shown next to that field. */
export function fieldForMessage(message: string | null | undefined): ShippingField | null {
  const entry = (Object.entries(FIELD_MESSAGES) as [ShippingField, string][]).find(([, m]) => m === message);
  return entry ? entry[0] : null;
}
