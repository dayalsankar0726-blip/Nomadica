// app/api/auth/recover/route.ts
//
// POST { email } asks Shopify to email a password reset link (customerRecover).
// The reply is the same whether or not an account exists, so this can't be used to
// find out who has an account.
import { NextResponse } from 'next/server';
import { devSamplesEnabled } from '@/lib/devMocks';
import { isValidEmail } from '@/app/account/_lib/validation';
import { allowPasswordRequest, storefrontClient } from '../_lib/session';

const SENT = "If an account exists for that email, we've sent a link to reset your password. It can take a few minutes to arrive, so please check your spam folder too.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  if (!allowPasswordRequest(request, 'recover', email)) {
    return NextResponse.json(
      { error: 'Too many reset requests. Please wait 15 minutes and try again.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }

  // Local development without Shopify: pretend the email was sent.
  if (devSamplesEnabled()) return NextResponse.json({ success: true, message: SENT });

  const client = storefrontClient();
  if (!client) return NextResponse.json({ error: 'Password reset is not available right now.' }, { status: 503 });

  try {
    const data = await client.request(
      `mutation RecoverCustomer($email: String!) {
        customerRecover(email: $email) {
          customerUserErrors { code message }
        }
      }`,
      { email }
    );
    const errors: Array<{ code?: string }> = data?.customerRecover?.customerUserErrors || [];
    // Shopify reports unknown emails as an error; hide that so the reply is always the same.
    const real = errors.filter((e) => e.code && !['UNIDENTIFIED_CUSTOMER', 'CUSTOMER_DISABLED'].includes(e.code));
    if (real.length > 0) console.error('[auth/recover] Shopify returned:', real.map((e) => e.code).join(', '));
    return NextResponse.json({ success: true, message: SENT });
  } catch (error) {
    console.error('[auth/recover] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We couldn't send the reset email right now. Please try again in a few minutes." }, { status: 502 });
  }
}
