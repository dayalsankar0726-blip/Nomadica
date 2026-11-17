// app/support/return-policy/page.tsx
import { POLICY, SITE } from "@/lib/site";
import PolicyLayout, { MailLink, PolicyLink, PolicyList, type PolicySection } from "@/components/support/PolicyLayout";
import {
  CANCEL_TEXT,
  CHANGE_TEXT,
  DAMAGE_TEXT,
  POLICY_LAST_UPDATED,
  REFUND_TEXT,
  RETURN_WINDOW_TEXT,
} from "@/components/support/policyFacts";

const sections: PolicySection[] = [
  {
    id: "return-window",
    title: "Return window",
    content: (
      <>
        <p style={{ margin: 0 }}>{RETURN_WINDOW_TEXT}</p>
        <PolicyList
          items={[
            "Items must be returned in their original condition with all tags attached.",
            "Products must be unworn, unwashed and undamaged.",
          ]}
        />
        <p style={{ margin: 0 }}>
          <strong>Note:</strong> return requests made more than {POLICY.returnDays} days after delivery can&apos;t be accepted.
        </p>
      </>
    ),
  },
  {
    id: "damaged-items",
    title: "Damaged, defective or wrong items",
    content: (
      <>
        <p style={{ margin: 0 }}>{DAMAGE_TEXT}</p>
        <PolicyList
          items={[
            "Send photos of the product and the packaging.",
            "Keep the original packaging until the claim is resolved.",
            "We will arrange a free replacement or a full refund.",
          ]}
        />
      </>
    ),
  },
  {
    id: "eligible-items",
    title: "Items you can return",
    content: (
      <PolicyList
        items={[
          "T-shirts in original packaging with tags intact.",
          "Items with manufacturing defects.",
          "Wrong items delivered.",
          "Items damaged during shipping.",
          "Size exchange requests (subject to availability).",
        ]}
      />
    ),
  },
  {
    id: "non-returnable",
    title: "Items you can't return",
    content: (
      <PolicyList
        items={[
          "Items that have been worn, washed or altered.",
          "Items without original tags and packaging.",
          "Items bought in a clearance or final sale.",
          "Customised or personalised products.",
          "Items damaged through misuse.",
        ]}
      />
    ),
  },
  {
    id: "how-to-return",
    title: "How to request a return",
    content: (
      <>
        <PolicyList
          items={[
            <>
              Go to <PolicyLink href="/account/orders">My Orders</PolicyLink>, open the order and request a return, or email us at{" "}
              <MailLink /> within {POLICY.returnDays} days of delivery.
            </>,
            "Include your order number and the reason for the return.",
            "For damage or defects, attach clear photos of the product.",
            `We review requests within ${SITE.supportResponse}.`,
            "Once approved, we will send you return instructions.",
          ]}
        />
      </>
    ),
  },
  {
    id: "return-shipping",
    title: "Return shipping",
    content: (
      <>
        <PolicyList
          items={[
            <>
              <strong>Defective or wrong items:</strong> we arrange a free pickup or reimburse the return shipping.
            </>,
            <>
              <strong>Change of mind:</strong> return shipping costs are paid by the customer.
            </>,
            <>
              <strong>Size exchange:</strong> free exchange shipping within India.
            </>,
          ]}
        />
        <p style={{ margin: 0 }}>Please pack the product securely, ideally in its original packaging.</p>
      </>
    ),
  },
  {
    id: "exchanges",
    title: "Exchanges",
    content: (
      <>
        <p style={{ margin: 0 }}>We offer exchanges for:</p>
        <PolicyList
          items={[
            "A different size (subject to stock).",
            "A different colour (subject to stock).",
            "Replacement of defective items.",
          ]}
        />
        <p style={{ margin: 0 }}>
          If the size or colour you want isn&apos;t available, you can choose a refund or store credit instead. Exchanges are processed
          within 5–7 business days after we receive the returned item.
        </p>
      </>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    content: (
      <>
        <p style={{ margin: 0 }}>Once your return is received and inspected, we will let you know whether the refund is approved.</p>
        <p style={{ margin: "0.75rem 0 0" }}>{REFUND_TEXT}</p>
        <PolicyList
          items={[
            <>
              <strong>Card:</strong> refunded to the original card.
            </>,
            <>
              <strong>UPI, net banking or wallet:</strong> refunded to the original account.
            </>,
            <>
              <strong>Cash on delivery:</strong> refunded by bank transfer (NEFT/IMPS).
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "refund-deductions",
    title: "Refund deductions",
    content: (
      <PolicyList
        items={[
          "Original shipping charges are non-refundable, unless the item was defective or wrong.",
          "Cash on delivery charges, if any were paid, are non-refundable.",
          "Promotional discounts are adjusted in the refund amount.",
        ]}
      />
    ),
  },
  {
    id: "cancellation",
    title: "Cancelling or changing an order",
    content: (
      <>
        <p style={{ margin: 0 }}>{CANCEL_TEXT}</p>
        <p style={{ margin: "0.75rem 0 0" }}>{CHANGE_TEXT}</p>
        <p style={{ margin: "0.75rem 0 0" }}>
          Go to <PolicyLink href="/account/orders">My Orders</PolicyLink> to cancel or change an order. If you can&apos;t, email{" "}
          <MailLink /> with your order number.
        </p>
      </>
    ),
  },
  {
    id: "store-credit",
    title: "Store credit",
    content: (
      <>
        <p style={{ margin: 0 }}>As an alternative to a refund, you can choose store credit for future purchases on Nomadica.</p>
        <PolicyList
          items={[
            "Store credit is valid for 12 months from the date of issue.",
            "Store credit can't be converted to cash.",
            "Store credit can be used on any product.",
          ]}
        />
      </>
    ),
  },
];

export default function ReturnPolicyPage() {
  return (
    <PolicyLayout
      title="Returns & Refunds"
      intro="How returns, exchanges, refunds and cancellations work at Nomadica."
      summary={
        <PolicyList
          items={[
            RETURN_WINDOW_TEXT,
            DAMAGE_TEXT,
            <>
              Request a return from <PolicyLink href="/account/orders">My Orders</PolicyLink> or by emailing <MailLink />.
            </>,
            `Refunds go to your original payment method within ${POLICY.refundDays} business days of approval.`,
            "You can cancel an order yourself until it is packed.",
          ]}
        />
      }
      sections={sections}
      showToc
      lastUpdated={POLICY_LAST_UPDATED}
    >
      <p style={{ margin: "0 0 2.5rem" }}>
        Please read this policy to understand how returns, exchanges and refunds work. By placing an order on our website, you agree to
        this policy.
      </p>
    </PolicyLayout>
  );
}
