// components/support/PolicyLayout.tsx
//
// Shared layout for the support hub, FAQ, contact and every policy page, so they all look
// the same: dark banner, white content card, optional summary box and table of contents,
// "Last updated" line and a "Still need help?" footer.
import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

export interface PolicySection {
  /** Anchor id, used by the table of contents. */
  id: string;
  title: string;
  content: ReactNode;
}

/** Brand brown dark enough for white text (WCAG AA) and for links on white. */
export const POLICY_ACCENT = "#6B4E37";

const bodyText = "rgba(30,30,30,0.8)";

/** Email link in the policy style. */
export function MailLink({ email = SITE.supportEmail }: { email?: string }) {
  return (
    <a href={`mailto:${email}`} style={{ color: POLICY_ACCENT, fontWeight: 600, textDecoration: "underline" }}>
      {email}
    </a>
  );
}

/** Internal link in the policy style. */
export function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ color: POLICY_ACCENT, fontWeight: 600, textDecoration: "underline" }}>
      {children}
    </Link>
  );
}

/** Bulleted list with consistent spacing. */
export function PolicyList({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ paddingLeft: "1.5rem", margin: "0.5rem 0", lineHeight: 1.7, listStyle: "disc" }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: "0.25rem" }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PolicyLayout({
  title,
  intro,
  summary,
  sections,
  showToc = false,
  lastUpdated,
  children,
  showHelpFooter = true,
}: {
  title: string;
  intro?: ReactNode;
  /** Short "at a glance" box shown above the full text. */
  summary?: ReactNode;
  sections?: PolicySection[];
  showToc?: boolean;
  /** e.g. "14 November 2026" */
  lastUpdated?: string;
  /** Free content rendered after the intro text and before the sections. */
  children?: ReactNode;
  showHelpFooter?: boolean;
}) {
  return (
    <div style={{ backgroundColor: "#F9F8F6", minHeight: "100vh", paddingBottom: "4rem" }}>
      <div className="px-4 py-12 sm:py-20 text-center" style={{ backgroundColor: POLICY_ACCENT, color: "#FFFFFF" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
            fontWeight: 500,
            margin: "0 0 0.5rem",
          }}
        >
          {title}
        </h1>
        {intro && (
          <p
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "1.05rem",
              margin: "0 auto",
              maxWidth: "680px",
              lineHeight: 1.6,
              color: "#FFFFFF",
            }}
          >
            {intro}
          </p>
        )}
      </div>

      <div className="px-4 sm:px-6" style={{ maxWidth: "848px", margin: "2rem auto 0" }}>
        <div
          className="px-5 py-8 sm:px-12 sm:py-14"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.03)",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "0.95rem",
            color: bodyText,
            lineHeight: 1.8,
          }}
        >
          {summary && (
            <aside
              aria-label="Summary"
              style={{
                backgroundColor: "#F7F3EE",
                borderLeft: `4px solid ${POLICY_ACCENT}`,
                borderRadius: "8px",
                padding: "1.25rem 1.5rem",
                marginBottom: "2.5rem",
                color: "#1E1E1E",
              }}
            >
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
                At a glance
              </h2>
              {summary}
            </aside>
          )}

          {children}

          {showToc && sections && sections.length > 0 && (
            <nav aria-labelledby="policy-toc" style={{ marginBottom: "2.5rem" }}>
              <h2 id="policy-toc" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.5rem" }}>
                Contents
              </h2>
              <ol style={{ paddingLeft: "1.5rem", margin: 0, listStyle: "decimal" }}>
                {sections.map((sec) => (
                  <li key={sec.id}>
                    <a href={`#${sec.id}`} style={{ color: POLICY_ACCENT, textDecoration: "underline" }}>
                      {sec.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {sections?.map((sec, i) => (
            <section key={sec.id} id={sec.id} aria-labelledby={`${sec.id}-heading`} style={{ marginBottom: "2.5rem", scrollMarginTop: "90px" }}>
              <h2
                id={`${sec.id}-heading`}
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.35rem",
                  fontWeight: 600,
                  color: "#1E1E1E",
                  margin: "0 0 1rem",
                  borderBottom: `1px solid ${POLICY_ACCENT}`,
                  paddingBottom: "0.5rem",
                }}
              >
                {showToc ? `${i + 1}. ` : ""}
                {sec.title}
              </h2>
              <div>{sec.content}</div>
            </section>
          ))}

          {showHelpFooter && (
            <div style={{ marginTop: "1rem", padding: "1.5rem", borderRadius: "8px", backgroundColor: "#F7F3EE", color: "#1E1E1E" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
                Still need help?
              </h2>
              <p style={{ margin: 0 }}>
                Email us at <MailLink /> and we&apos;ll reply within {SITE.supportResponse}, or visit the{" "}
                <PolicyLink href="/support">Help Centre</PolicyLink>.
              </p>
            </div>
          )}

          {lastUpdated && (
            <p style={{ textAlign: "center", marginTop: "2rem", marginBottom: 0, fontSize: "0.8rem", color: "rgba(30,30,30,0.7)" }}>
              Last updated: {lastUpdated}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
