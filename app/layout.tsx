import "./globals.css";
import { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ClientLayout from "./ClientLayout";
import { constructRootMetadata } from "@/lib/seo/metadata";
import { getOrganizationSchema } from "@/lib/schema/organization";
import { getWebsiteSchema } from "@/lib/schema/website";
import JsonLd from "@/components/seo/JsonLd";
import GoogleAnalytics from "@/components/seo/GoogleAnalytics";
import localFont from "next/font/local";

// Fonts are bundled with the app (app/fonts, SIL Open Font License) so builds
// never depend on downloading from Google Fonts.
const montserrat = localFont({
  src: "./fonts/Montserrat-Variable.woff2",
  display: "swap",
  variable: "--font-body",
  weight: "300 700",
});

const playfairDisplay = localFont({
  src: "./fonts/PlayfairDisplay-Variable.woff2",
  display: "swap",
  variable: "--font-heading",
  weight: "400 700",
});

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

// Title template "%s | Nomadica" for child pages; no root canonical (each page sets its own).
export const metadata: Metadata = {
  ...constructRootMetadata(),
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationSchema = getOrganizationSchema();
  const websiteSchema = getWebsiteSchema();

  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className={`${montserrat.variable} ${playfairDisplay.variable}`} suppressHydrationWarning>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <GoogleAnalytics />
        <JsonLd schema={organizationSchema} />
        <JsonLd schema={websiteSchema} />
        <ClientLayout>
          <Navbar />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </ClientLayout>
      </body>
    </html>
  );
}
