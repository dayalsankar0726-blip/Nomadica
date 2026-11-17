// app/api/auth/reset/route.ts
//
// POST { resetUrl, password } sets a new password using the link from Shopify's reset
// email (customerResetByUrl), then signs the customer in.
//
// For the email link to open our page instead of Shopify's, the store's "Customer
// account password reset" email template must link to
//   https://<site>/account/reset-password?url={{ customer.reset_password_url | url_encode }}
import { NextResponse } from 'next/server';
import { devSamplesEnabled } from '@/lib/devMocks';
import { passwordProblem } from '@/app/account/_lib/validation';
import { isShopifyResetUrl } from '@/app/account/_lib/resetUrl';
import { allowPasswordRequest, setSessionCookies, storefrontClient } from '../_lib/session';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const resetUrl = typeof body?.resetUrl === 'string' ? body.resetUrl.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!isShopifyResetUrl(resetUrl)) {
    return NextResponse.json(
      { error: 'This reset link is not valid. Please request a new one.', code: 'INVALID_LINK' },
      { status: 400 }
    );
  }
  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (!allowPasswordRequest(request, 'reset')) {
    return NextResponse.json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, { status: 429, headers: { 'Retry-After': '900' } });
  }

  // Local development without Shopify: accept the new password without signing in.
  if (devSamplesEnabled()) return NextResponse.json({ success: true, signedIn: false });

  const client = storefrontClient();
  if (!client) return NextResponse.json({ error: 'Password reset is not available right now.' }, { status: 503 });

  try {
    const data = await client.request(
      `mutation ResetCustomerByUrl($resetUrl: URL!, $password: String!) {
        customerResetByUrl(resetUrl: $resetUrl, password: $password) {
          customer { email }
          customerAccessToken { accessToken }
          customerUserErrors { code message }
        }
      }`,
      { resetUrl, password }
    );
    const payload = data?.customerResetByUrl;
    const errors: Array<{ code?: string; message?: string }> = payload?.customerUserErrors || [];
    if (errors.length > 0 || !payload?.customer) {
      const expired = errors.some((e) => e.code === 'INVALID' || e.code === 'TOKEN_INVALID' || /expired|invalid/i.test(e.message || ''));
      return NextResponse.json(
        expired
          ? { error: 'This reset link has expired or was already used. Please request a new one.', code: 'INVALID_LINK' }
          : { error: errors[0]?.message || "We couldn't reset your password. Please try again." },
        { status: 400 }
      );
    }

    const accessToken = payload.customerAccessToken?.accessToken;
    if (accessToken) await setSessionCookies(accessToken, payload.customer.email);
    return NextResponse.json({ success: true, signedIn: !!accessToken });
  } catch (error) {
    console.error('[auth/reset] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We couldn't reset your password right now. Please try again." }, { status: 502 });
  }
}
