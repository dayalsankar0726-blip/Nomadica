// app/account/_components/useRequireAuth.ts
"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/utils/hooks/useAuth";
import { loginUrlFor } from "../_lib/redirect";

/**
 * Guards a signed-in page. Once the server has confirmed there is no session, sends
 * the customer to sign in and brings them back to this exact page afterwards.
 * Must be used under a <Suspense> boundary (it reads the query string).
 */
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    if (auth.verified && !auth.isAuthenticated) {
      router.replace(loginUrlFor(query ? `${pathname}?${query}` : pathname));
    }
  }, [auth.verified, auth.isAuthenticated, pathname, query, router]);

  return auth;
}
