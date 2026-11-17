// app/account/_lib/validation.ts
//
// Form rules for the account pages, shared by the browser (live hints) and the
// server routes (which enforce them). No server-only imports.

/** Shopify rejects customer passwords longer than 40 characters. */
export const PASSWORD_MAX = 40;
export const PASSWORD_MIN = 8;

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: `${PASSWORD_MIN}–${PASSWORD_MAX} characters`, test: (p) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX },
  { id: 'letter', label: 'At least one letter', test: (p) => /[A-Za-z]/.test(p) },
  { id: 'number', label: 'At least one number', test: (p) => /\d/.test(p) },
  { id: 'spaces', label: 'No spaces at the start or end', test: (p) => p.length > 0 && p.trim() === p },
];

/** The first rule the password breaks, as a sentence, or null when it is fine. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) return 'Please enter a password.';
  const broken = PASSWORD_RULES.find((rule) => !rule.test(password));
  if (!broken) return null;
  switch (broken.id) {
    case 'length':
      return password.length < PASSWORD_MIN
        ? `Your password needs at least ${PASSWORD_MIN} characters.`
        : `Your password can have at most ${PASSWORD_MAX} characters.`;
    case 'letter':
      return 'Your password needs at least one letter.';
    case 'number':
      return 'Your password needs at least one number.';
    default:
      return "Your password can't start or end with a space.";
  }
}

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * A 10-digit Indian mobile number (starting 6–9) in +91XXXXXXXXXX form, or null.
 * Accepts spaces, dashes and a leading +91, 91 or 0.
 */
export function normalizeIndianMobile(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let digits = value.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

/** The 10 digits of a stored mobile number, for showing in a form field. */
export function mobileDigits(value: unknown): string {
  const normalized = normalizeIndianMobile(value);
  return normalized ? normalized.slice(3) : typeof value === 'string' ? value : '';
}

/** Indian PIN code: six digits, not starting with 0. */
export function isValidPin(value: unknown): boolean {
  return typeof value === 'string' && /^[1-9]\d{5}$/.test(value.trim());
}
