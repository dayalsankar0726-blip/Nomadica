// app/support/terms/page.tsx
//
// NOTE FOR LEGAL REVIEW: only facts were aligned in this revision (registration methods,
// payment methods, cancellation, contact details). The legal wording (liability, governing
// law and jurisdiction, grievance redressal under the Consumer Protection (E-Commerce) Rules,
// 2020) has not been reviewed and should be checked by a lawyer.
import { SITE } from "@/lib/site";
import PolicyLayout, { MailLink, PolicyLink, PolicyList, type PolicySection } from "@/components/support/PolicyLayout";
import { CANCEL_TEXT, PAYMENT_METHODS_TEXT, POLICY_LAST_UPDATED } from "@/components/support/policyFacts";

const operator = SITE.legalName ?? SITE.name;

function buildSections(): PolicySection[] {
  const sections: PolicySection[] = [
    {
      id: "acceptance",
      title: "Acceptance of terms",
      content: (
        <>
          <p style={{ margin: "0 0 0.75rem" }}>
            1.1 Any person accessing or using the Platform (&quot;User&quot;, &quot;You&quot;, &quot;Your&quot;) agrees to be bound by these Terms and
            Conditions and all policies referenced in them.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>
            1.2 These Terms are a legally binding agreement between You and {operator} about your access to and use of the Platform.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>
            1.3 {SITE.name} may update, modify or amend these Terms at any time without prior notice. Continued use of the Platform means you
            accept the changes.
          </p>
          <p style={{ margin: 0 }}>1.4 If you do not agree with these Terms, please do not use the Platform.</p>
        </>
      ),
    },
    {
      id: "registration",
      title: "Registration",
      content: (
        <>
          <p style={{ margin: "0 0 0.75rem" }}>
            2.1 To use certain services, you may need to create an account on the Platform. Registration is free.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>2.2 You can register by creating an account with your email address and a password.</p>
          <p style={{ margin: 0 }}>
            2.3 You are responsible for keeping your login details confidential and for all activity under your account.
          </p>
        </>
      ),
    },
    {
      id: "user-responsibilities",
      title: "User responsibilities and restrictions",
      content: (
        <>
          <p style={{ margin: 0 }}>3.1 You agree to use the Platform only for lawful purposes.</p>
          <p style={{ margin: "0.75rem 0 0" }}>3.2 You shall not:</p>
          <PolicyList
            items={[
              "Modify or copy any content without authorisation.",
              "Attempt to reverse engineer or hack the Platform.",
              "Post defamatory, obscene, abusive or unlawful content.",
              "Upload viruses or harmful code.",
              "Impersonate another person.",
              "Engage in spamming, phishing or fraudulent activities.",
            ]}
          />
          <p style={{ margin: 0 }}>3.3 You confirm that:</p>
          <PolicyList items={["You are at least 18 years of age.", "All information you provide is accurate and complete."]} />
        </>
      ),
    },
    {
      id: "orders",
      title: "Products and orders",
      content: (
        <>
          <p style={{ margin: 0 }}>
            4.1 Display of products on the Platform is an invitation to offer. Placing an order is your offer to purchase.
          </p>
          <p style={{ margin: "0.75rem 0 0" }}>4.2 All orders are subject to:</p>
          <PolicyList items={["Product availability", `Acceptance by ${SITE.name}`, "Successful payment authorisation (for prepaid orders)"]} />
          <p style={{ margin: "0 0 0.75rem" }}>
            4.3 {SITE.name} may cancel any order because of pricing errors, stock unavailability or suspicious transactions.
          </p>
          <p style={{ margin: "0 0 0.75rem" }}>4.4 Prices are subject to change without prior notice.</p>
          <p style={{ margin: 0 }}>
            4.5 {CANCEL_TEXT} See the <PolicyLink href="/support/return-policy">Returns &amp; Refunds policy</PolicyLink> for details.
          </p>
        </>
      ),
    },
    {
      id: "payments",
      title: "Payments",
      content: (
        <>
          <p style={{ margin: 0 }}>5.1 We accept {PAYMENT_METHODS_TEXT}</p>
          <p style={{ margin: "0.75rem 0" }}>5.2 You agree to provide accurate payment information.</p>
          <p style={{ margin: 0 }}>
            5.3 {SITE.name} is not liable for any loss caused by payment gateway issues in the case of failed transactions.
          </p>
        </>
      ),
    },
    {
      id: "intellectual-property",
      title: "Intellectual property",
      content: (
        <>
          <p style={{ margin: "0 0 0.75rem" }}>
            6.1 All content on the Platform, including logos, designs, graphics, product images, text and website layout, is the intellectual
            property of {SITE.name} or its licensors and is protected under applicable laws.
          </p>
          <p style={{ margin: 0 }}>6.2 No content may be copied, reproduced or used for commercial purposes without prior written permission.</p>
        </>
      ),
    },
    {
      id: "user-content",
      title: "User-generated content",
      content: (
        <>
          <p style={{ margin: "0 0 0.75rem" }}>
            7.1 If you post reviews, comments or feedback, you grant {SITE.name} a royalty-free, perpetual licence to use, reproduce and publish
            that content.
          </p>
          <p style={{ margin: 0 }}>7.2 {SITE.name} may remove any content that violates these Terms.</p>
        </>
      ),
    },
    {
      id: "warranties",
      title: "Disclaimer of warranties",
      content: (
        <>
          <p style={{ margin: "0 0 0.75rem" }}>8.1 The Platform and Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis.</p>
          <p style={{ margin: "0 0 0.75rem" }}>
            8.2 {SITE.name} does not guarantee uninterrupted access, error-free functionality or exact colour accuracy of products.
          </p>
          <p style={{ margin: 0 }}>8.3 {SITE.name}&apos;s liability, if any, is limited to the order amount paid by the User.</p>
        </>
      ),
    },
    {
      id: "liability",
      title: "Limitation of liability",
      content: (
        <p style={{ margin: 0 }}>
          {SITE.name} is not liable for indirect losses, loss of profits, delivery delays caused by courier partners, or unauthorised account
          access due to user negligence.
        </p>
      ),
    },
    {
      id: "indemnification",
      title: "Indemnification",
      content: (
        <p style={{ margin: 0 }}>
          You agree to indemnify and hold harmless {SITE.name} from claims arising out of a violation of these Terms or misuse of the Platform.
        </p>
      ),
    },
    {
      id: "termination",
      title: "Termination",
      content: (
        <p style={{ margin: 0 }}>{SITE.name} may suspend or terminate your account for breach of these Terms, false information or fraudulent activity.</p>
      ),
    },
    {
      id: "force-majeure",
      title: "Force majeure",
      content: <p style={{ margin: 0 }}>{SITE.name} is not liable for failure to perform its obligations because of events beyond reasonable control.</p>,
    },
    {
      id: "governing-law",
      title: "Governing law",
      content: (
        <p style={{ margin: 0 }}>
          These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts in Mumbai,
          Maharashtra.
        </p>
      ),
    },
    {
      id: "communication",
      title: "Communication",
      content: (
        <p style={{ margin: 0 }}>
          By registering, you agree to receive order updates and promotional messages. You can unsubscribe from promotional messages at any
          time.
        </p>
      ),
    },
  ];

  // TODO(store owner): set SITE.legalName, SITE.registeredAddress, SITE.gstin and SITE.cin in
  // lib/site.ts. The company details section is hidden until at least one is set; these
  // details are likely required under the Consumer Protection (E-Commerce) Rules, 2020.
  if (SITE.legalName || SITE.registeredAddress || SITE.gstin || SITE.cin) {
    sections.push({
      id: "company-details",
      title: "Company details",
      content: (
        <p style={{ margin: 0 }}>
          {SITE.legalName && (
            <>
              <strong>Legal name:</strong> {SITE.legalName}
              <br />
            </>
          )}
          {SITE.registeredAddress && (
            <>
              <strong>Registered office:</strong> {SITE.registeredAddress}
              <br />
            </>
          )}
          {SITE.gstin && (
            <>
              <strong>GSTIN:</strong> {SITE.gstin}
              <br />
            </>
          )}
          {SITE.cin && (
            <>
              <strong>CIN:</strong> {SITE.cin}
            </>
          )}
        </p>
      ),
    });
  }

  // TODO(store owner): set SITE.grievanceOfficer in lib/site.ts so the Grievance Officer's
  // name and contact details appear here (likely required by law).
  sections.push({
    id: "grievance-redressal",
    title: "Grievance redressal",
    content: SITE.grievanceOfficer ? (
      <p style={{ margin: 0 }}>
        For complaints, contact our Grievance Officer:
        <br />
        <strong>Name:</strong> {SITE.grievanceOfficer.name}
        <br />
        <strong>Email:</strong> <MailLink email={SITE.grievanceOfficer.email} />
        {SITE.grievanceOfficer.phone && (
          <>
            <br />
            <strong>Phone:</strong> {SITE.grievanceOfficer.phone}
          </>
        )}
      </p>
    ) : (
      <p style={{ margin: 0 }}>
        For any complaints or queries, email <MailLink />.
      </p>
    ),
  });

  return sections;
}

export default function TermsPage() {
  return (
    <PolicyLayout
      title="Terms and Conditions"
      intro="Please read these terms carefully before using the Nomadica website."
      sections={buildSections()}
      showToc
      lastUpdated={POLICY_LAST_UPDATED}
    >
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ margin: "0 0 1rem" }}>
          The website <strong>{SITE.domain}</strong> (the &quot;Platform&quot;) is owned and operated by {operator}. By accessing or using the
          Platform, you agree to comply with and be bound by the following Terms and Conditions.
        </p>
        <p style={{ margin: 0 }}>
          This document is an electronic record under the Information Technology Act, 2000 and the rules made under it. It is generated by a
          computer system and does not require any physical or digital signature.
        </p>
      </div>
    </PolicyLayout>
  );
}
