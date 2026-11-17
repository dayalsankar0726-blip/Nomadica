// app/api/auth/register/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { devSamplesEnabled } from '@/lib/devMocks';
import { isValidEmail, normalizeIndianMobile, passwordProblem } from '@/app/account/_lib/validation';
import { setSessionCookies, storefrontClient } from '../_lib/session';

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const str = (v: unknown, max = 100) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const firstName = str(body?.firstName);
    const lastName = str(body?.lastName);
    const email = str(body?.email, 254);
    const password = typeof body?.password === 'string' ? body.password : '';
    const acceptsMarketing = body?.acceptsMarketing === true;
    const rawPhone = str(body?.phone, 20);

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.', field: 'email' }, { status: 400 });
    }
    const problem = passwordProblem(password);
    if (problem) return NextResponse.json({ error: problem, field: 'password' }, { status: 400 });
    const phone = rawPhone ? normalizeIndianMobile(rawPhone) : null;
    if (rawPhone && !phone) {
      return NextResponse.json({ error: 'Please enter a 10-digit Indian mobile number, or leave it blank.', field: 'phone' }, { status: 400 });
    }

    const client = storefrontClient();
    if (client) {
      try {
        const data = await client.request(
          `mutation CustomerRegister($input: CustomerCreateInput!) {
            customerCreate(input: $input) {
              customer { firstName lastName email phone }
              customerUserErrors { field message code }
            }
          }`,
          { input: { firstName, lastName, email, password, acceptsMarketing, ...(phone ? { phone } : {}) } }
        );

        const payload = data?.customerCreate;
        const errors: Array<{ field?: string[] | null; message?: string; code?: string }> = payload?.customerUserErrors || [];
        if (errors.length > 0) {
          const taken = errors.find((e) => e.code === 'TAKEN');
          if (taken && (taken.field || []).includes('phone')) {
            return NextResponse.json({ error: 'That mobile number is already linked to another account. Leave it blank or use another number.', field: 'phone', code: 'PHONE_TAKEN' }, { status: 400 });
          }
          if (taken) {
            return NextResponse.json({ error: 'An account with this email already exists.', field: 'email', code: 'EMAIL_TAKEN' }, { status: 400 });
          }
          if (errors.some((e) => e.code === 'CUSTOMER_DISABLED')) {
            return NextResponse.json(
              { success: true, verifyEmail: true, message: "We've sent you an email to confirm your account. Please open it to finish signing up." },
              { status: 200 }
            );
          }
          return NextResponse.json({ error: errors.map((e) => e.message).filter(Boolean).join(' ') || "We couldn't create your account." }, { status: 400 });
        }

        // Sign straight in after creating the account.
        const loginData = await client.request(
          `mutation CustomerLogin($input: CustomerAccessTokenCreateInput!) {
            customerAccessTokenCreate(input: $input) {
              customerAccessToken { accessToken }
              customerUserErrors { message }
            }
          }`,
          { input: { email, password } }
        );
        const accessToken = loginData?.customerAccessTokenCreate?.customerAccessToken?.accessToken;
        if (accessToken) await setSessionCookies(accessToken, email);

        return NextResponse.json({
          success: true,
          token: accessToken || null,
          user: { email, firstName, lastName, phone: phone || '' },
        });
      } catch (err: unknown) {
        console.error('[auth] Shopify customer registration failed:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Sign-up is unavailable right now. Please try again in a moment.' }, { status: 502 });
      }
    }

    // Sample sign-in exists only for local development without Shopify credentials.
    if (!devSamplesEnabled()) {
      return NextResponse.json({ error: 'Sign-in is not configured' }, { status: 503 });
    }

    const mockToken = `mock_customer_token_${Date.now()}`;
    await setSessionCookies(mockToken, email);
    const mockProfile = { email, firstName, lastName, phone: phone || '' };
    const cookieStore = await cookies();
    cookieStore.set('mock_profile', JSON.stringify(mockProfile), { path: '/', maxAge: THIRTY_DAYS });

    return NextResponse.json({ success: true, token: mockToken, user: mockProfile });
  } catch (error) {
    console.error('Registration error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
