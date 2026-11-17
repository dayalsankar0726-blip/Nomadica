// app/account/_components/AccountShell.tsx
"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/utils/hooks/useAuth";
import { BusyButton } from "./BusyButton";

const TABS = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/orders", label: "My orders" },
  { href: "/account/wishlist", label: "Wishlist" },
];

/** Shared header, navigation and sign-out for the signed-in account pages. */
export function AccountShell({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const firstName = typeof user?.firstName === "string" ? user.firstName.trim() : "";

  return (
    <div className="acct-shell">
      <div className="acct-shell-inner">
        <div className="acct-shell-header">
          <div>
            <h1 className="acct-shell-title">{title}</h1>
            {firstName && <p className="acct-shell-greeting">Signed in as {firstName}</p>}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            {actions}
            <BusyButton
              variant="outline"
              small
              busy={signingOut}
              busyLabel="Signing out…"
              onClick={async () => {
                setSigningOut(true);
                await logout();
              }}
            >
              <LogOut size={14} aria-hidden="true" />
              Sign out
            </BusyButton>
          </div>
        </div>

        <nav aria-label="Account" className="acct-tabs">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link key={tab.href} href={tab.href} className="acct-tab" aria-current={active ? "page" : undefined}>
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}
