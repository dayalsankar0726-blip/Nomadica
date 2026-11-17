// app/api/cart/[id]/discount/route.ts
//
// Applies (POST { code }) or removes (DELETE) a discount code on the cart.
// Shopify validates the code; the response is the server's updated price summary.
import { NextResponse } from 'next/server';
import { CartError, cartPricing, setCartDiscountCode } from '@/lib/checkout/serverCart';

type Params = { params: Promise<{ id: string }> };

async function respond(id: string, code: string | null) {
  try {
    const { cart, applied } = await setCartDiscountCode(id, code);
    if (!applied) {
      return NextResponse.json(
        { applied: false, error: "This code isn't valid for the items in your bag.", pricing: cartPricing(cart) },
        { status: 400 }
      );
    }
    return NextResponse.json({ applied: !!code, pricing: cartPricing(cart) });
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json({ applied: false, error: error.message }, { status: 400 });
    }
    console.error('[cart/discount] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ applied: false, error: 'Could not update the discount code. Please try again.' }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!code) return NextResponse.json({ applied: false, error: 'Please enter a code' }, { status: 400 });
  return respond(id, code);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return respond(id, null);
}
