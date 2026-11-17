// app/account/profile/page.tsx
"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
import { AccountShell } from "../_components/AccountShell";
import { AddressBook } from "../_components/AddressBook";
import { PersonalDetailsCard, SecurityCard, type ProfileUser } from "../_components/ProfileCards";
import { useRequireAuth } from "../_components/useRequireAuth";

function ProfileContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, user, verified } = useRequireAuth();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const addressesRef = useRef<HTMLHeadingElement>(null);
  const passwordReset = searchParams.get("passwordReset") === "1";
  const wantsAddresses = searchParams.get("tab") === "addresses";

  const current: ProfileUser | null = profile || (user ? { email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone } : null);
  const ready = isAuthenticated && !!current;

  // /account/addresses and ?tab=addresses open the page at the address book.
  useEffect(() => {
    if (ready && wantsAddresses) {
      const heading = addressesRef.current;
      heading?.scrollIntoView({ behavior: "smooth", block: "start" });
      heading?.focus({ preventScroll: true });
    }
  }, [ready, wantsAddresses]);

  if (!ready) return <PageLoader label={verified ? "Taking you to sign in" : "Loading your profile"} />;

  return (
    <AccountShell title="Profile">
      {passwordReset && (
        <p role="status" className="acct-alert acct-alert-success" style={{ marginBottom: "1.5rem" }}>
          Your new password is saved and you&apos;re signed in.
        </p>
      )}
      <div className="acct-cards">
        <div style={{ display: "grid", gap: "2rem" }}>
          <PersonalDetailsCard user={current} onUpdated={setProfile} />
          <SecurityCard email={current.email} />
        </div>
        <AddressBook ref={addressesRef} />
      </div>
    </AccountShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProfileContent />
    </Suspense>
  );
}
