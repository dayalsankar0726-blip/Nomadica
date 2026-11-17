"use client";
import { useState } from "react";
import Link from "next/link";
import { AccordionItem } from "./AccordionItem";
import type { ProductDetails } from "./productDetailUtils";
import { sanitizeDescriptionHtml } from "@/lib/products/description";
import { deliveryEstimate } from "@/lib/products/delivery";
import { POLICY } from "@/lib/site";
import { formatINR } from "@/lib/pricing";
import styles from "./ProductDetail.module.css";

/** Care for printed tees: shown only for T-shirts without their own care instructions. */
const PRINTED_TEE_CARE = [
  "Wash inside out",
  "Do not twist or wring while drying (this may damage the print)",
  "Do not tumble dry",
  "Iron inside out; do not iron directly on the print",
];

const lines = (text: string) =>
  text
    .split(/\r?\n|•/)
    .map((l) => l.trim())
    .filter(Boolean);

interface ProductAccordionsProps {
  product: ProductDetails;
  /** True for T-shirts (printed tee care applies when the store gives none). */
  isTee: boolean;
}

export function ProductAccordions({ product, isTee }: ProductAccordionsProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({ details: true });
  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const html = sanitizeDescriptionHtml(product.descriptionHtml);
  const materials = lines(product.materials);
  const care = product.care ? lines(product.care) : isTee ? PRINTED_TEE_CARE : [];
  const estimate = deliveryEstimate();

  return (
    <div style={{ borderTop: "1px solid rgba(30, 30, 30, 0.12)" }}>
      <AccordionItem title="Product details" isOpen={!!open.details} onToggle={() => toggle("details")}>
        {html ? (
          // Sanitised: only simple formatting tags, no attributes or scripts (lib/products/description).
          <div className={styles.description} dangerouslySetInnerHTML={{ __html: html }} />
        ) : product.description ? (
          <p style={{ margin: 0, whiteSpace: "pre-line" }}>{product.description}</p>
        ) : (
          <p style={{ margin: 0 }}>Travel-inspired design by Nomadica. For questions about this product, please contact our support team.</p>
        )}
        {materials.length > 0 && (
          <>
            <p style={{ fontWeight: 600, color: "#1E1E1E", margin: "1rem 0 0.25rem" }}>Materials</p>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", listStyle: "disc" }}>
              {materials.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </>
        )}
      </AccordionItem>

      {care.length > 0 && (
        <AccordionItem title="Care instructions" isOpen={!!open.care} onToggle={() => toggle("care")}>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", listStyle: "disc" }}>
            {care.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </AccordionItem>
      )}

      <AccordionItem title="Shipping & returns" isOpen={!!open.shipping} onToggle={() => toggle("shipping")}>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", listStyle: "disc", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <li>Orders are packed within {POLICY.processingDays} business days.</li>
          <li>
            Delivery takes {POLICY.deliveryDays} business days after dispatch{estimate.total ? ` (usually ${estimate.total} in all)` : ""}.
          </li>
          <li>
            Free shipping on orders of {formatINR(POLICY.freeShippingThreshold)} or more; {formatINR(POLICY.shippingFee)} below that.
          </li>
          <li>
            Returns accepted within {POLICY.returnDays} days of delivery. Damaged or wrong items must be reported within {POLICY.damageReportHours} hours of delivery.
          </li>
        </ul>
        <p style={{ margin: "0.75rem 0 0", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/support/return-policy" className="pd-focus" style={{ color: "#6B4E37", fontWeight: 600, textDecoration: "underline" }}>
            Return policy
          </Link>
          <Link href="/support/shipping-policy" className="pd-focus" style={{ color: "#6B4E37", fontWeight: 600, textDecoration: "underline" }}>
            Shipping policy
          </Link>
        </p>
      </AccordionItem>
    </div>
  );
}
