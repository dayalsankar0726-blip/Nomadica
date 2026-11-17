/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/customers/addresses/route.ts
//
// The signed-in customer's own saved addresses. Uses only the customer's Storefront
// token; the admin token is never used here. Sample addresses are development-only.
import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { ShopifyStorefrontClient } from '@/lib/shopify/client';
import { devSamplesEnabled } from '@/lib/devMocks';
import { MOCK_ADDRESSES } from '@/utils/mockData';
import { isValidPin, normalizeIndianMobile } from '@/app/account/_lib/validation';

const DEV_ADDRESSES_COOKIE = 'mock_addresses';

const ADDRESS_FIELDS = 'id address1 address2 city province country zip firstName lastName phone';

function storefront() {
  return new ShopifyStorefrontClient(
    process.env.SHOPIFY_APP_URL!,
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN!
  );
}

function mapAddress(node: any, defaultId?: string) {
  return {
    id: node.id,
    label: 'Address',
    name: `${node.firstName || ''} ${node.lastName || ''}`.trim(),
    address1: node.address1,
    address2: node.address2,
    city: node.city,
    province: node.province,
    country: node.country,
    zip: node.zip,
    phone: node.phone || '',
    default: node.id === defaultId,
  };
}

function toMailingAddress(body: any) {
  const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const [firstName, ...rest] = str(body.name, 200).split(/\s+/);
  return {
    firstName: firstName || '',
    lastName: rest.join(' '),
    address1: str(body.address1),
    address2: str(body.address2),
    city: str(body.city, 100),
    province: str(body.province, 100),
    country: str(body.country, 100) || 'India',
    zip: str(body.zip, 20),
    phone: normalizeIndianMobile(str(body.phone, 20)) || str(body.phone, 20) || undefined,
  };
}

/** A customer-facing problem with the address, or null when it can be saved. */
function addressProblem(body: any): string | null {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  if (!str(body.name)) return 'Please enter the full name for this address.';
  if (!str(body.address1)) return 'Please enter the house number, building and street.';
  if (!str(body.city)) return 'Please enter the city.';
  if (!str(body.province)) return 'Please choose the state.';
  if (!isValidPin(str(body.zip))) return 'Please enter a valid 6-digit PIN code.';
  if (!normalizeIndianMobile(str(body.phone))) return 'Please enter a 10-digit Indian mobile number so the courier can reach you.';
  return null;
}

async function listAddresses(token: string) {
  const data = await storefront().request(
    `query GetCustomerAddresses($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        defaultAddress { id }
        addresses(first: 20) { edges { node { ${ADDRESS_FIELDS} } } }
      }
    }`,
    { customerAccessToken: token }
  );
  if (!data?.customer) return null;
  const defaultId = data.customer.defaultAddress?.id;
  return (data.customer.addresses?.edges || []).map((e: any) => mapAddress(e.node, defaultId));
}

async function setDefault(token: string, addressId: string) {
  await storefront().request(
    `mutation SetDefaultAddress($customerAccessToken: String!, $addressId: ID!) {
      customerDefaultAddressUpdate(customerAccessToken: $customerAccessToken, addressId: $addressId) {
        customer { id }
        customerUserErrors { message }
      }
    }`,
    { customerAccessToken: token, addressId }
  );
}

async function context() {
  const cookieStore = await cookies();
  return { cookieStore, token: cookieStore.get('customer_access_token')?.value };
}

function readDevAddresses(cookieStore: Awaited<ReturnType<typeof cookies>>): any[] {
  try {
    const saved = cookieStore.get(DEV_ADDRESSES_COOKIE)?.value;
    return saved ? JSON.parse(saved) : [...MOCK_ADDRESSES];
  } catch {
    return [...MOCK_ADDRESSES];
  }
}

function writeDevAddresses(cookieStore: Awaited<ReturnType<typeof cookies>>, list: any[]) {
  cookieStore.set(DEV_ADDRESSES_COOKIE, JSON.stringify(list), { path: '/', httpOnly: true, sameSite: 'lax' });
}

const unauthenticated = () => NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
const failed = (what: string, error: unknown) => {
  console.error(`[addresses] ${what} failed:`, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: `We couldn't ${what} this address right now. Please try again.` }, { status: 502 });
};

export async function GET() {
  const { cookieStore, token } = await context();
  if (!token) return unauthenticated();
  if (devSamplesEnabled()) return NextResponse.json({ addresses: readDevAddresses(cookieStore) });

  try {
    const addresses = await listAddresses(token);
    if (!addresses) return unauthenticated();
    return NextResponse.json({ addresses });
  } catch (error) {
    return failed('load', error);
  }
}

export async function POST(request: NextRequest) {
  const { cookieStore, token } = await context();
  if (!token) return unauthenticated();
  const body = await request.json().catch(() => ({}));
  const problem = addressProblem(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (devSamplesEnabled()) {
    const list = readDevAddresses(cookieStore);
    const newAddress = { ...toMailingAddress(body), id: `addr_${Date.now()}`, label: body.label || 'Address', name: body.name || '', default: !!body.default };
    if (newAddress.default) list.forEach((a: any) => (a.default = false));
    list.push(newAddress);
    writeDevAddresses(cookieStore, list);
    return NextResponse.json({ customerAddress: newAddress, addresses: list, userErrors: [] });
  }

  try {
    const data = await storefront().request(
      `mutation CreateCustomerAddress($customerAccessToken: String!, $address: MailingAddressInput!) {
        customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
          customerAddress { ${ADDRESS_FIELDS} }
          customerUserErrors { field message }
        }
      }`,
      { customerAccessToken: token, address: toMailingAddress(body) }
    );
    const payload = data?.customerAddressCreate;
    const created = payload?.customerAddress;
    if (!created) {
      return NextResponse.json({ error: payload?.customerUserErrors?.[0]?.message || 'Could not save address' }, { status: 400 });
    }
    if (body.default) await setDefault(token, created.id);
    const addresses = (await listAddresses(token)) || [];
    return NextResponse.json({
      customerAddress: mapAddress(created, body.default ? created.id : undefined),
      addresses,
      userErrors: [],
    });
  } catch (error) {
    return failed('create', error);
  }
}

export async function PUT(request: NextRequest) {
  const { cookieStore, token } = await context();
  if (!token) return unauthenticated();
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing address id' }, { status: 400 });
  // "Set as default" sends only the id and the flag; full edits are checked.
  const defaultOnly = body.defaultOnly === true;
  if (!defaultOnly) {
    const problem = addressProblem(body);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  if (devSamplesEnabled()) {
    const list = readDevAddresses(cookieStore);
    const idx = list.findIndex((a: any) => a.id === body.id);
    if (idx !== -1) {
      if (body.default) list.forEach((a: any) => (a.default = false));
      list[idx] = defaultOnly
        ? { ...list[idx], default: true }
        : { ...list[idx], ...toMailingAddress(body), name: body.name || list[idx].name, default: !!body.default };
      writeDevAddresses(cookieStore, list);
    }
    return NextResponse.json({ success: true });
  }

  if (defaultOnly) {
    try {
      await setDefault(token, body.id);
      return NextResponse.json({ success: true });
    } catch (error) {
      return failed('update', error);
    }
  }

  try {
    const data = await storefront().request(
      `mutation UpdateCustomerAddress($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
        customerAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
          customerAddress { id }
          customerUserErrors { field message }
        }
      }`,
      { customerAccessToken: token, id: body.id, address: toMailingAddress(body) }
    );
    const errors = data?.customerAddressUpdate?.customerUserErrors || [];
    if (errors.length > 0) return NextResponse.json({ error: errors[0].message }, { status: 400 });
    if (body.default) await setDefault(token, body.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return failed('update', error);
  }
}

export async function DELETE(request: NextRequest) {
  const { cookieStore, token } = await context();
  if (!token) return unauthenticated();
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing address id' }, { status: 400 });

  if (devSamplesEnabled()) {
    writeDevAddresses(cookieStore, readDevAddresses(cookieStore).filter((a: any) => a.id !== body.id));
    return NextResponse.json({ success: true });
  }

  try {
    const data = await storefront().request(
      `mutation DeleteCustomerAddress($customerAccessToken: String!, $id: ID!) {
        customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
          deletedCustomerAddressId
          customerUserErrors { message }
        }
      }`,
      { customerAccessToken: token, id: body.id }
    );
    const errors = data?.customerAddressDelete?.customerUserErrors || [];
    if (errors.length > 0) return NextResponse.json({ error: errors[0].message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return failed('delete', error);
  }
}
