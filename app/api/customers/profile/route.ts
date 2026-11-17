// app/api/customers/profile/route.ts
//
// The signed-in customer's own profile. Uses only the customer's Storefront token;
// the admin token is never used here.
import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { ShopifyStorefrontClient } from '@/lib/shopify/client';
import { devSamplesEnabled } from '@/lib/devMocks';
import { isValidEmail, normalizeIndianMobile } from '@/app/account/_lib/validation';
import { verifyPassword } from '@/app/api/auth/_lib/session';

const DEV_PROFILE_COOKIE = 'mock_profile';

function storefront() {
  return new ShopifyStorefrontClient(
    process.env.SHOPIFY_APP_URL!,
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN!
  );
}

async function getCustomerToken() {
  const cookieStore = await cookies();
  return { cookieStore, token: cookieStore.get('customer_access_token')?.value };
}

export async function GET() {
  const { cookieStore, token } = await getCustomerToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (devSamplesEnabled()) {
    try {
      const saved = cookieStore.get(DEV_PROFILE_COOKIE)?.value;
      if (saved) return NextResponse.json({ customer: JSON.parse(saved) });
    } catch {}
    const email = cookieStore.get('customer_email')?.value || 'dev@example.com';
    return NextResponse.json({ customer: { email, firstName: email.split('@')[0], lastName: '', phone: '' } });
  }

  try {
    const data = await storefront().request(
      `query GetCustomerProfile($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) { email firstName lastName phone }
      }`,
      { customerAccessToken: token }
    );
    const customer = data?.customer;
    if (!customer) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    return NextResponse.json({
      customer: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone || '',
      },
    });
  } catch (error) {
    console.error('[profile] load failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Could not load profile' }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  const { cookieStore, token } = await getCustomerToken();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const str = (v: unknown, max = 100) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
  const email = str(body.email, 254);
  const rawPhone = str(body.phone, 20);
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';

  if (email !== undefined && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.', field: 'email' }, { status: 400 });
  }
  // An empty phone clears it; anything else must be an Indian mobile number.
  const phone = rawPhone ? normalizeIndianMobile(rawPhone) : rawPhone === '' ? null : undefined;
  if (rawPhone && !phone) {
    return NextResponse.json({ error: 'Please enter a 10-digit Indian mobile number.', field: 'phone' }, { status: 400 });
  }

  const update: Record<string, string | null | undefined> = {
    firstName: str(body.firstName),
    lastName: str(body.lastName),
    email,
    phone,
  };
  for (const key of Object.keys(update)) if (update[key] === undefined) delete update[key];

  if (devSamplesEnabled()) {
    let saved: Record<string, unknown> = {};
    try {
      saved = JSON.parse(cookieStore.get(DEV_PROFILE_COOKIE)?.value || '{}');
    } catch {}
    const merged = { ...saved, ...update, phone: update.phone === undefined ? saved.phone ?? '' : update.phone ?? '' };
    cookieStore.set(DEV_PROFILE_COOKIE, JSON.stringify(merged), { path: '/', httpOnly: true, sameSite: 'lax' });
    return NextResponse.json({ customerUpdate: { customer: merged, userErrors: [] } });
  }

  try {
    const client = storefront();

    // Changing the sign-in email needs the current password, so someone using an
    // unattended signed-in device can't take over the account.
    if (email) {
      const me = await client.request(
        `query CurrentEmail($customerAccessToken: String!) { customer(customerAccessToken: $customerAccessToken) { email } }`,
        { customerAccessToken: token }
      );
      const currentEmail: string | undefined = me?.customer?.email;
      if (!currentEmail) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      if (currentEmail.toLowerCase() !== email.toLowerCase()) {
        if (!currentPassword) {
          return NextResponse.json({ error: 'Please enter your current password to change your email.', field: 'currentPassword', code: 'PASSWORD_REQUIRED' }, { status: 400 });
        }
        if (!(await verifyPassword(client, currentEmail, currentPassword))) {
          return NextResponse.json({ error: 'Your current password is incorrect.', field: 'currentPassword' }, { status: 400 });
        }
      } else {
        delete update.email;
      }
    }

    const data = await client.request(
      `mutation CustomerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
          customer { email firstName lastName phone }
          customerUserErrors { field message code }
        }
      }`,
      { customerAccessToken: token, customer: update }
    );
    const result = data?.customerUpdate;
    const userErrors: Array<{ field?: string[] | null; message?: string; code?: string }> = result?.customerUserErrors || [];
    if (!result?.customer || userErrors.length > 0) {
      const taken = userErrors.find((e) => e.code === 'TAKEN');
      const message = taken
        ? (taken.field || []).includes('phone')
          ? 'That mobile number is already linked to another account.'
          : 'That email is already used by another account.'
        : userErrors[0]?.message || 'Could not update profile';
      return NextResponse.json({ error: message, userErrors }, { status: 400 });
    }
    if (update.email) {
      cookieStore.set('customer_email', result.customer.email, {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return NextResponse.json({ customerUpdate: { customer: result.customer, userErrors: [] } });
  } catch (error) {
    console.error('[profile] update failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 502 });
  }
}
