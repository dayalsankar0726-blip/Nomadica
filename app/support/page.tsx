// app/support/page.tsx
import Link from "next/link";
import PolicyLayout from "@/components/support/PolicyLayout";

const topics = [
  { title: "Track your order", description: "See where your parcel is.", href: "/order-tracking" },
  {
    title: "Cancel or change an order",
    description: "Cancel, lower a quantity or remove an item before your order is packed.",
    href: "/account/orders",
  },
  { title: "Returns & refunds", description: "Return windows, exchanges and refund timelines.", href: "/support/return-policy" },
  { title: "Shipping", description: "Delivery times and shipping charges.", href: "/support/shipping-policy" },
  { title: "FAQ", description: "Quick answers to common questions.", href: "/support/faq" },
  { title: "Contact us", description: "Email our support team.", href: "/support/contact" },
  { title: "Privacy policy", description: "How we handle your personal data.", href: "/support/privacy-policy" },
  { title: "Terms and conditions", description: "The terms for using our website.", href: "/support/terms" },
];

export default function SupportPage() {
  return (
    <PolicyLayout title="Help Centre" intro="Find answers, manage your orders or get in touch.">
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 list-none p-0 m-0" style={{ marginBottom: "2rem" }}>
        {topics.map((t) => (
          <li key={t.href} className="flex">
            <Link
              href={t.href}
              className="block w-full rounded-lg border border-black/10 bg-white p-5 no-underline transition-colors hover:border-[#6B4E37] hover:bg-[#FBF9F7]"
            >
              <h2 className="m-0 mb-1 font-['Playfair_Display',_serif] text-lg font-semibold text-[#1E1E1E]">{t.title}</h2>
              <p className="m-0 text-sm text-[rgba(30,30,30,0.8)]">{t.description}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-[#6B4E37]" aria-hidden="true">
                Open &rarr;
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PolicyLayout>
  );
}
