// app/api/customers/password/route.ts
//
// POST { currentPassword, newPassword } changes the signed-in customer's password.
// The current password is checked first. Shopify signs out every other session when
// the password changes and issues a new token, which replaces the session cookie.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { devSamplesEnabled } from '@/lib/devMocks';
import { passwordProblem } from '@/app/account/_lib/validation';
import { allowPasswordRequest, setSessionCookies, storefrontClient, verifyPassword } from '@/app/api/auth/_lib/session';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('customer_access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
  if (!currentPassword) return NextResponse.json({ error: 'Please enter your current password.', field: 'currentPassword' }, { status: 400 });
  const problem = passwordProblem(newPassword);
  if (problem) return NextResponse.json({ error: problem, field: 'newPassword' }, { status: 400 });
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'Your new password must be different from your current one.', field: 'newPassword' }, { status: 400 });
  }

  if (!allowPasswordRequest(request, 'change')) {
    return NextResponse.json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, { status: 429, headers: { 'Retry-After': '900' } });
  }

  if (devSamplesEnabled()) return NextResponse.json({ success: true });

  const client = storefrontClient();
  if (!client) return NextResponse.json({ error: 'Password changes are not available right now.' }, { status: 503 });

  try {
    const me = await client.request(
      `query CurrentCustomer($customerAccessToken: String!) { customer(customerAccessToken: $customerAccessToken) { email } }`,
      { customerAccessToken: token }
    );
    const email = me?.customer?.email;
    if (!email) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

    if (!(await verifyPassword(client, email, currentPassword))) {
      return NextResponse.json({ error: 'Your current password is incorrect.', field: 'currentPassword' }, { status: 400 });
    }

    const data = await client.request(
      `mutation ChangePassword($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
          customerAccessToken { accessToken }
          customerUserErrors { field message }
        }
      }`,
      { customerAccessToken: token, customer: { password: newPassword } }
    );
    const result = data?.customerUpdate;
    const errors: Array<{ message?: string }> = result?.customerUserErrors || [];
    if (errors.length > 0) return NextResponse.json({ error: errors[0].message || "We couldn't change your password." }, { status: 400 });

    const newToken = result?.customerAccessToken?.accessToken || (await verifyPassword(client, email, newPassword));
    if (newToken) await setSessionCookies(newToken, email);
    return NextResponse.json({ success: true, signedIn: !!newToken });
  } catch (error) {
    console.error('[customers/password] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We couldn't change your password right now. Please try again." }, { status: 502 });
  }
}
