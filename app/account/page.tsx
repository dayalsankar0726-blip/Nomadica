// app/account/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/utils/hooks/useAuth";
import { PageLoader } from "@/components/ui/PageLoader";

const tileText: React.CSSProperties = {
  margin: 0,
  fontFamily: "'Montserrat', sans-serif",
  fontSize: "0.95rem",
  lineHeight: 1.7,
};

function Tile({ href, label, description, dark }: { href: string; label: string; description: string; dark?: boolean }) {
  return (
    <Link href={href} className={`acct-tile${dark ? " acct-tile-dark" : ""}`}>
      <h2 style={{ margin: "0 0 0.75rem", fontFamily: "'Playfair Display', serif", fontSize: "1.25rem" }}>{label}</h2>
      <p style={{ ...tileText, color: dark ? "rgba(255,255,255,0.88)" : "rgba(30,30,30,0.75)" }}>{description}</p>
    </Link>
  );
}

export default function AccountPage() {
  const { isAuthenticated, verified, loading, user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const firstName = typeof user?.firstName === "string" ? user.firstName.trim() : "";

  return (
    <div style={{ minHeight: "70vh", backgroundColor: "#FFFFFF" }}>
      <section style={{ padding: "clamp(2.5rem, 6vw, 5rem) 1rem" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.85rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#1E1E1E", marginBottom: "1rem" }}>
            Account
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.25rem, 5vw, 4rem)", margin: "0 0 1.5rem", color: "#1E1E1E" }}>
            {isAuthenticated && firstName ? `Hello, ${firstName}.` : "Your account hub."}
          </h1>

          {loading && !verified ? (
            <PageLoader label="Checking your account" />
          ) : isAuthenticated ? (
            <>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "1rem", lineHeight: 1.8, color: "rgba(30,30,30,0.75)", marginBottom: "2.5rem" }}>
                Manage your details, saved addresses, orders and wishlist.
              </p>
              <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
                <Tile href="/account/orders" label="My orders" description="Track orders, edit or cancel before packing, and buy again." dark />
                <Tile href="/account/profile" label="Profile" description="Your name, email, phone and password." />
                <Tile href="/account/profile?tab=addresses" label="Addresses" description="Add, edit and choose your default delivery address." />
                <Tile href="/account/wishlist" label="Wishlist" description="The pieces you've saved for later." />
              </div>
              <div style={{ marginTop: "2rem" }}>
                <button
                  type="button"
                  className="acct-btn-outline"
                  disabled={signingOut}
                  onClick={async () => {
                    setSigningOut(true);
                    await logout();
                  }}
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "1rem", lineHeight: 1.8, color: "rgba(30,30,30,0.75)", marginBottom: "2.5rem" }}>
                Sign in to see your orders, saved addresses and wishlist.
              </p>
              <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
                <Tile href="/account/login" label="Sign in" description="Return to your account and manage your orders." dark />
                <Tile href="/account/signup" label="Create account" description="Join Nomadica to save favourites and track orders." />
                <Tile href="/order-tracking" label="Track an order" description="Check an order with its number and email, no account needed." />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
