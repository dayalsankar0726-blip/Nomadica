// app/support/shipping-policy/page.tsx
import type { CSSProperties } from "react";
import { POLICY } from "@/lib/site";
import PolicyLayout, { MailLink, PolicyLink, PolicyList, type PolicySection } from "@/components/support/PolicyLayout";
import {
  DELIVERY_TIME_TEXT,
  FEE,
  FREE_FROM,
  INDIA_ONLY_TEXT,
  POLICY_LAST_UPDATED,
  SHIPPING_FEE_TEXT,
} from "@/components/support/policyFacts";

const cell: CSSProperties = { padding: "0.75rem 1rem", borderBottom: "1px solid rgba(0,0,0,0.08)", textAlign: "left" };

// TODO(store owner): courier partner names, any cash-on-delivery charge and a lost-parcel
// policy are not known yet. Add them here once confirmed.

const sections: PolicySection[] = [
  {
    id: "where-we-ship",
    title: "Where we ship",
    content: <p style={{ margin: 0 }}>{INDIA_ONLY_TEXT} Checkout accepts Indian delivery addresses only.</p>,
  },
  {
    id: "shipping-charges",
    title: "Shipping charges",
    content: (
      <>
        <p style={{ margin: "0 0 1rem" }}>{SHIPPING_FEE_TEXT}</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#1E1E1E" }}>
            <caption style={{ textAlign: "left", fontWeight: 600, marginBottom: "0.5rem" }}>Shipping fee by order value</caption>
            <thead>
              <tr style={{ backgroundColor: "#F7F3EE" }}>
                <th scope="col" style={cell}>Order value (products)</th>
                <th scope="col" style={cell}>Shipping</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={cell}>Below {FREE_FROM}</td>
                <td style={cell}>{FEE}</td>
              </tr>
              <tr>
                <td style={cell}>{FREE_FROM} or more</td>
                <td style={cell}>Free</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ margin: "1rem 0 0" }}>The shipping charge is shown at checkout before you pay.</p>
      </>
    ),
  },
  {
    id: "delivery-time",
    title: "Processing and delivery time",
    content: (
      <>
        <PolicyList
          items={[
            `Packing: ${POLICY.processingDays} business days after your order is confirmed. Orders are not packed or shipped on Sundays or public holidays.`,
            `Delivery: ${POLICY.deliveryDays} business days after dispatch, depending on your location.`,
          ]}
        />
        <p style={{ margin: 0 }}>
          {DELIVERY_TIME_TEXT} Timelines can occasionally vary because of courier delays or events outside our control.
        </p>
      </>
    ),
  },
  {
    id: "tracking",
    title: "Order tracking",
    content: (
      <p style={{ margin: 0 }}>
        When your order ships, we email you the tracking details. You can also{" "}
        <PolicyLink href="/order-tracking">track your order</PolicyLink> or see its status in{" "}
        <PolicyLink href="/account/orders">My Orders</PolicyLink>.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Cancelling or changing an order",
    content: (
      <p style={{ margin: 0 }}>
        Until your order is packed, you can cancel it, lower an item&apos;s quantity or remove an item from{" "}
        <PolicyLink href="/account/orders">My Orders</PolicyLink>. See the <PolicyLink href="/support/return-policy#cancellation">cancellation policy</PolicyLink>{" "}
        for details.
      </p>
    ),
  },
  {
    id: "delays",
    title: "Delays",
    content: (
      <p style={{ margin: 0 }}>
        Nomadica is not responsible for delays caused by courier partners, natural events or other circumstances beyond our control, but we
        will help you resolve any shipping problem. Email <MailLink /> with your order number.
      </p>
    ),
  },
  {
    id: "address",
    title: "Delivery address",
    content: (
      <p style={{ margin: 0 }}>
        Please make sure your delivery details are correct. Nomadica is not responsible for orders delivered to an incorrect address provided
        at checkout.
      </p>
    ),
  },
];

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout
      title="Shipping Policy"
      intro="Where we ship, what it costs and how long it takes."
      summary={
        <PolicyList items={[INDIA_ONLY_TEXT, SHIPPING_FEE_TEXT, DELIVERY_TIME_TEXT]} />
      }
      sections={sections}
      showToc
      lastUpdated={POLICY_LAST_UPDATED}
    />
  );
}
