// app/support/contact/page.tsx
import { Mail, Phone, MessageCircle, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import PolicyLayout, { MailLink, PolicyLink, POLICY_ACCENT } from "@/components/support/PolicyLayout";

// TODO(store owner): set SITE.supportPhone, SITE.whatsappNumber and SITE.registeredAddress in
// lib/site.ts. Each contact method below only appears once its value is set. Business hours
// were removed from this page because they aren't confirmed; add them to lib/site.ts if needed.

function ContactRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-lg bg-[#F7F3EE] p-5">
      <div
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-white"
        style={{ backgroundColor: POLICY_ACCENT }}
      >
        {icon}
      </div>
      <div>
        <h3 className="m-0 mb-1 text-base font-semibold text-[#1E1E1E]">{label}</h3>
        <div>{children}</div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <PolicyLayout title="Contact Us" intro="We're here to help." showHelpFooter={false}>
      <section aria-labelledby="contact-methods" style={{ marginBottom: "2.5rem" }}>
        <h2
          id="contact-methods"
          style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 1.25rem" }}
        >
          Get in touch
        </h2>
        <div className="flex flex-col gap-4">
          <ContactRow icon={<Mail size={22} />} label="Email">
            <MailLink />
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem" }}>
              For orders, returns or anything else. We reply within {SITE.supportResponse}. Please include your order number if your
              question is about an order.
            </p>
          </ContactRow>

          {SITE.supportPhone && (
            <ContactRow icon={<Phone size={22} />} label="Phone">
              <a href={`tel:${SITE.supportPhone.replace(/\s+/g, "")}`} style={{ color: POLICY_ACCENT, fontWeight: 600, textDecoration: "underline" }}>
                {SITE.supportPhone}
              </a>
            </ContactRow>
          )}

          {SITE.whatsappNumber && (
            <ContactRow icon={<MessageCircle size={22} />} label="WhatsApp">
              <a
                href={`https://wa.me/${SITE.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: POLICY_ACCENT, fontWeight: 600, textDecoration: "underline" }}
              >
                Chat with us on WhatsApp
              </a>
            </ContactRow>
          )}

          {SITE.registeredAddress && (
            <ContactRow icon={<MapPin size={22} />} label="Address">
              <address style={{ fontStyle: "normal" }}>{SITE.registeredAddress}</address>
            </ContactRow>
          )}
        </div>
      </section>

      <section aria-labelledby="self-service">
        <h2
          id="self-service"
          style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 1rem" }}
        >
          Find it faster
        </h2>
        <ul style={{ paddingLeft: "1.5rem", margin: 0, listStyle: "disc", lineHeight: 2 }}>
          <li>
            <PolicyLink href="/order-tracking">Track your order</PolicyLink>
          </li>
          <li>
            <PolicyLink href="/account/orders">My Orders</PolicyLink>: cancel or change an order before it&apos;s packed, or request a return
          </li>
          <li>
            <PolicyLink href="/support/faq">Frequently asked questions</PolicyLink>
          </li>
          <li>
            <PolicyLink href="/support/return-policy">Returns &amp; Refunds</PolicyLink> and{" "}
            <PolicyLink href="/support/shipping-policy">Shipping</PolicyLink> policies
          </li>
        </ul>
      </section>
    </PolicyLayout>
  );
}
