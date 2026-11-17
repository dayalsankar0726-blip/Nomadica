// app/support/privacy-policy/page.tsx
//
// NOTE FOR LEGAL REVIEW: this policy still cites only the IT Act, 2000 and the 2011 SPDI Rules.
// It has not been reviewed against the Digital Personal Data Protection Act, 2023 (DPDP Act)
// and its rules, or for cookie-consent requirements. Have a lawyer update the legal wording;
// only facts (contact, payment provider, cookies/analytics) were aligned in this revision.
import { SITE } from "@/lib/site";
import PolicyLayout, { MailLink, PolicyLink, PolicyList, type PolicySection } from "@/components/support/PolicyLayout";
import { POLICY_LAST_UPDATED } from "@/components/support/policyFacts";

function buildSections(): PolicySection[] {
  const sections: PolicySection[] = [
    {
      id: "legal-compliance",
      title: "Legal compliance",
      content: (
        <>
          <p style={{ margin: 0 }}>This Privacy Policy is published in accordance with:</p>
          <PolicyList
            items={[
              "Section 43A of the Information Technology Act, 2000.",
              "The Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.",
              "Applicable provisions under Indian data protection laws.",
            ]}
          />
        </>
      ),
    },
    {
      id: "information-we-collect",
      title: "What information we collect",
      content: (
        <>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.25rem" }}>Personal information</h3>
          <p style={{ margin: 0 }}>Information that can identify you directly or indirectly, including:</p>
          <PolicyList
            items={[
              "Full name",
              "Email address",
              "Mobile number",
              "Shipping and billing address",
              "Gender (if you choose to provide it)",
              "Date of birth (if you choose to provide it)",
            ]}
          />
          <p style={{ margin: "0 0 1rem" }}>
            Providing this information is voluntary, but some services (such as placing an order) need it.
          </p>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.25rem" }}>
            Sensitive personal data or information (SPDI)
          </h3>
          <PolicyList
            items={[
              "Account password",
              "Payment details such as card or bank details",
              "Other financial information needed to process transactions",
            ]}
          />
          <p style={{ margin: "0 0 1rem" }}>
            Nomadica does not store full card details. Payments are processed by our payment provider, Razorpay.
          </p>
          <p style={{ margin: 0 }}>
            Information that is freely available in the public domain or provided under applicable law is not considered sensitive personal
            information.
          </p>
        </>
      ),
    },
    {
      id: "purpose",
      title: "Why we collect it",
      content: (
        <PolicyList
          items={[
            "To process and deliver your orders",
            "To manage cancellations, returns, exchanges and refunds",
            "To provide customer support",
            "To send order confirmations and shipping updates",
            "To improve the website",
            "To personalise content and offers",
            "To prevent fraud and unauthorised transactions",
            "To comply with legal and regulatory requirements",
            "To send promotional emails (only if you opt in)",
          ]}
        />
      ),
    },
    {
      id: "payments",
      title: "Payment information",
      content: (
        <p style={{ margin: 0 }}>
          Online payments (UPI, cards, net banking and wallets) are processed by Razorpay, a third-party payment gateway that uses encryption
          and secure protocols. We do not store your complete card details on our servers. Verification and authentication are handled
          directly by the payment provider.
        </p>
      ),
    },
    {
      id: "cookies",
      title: "Cookies, local storage and analytics",
      content: (
        <>
          <p style={{ margin: 0 }}>We use the following on this website:</p>
          <PolicyList
            items={[
              <>
                <strong>Essential cookies</strong> to keep you signed in and to remember your shopping bag. The website doesn&apos;t work
                properly without them.
              </>,
              <>
                <strong>Browser storage</strong> (local storage) to remember your shopping bag, your sign-in status and a saved
                delivery address on your device.
              </>,
              <>
                <strong>Google Analytics</strong>, a service from Google that uses cookies to measure how visitors use the website (for
                example pages visited, device and browser type, and approximate location). We use this to understand and improve the
                website. Google processes this data under its own privacy policy.
              </>,
            ]}
          />
          <p style={{ margin: "0 0 0.75rem" }}>
            <strong>Your choices:</strong> you can block or delete cookies in your browser settings; blocking essential cookies may stop
            sign-in and the shopping bag from working. You can stop Google Analytics from collecting data about your visits by installing
            Google&apos;s{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6B4E37", fontWeight: 600, textDecoration: "underline" }}
            >
              Google Analytics opt-out browser add-on
            </a>
            .
          </p>
          <p style={{ margin: 0 }}>We do not store personally identifiable information in analytics cookies.</p>
        </>
      ),
    },
    {
      id: "automatic-collection",
      title: "Information collected automatically",
      content: (
        <>
          <p style={{ margin: 0 }}>When you visit our website, we may automatically collect:</p>
          <PolicyList items={["IP address", "Browser type", "Device information", "Pages visited", "Time spent on the website", "Referral source"]} />
          <p style={{ margin: 0 }}>This data is used for analytics, performance improvement and security.</p>
        </>
      ),
    },
    {
      id: "sharing",
      title: "Sharing of information",
      content: (
        <>
          <p style={{ margin: 0 }}>We may share your information with:</p>
          <PolicyList
            items={[
              "Our payment provider (Razorpay)",
              "Our e-commerce platform (Shopify), which stores orders and customer accounts",
              "Courier and logistics partners",
              "Analytics providers (Google Analytics)",
              "IT and hosting service providers",
              "Marketing service providers (only where permitted)",
              "Government authorities, when required by law",
            ]}
          />
          <p style={{ margin: 0 }}>
            We do not sell your personal information. Third parties that receive your data must keep it confidential and use it only for the
            stated purposes.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "Data security",
      content: (
        <p style={{ margin: 0 }}>
          We use reasonable security practices, including secure servers, SSL encryption and access controls. No system can guarantee
          complete security, so please take care when sharing personal data online.
        </p>
      ),
    },
    {
      id: "your-rights",
      title: "Your rights",
      content: (
        <p style={{ margin: 0 }}>
          You may access your personal information, correct inaccurate information, ask us to delete your data (subject to legal
          obligations) or withdraw consent for marketing messages. To do so, email <MailLink />.
        </p>
      ),
    },
    {
      id: "third-party-links",
      title: "Third-party links",
      content: (
        <p style={{ margin: 0 }}>
          Our website may link to other websites, including YouTube videos on our Travel inspiration page. Nomadica is not responsible for the
          privacy practices or content of those websites; please review their privacy policies.
        </p>
      ),
    },
    {
      id: "children",
      title: "Children's privacy",
      content: (
        <p style={{ margin: 0 }}>
          Nomadica does not knowingly collect personal information from anyone under 18. If we learn that we have, we will take steps to
          delete it.
        </p>
      ),
    },
    {
      id: "business-transfers",
      title: "Business transfers",
      content: (
        <p style={{ margin: 0 }}>
          In case of a merger, acquisition, restructuring or sale of assets, user information may be transferred to the acquiring entity,
          subject to applicable data protection laws.
        </p>
      ),
    },
    {
      id: "reviews",
      title: "Testimonials and reviews",
      content: (
        <p style={{ margin: 0 }}>
          By submitting a review or testimonial, you agree that we may publish it with your name and city (if provided) on the website or
          social media. We may edit reviews for clarity without changing their meaning.
        </p>
      ),
    },
    {
      id: "updates",
      title: "Updates to this policy",
      content: (
        <p style={{ margin: 0 }}>
          We may update this Privacy Policy from time to time. Updated versions will be posted on this page with a new &quot;Last updated&quot;
          date. Continuing to use the website after changes are posted means you accept the revised policy.
        </p>
      ),
    },
  ];

  // TODO(store owner): set SITE.grievanceOfficer in lib/site.ts (name, email, phone). The
  // Grievance Officer section is hidden until it is set; it is likely required by law.
  if (SITE.grievanceOfficer) {
    const officer = SITE.grievanceOfficer;
    sections.push({
      id: "grievance-officer",
      title: "Grievance Officer",
      content: (
        <p style={{ margin: 0 }}>
          <strong>Name:</strong> {officer.name}
          <br />
          <strong>Email:</strong> <MailLink email={officer.email} />
          {officer.phone && (
            <>
              <br />
              <strong>Phone:</strong> <a href={`tel:${officer.phone.replace(/\s+/g, "")}`} style={{ color: "#6B4E37", fontWeight: 600 }}>{officer.phone}</a>
            </>
          )}
          {SITE.registeredAddress && (
            <>
              <br />
              <strong>Address:</strong> {SITE.registeredAddress}
            </>
          )}
        </p>
      ),
    });
  }

  sections.push({
    id: "contact",
    title: "Contact us",
    content: (
      <p style={{ margin: 0 }}>
        For questions about this Privacy Policy, email <MailLink /> or see our <PolicyLink href="/support/contact">contact page</PolicyLink>.
      </p>
    ),
  });

  return sections;
}

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      intro="How Nomadica collects, uses and protects your personal information."
      sections={buildSections()}
      showToc
      lastUpdated={POLICY_LAST_UPDATED}
    />
  );
}
