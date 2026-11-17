// app/account/orders/[id]/page.tsx
// One order in full: items, prices, address, payment, status and tracking.
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import OrderDetailClient from "./OrderDetailClient";

type Props = { params: Promise<{ id: string }> };

const digits = (id: string) => decodeURIComponent(id).replace(/[^0-9]/g, "");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const number = digits(id);
  return { title: { absolute: number ? `Order #${number} | Nomadica` : "Order details | Nomadica" } };
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageLoader />}>
      <OrderDetailClient number={digits(id)} />
    </Suspense>
  );
}
