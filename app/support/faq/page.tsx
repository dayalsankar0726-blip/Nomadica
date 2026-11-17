// app/support/faq/page.tsx
//
// Every answer here comes from POLICY / SITE in lib/site.ts or the published policies.
// Don't add answers that aren't backed by a policy.
import { POLICY, SITE } from "@/lib/site";
import PolicyLayout, { PolicyLink } from "@/components/support/PolicyLayout";
import { getFaqSchema } from "@/lib/schema/faq";
import {
  CANCEL_TEXT,
  CHANGE_TEXT,
  DAMAGE_TEXT,
  DELIVERY_TIME_TEXT,
  INDIA_ONLY_TEXT,
  PAYMENT_METHODS_TEXT,
  POLICY_LAST_UPDATED,
  REFUND_TEXT,
  RETURN_WINDOW_TEXT,
  SHIPPING_FEE_TEXT,
} from "@/components/support/policyFacts";

interface Faq {
  question: string;
  /** Plain text: also used for the FAQPage structured data. */
  answer: string;
  links?: { href: string; label: string }[];
}

interface FaqGroup {
  id: string;
  title: string;
  items: Faq[];
}

const MY_ORDERS = { href: "/account/orders", label: "Go to My Orders" };
const RETURNS = { href: "/support/return-policy", label: "Returns & Refunds policy" };
const SHIPPING = { href: "/support/shipping-policy", label: "Shipping policy" };

const groups: FaqGroup[] = [
  {
    id: "orders",
    title: "Orders & cancellation",
    items: [
      {
        question: "Can I cancel my order?",
        answer: CANCEL_TEXT,
        links: [MY_ORDERS, { href: "/support/return-policy#cancellation", label: "Cancellation policy" }],
      },
      {
        question: "Can I change my order after placing it?",
        answer: `${CHANGE_TEXT} To add items or change a size, cancel the order before it is packed and place a new one.`,
        links: [MY_ORDERS],
      },
      {
        question: "My order is already packed or shipped. Can I still cancel it?",
        answer: `No. Once an order is packed it can't be cancelled. When it arrives, you can request a return within ${POLICY.returnDays} days of delivery.`,
        links: [RETURNS],
      },
      {
        question: "How do I check the status of my order?",
        answer: "Signed-in customers can see every order and its status in My Orders. You can also track an order from the Track order page.",
        links: [MY_ORDERS, { href: "/order-tracking", label: "Track order" }],
      },
    ],
  },
  {
    id: "shipping",
    title: "Shipping & delivery",
    items: [
      {
        question: "Do you ship outside India?",
        answer: `${INDIA_ONLY_TEXT} Checkout accepts Indian delivery addresses only.`,
      },
      {
        question: "How much does shipping cost?",
        answer: SHIPPING_FEE_TEXT,
        links: [SHIPPING],
      },
      {
        question: "How long will delivery take?",
        answer: `${DELIVERY_TIME_TEXT} Orders are not packed or shipped on Sundays or public holidays.`,
        links: [SHIPPING],
      },
      {
        question: "Do you offer express delivery?",
        answer: "No, we offer one standard delivery option for all orders.",
      },
      {
        question: "How can I track my order?",
        answer: "When your order ships, we email you the tracking details. You can also use the Track order page or check My Orders.",
        links: [{ href: "/order-tracking", label: "Track order" }],
      },
    ],
  },
  {
    id: "returns",
    title: "Returns & refunds",
    items: [
      {
        question: "What is your return policy?",
        answer: `${RETURN_WINDOW_TEXT} Items must be unworn, unwashed and in their original condition with tags attached.`,
        links: [RETURNS],
      },
      {
        question: "How do I request a return?",
        answer: `Request a return from My Orders, or email ${SITE.supportEmail} with your order number and the reason, within ${POLICY.returnDays} days of delivery.`,
        links: [MY_ORDERS],
      },
      {
        question: "My item arrived damaged, or I received the wrong item. What should I do?",
        answer: `${DAMAGE_TEXT} We will arrange a free replacement or a full refund.`,
        links: [RETURNS],
      },
      {
        question: "Can I exchange an item for a different size?",
        answer: "Yes, size and colour exchanges are available subject to stock. If the size you want isn't available, you can choose a refund or store credit.",
        links: [RETURNS],
      },
      {
        question: "When will I get my refund?",
        answer: REFUND_TEXT,
        links: [RETURNS],
      },
      {
        question: "Which items can't be returned?",
        answer: "Items that have been worn, washed or altered, items without original tags and packaging, clearance or final-sale items, and customised products.",
        links: [RETURNS],
      },
    ],
  },
  {
    id: "payments",
    title: "Payments & cash on delivery",
    items: [
      {
        question: "Which payment methods do you accept?",
        answer: `We accept ${PAYMENT_METHODS_TEXT}`,
      },
      {
        question: "Can I pay cash on delivery?",
        answer: "Yes, cash on delivery is available at checkout. A cash on delivery order can be cancelled from My Orders until it is packed, just like a prepaid order.",
      },
      {
        question: "How are cash on delivery orders refunded?",
        answer: "Refunds for cash on delivery orders are made by bank transfer (NEFT/IMPS).",
        links: [RETURNS],
      },
      {
        question: "Is it safe to pay online?",
        answer: "Online payments are processed by Razorpay, a secure payment gateway. Nomadica does not store your full card details.",
      },
    ],
  },
  {
    id: "sizing",
    title: "Sizing",
    items: [
      {
        question: "How do I choose my size?",
        answer: "Our designs are unisex. Check the size chart on each product page before you order. If a size doesn't fit, you can request a size exchange within the return window, subject to stock.",
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    items: [
      {
        question: "Do I need an account to place an order?",
        answer: "An account lets you see your orders, cancel or change an order before it is packed, and request returns from My Orders. You can create one with your email address and a password.",
        links: [{ href: "/account", label: "Your account" }],
      },
      {
        question: "How do I contact customer support?",
        answer: `Email ${SITE.supportEmail}. We reply within ${SITE.supportResponse}.`,
        links: [{ href: "/support/contact", label: "Contact us" }],
      },
    ],
  },
];

export default function FAQPage() {
  const schema = getFaqSchema(groups.flatMap((g) => g.items.map(({ question, answer }) => ({ question, answer }))));

  return (
    <PolicyLayout
      title="Frequently Asked Questions"
      intro="Quick answers about orders, shipping, returns, payments and your account."
      lastUpdated={POLICY_LAST_UPDATED}
    >
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
        />
      )}

      <nav aria-label="FAQ topics" style={{ marginBottom: "2rem" }}>
        <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
          {groups.map((g) => (
            <li key={g.id}>
              <a
                href={`#${g.id}`}
                className="inline-block rounded border border-[#6B4E37] px-3 py-1.5 text-xs font-semibold text-[#6B4E37] no-underline hover:bg-[#F3EDE6]"
              >
                {g.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map((group) => (
        <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} style={{ marginBottom: "2.5rem", scrollMarginTop: "90px" }}>
          <h2
            id={`${group.id}-heading`}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.35rem",
              fontWeight: 600,
              color: "#1E1E1E",
              margin: "0 0 1rem",
              borderBottom: "1px solid #6B4E37",
              paddingBottom: "0.5rem",
            }}
          >
            {group.title}
          </h2>
          <div className="flex flex-col gap-3">
            {group.items.map((faq) => (
              // Native <details>/<summary>: keyboard accessible and announces expanded/collapsed.
              <details key={faq.question} className="group rounded-lg border border-black/10 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-[#1E1E1E] hover:bg-[#F7F3EE] [&::-webkit-details-marker]:hidden">
                  <span>{faq.question}</span>
                  <span aria-hidden="true" className="text-lg leading-none text-[#6B4E37] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <div className="border-t border-black/10 bg-[#FBF9F7] p-4">
                  <p style={{ margin: 0 }}>{faq.answer}</p>
                  {faq.links && faq.links.length > 0 && (
                    <p style={{ margin: "0.75rem 0 0" }} className="flex flex-wrap gap-x-4 gap-y-1">
                      {faq.links.map((l) => (
                        <PolicyLink key={l.href} href={l.href}>
                          {l.label}
                        </PolicyLink>
                      ))}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </PolicyLayout>
  );
}
