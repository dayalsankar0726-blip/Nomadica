"use client";
import { useState, useEffect, useRef, useCallback, useSyncExternalStore, type RefObject, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search, ShoppingBag, User, Heart, Menu, X, ChevronDown, Package, Settings, LogOut, Minus, Plus
} from "lucide-react";
import { useAuth } from "@/utils/hooks/useAuth";
import { api } from "@/components/api/api";
import Image from "next/image";
import { getShopifyImageUrl } from "@/lib/images/shopifyImage";
import { formatINR } from "@/lib/pricing";
import { POLICY } from "@/lib/site";

type NavLink = { label: string; href: string; children?: { label: string; href: string }[] };

const navLinks: NavLink[] = [
  { label: "HOME", href: "/" },
  {
    label: "SHOP",
    href: "/shop",
    children: [
      { label: "Shop All", href: "/shop" },
      { label: "New Arrivals", href: "/shop/new-arrivals" },
      { label: "Best Sellers", href: "/shop/best-sellers" },
      { label: "Collections", href: "/shop/collections" },
    ],
  },
  { label: "JOURNAL", href: "/journal" },
  { label: "INSPIRATION", href: "/brand/story" },
  { label: "ABOUT", href: "/brand/about" },
];

/** Secondary links shown in the mobile menu (desktop gets them in the footer / account menu). */
const helpLinks = [
  { label: "Track Order", href: "/order-tracking" },
  { label: "Help & FAQ", href: "/support/faq" },
  { label: "Contact Us", href: "/support/contact" },
];

const LOGO_SRC = "/Nomadica-main-logo.jpg"; // 1200 x 273
const LOGO_RATIO = 1200 / 273;

const BODY_FONT = "var(--font-body), sans-serif";
const MUTED = "rgba(30, 30, 30, 0.72)";

const dropdownItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  minHeight: "44px",
  padding: "0.5rem 1rem",
  fontFamily: BODY_FONT,
  fontSize: "0.875rem",
  color: "#1E1E1E",
  textDecoration: "none",
  background: "transparent",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
};

const iconButtonStyle: CSSProperties = {
  position: "relative",
  color: "#1E1E1E",
  textDecoration: "none",
  // display comes from className ("flex" or "hidden sm:flex"): an inline display would
  // override the responsive classes and show hidden icons on phones.
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2px",
  minWidth: "44px",
  minHeight: "44px",
  padding: "0 4px",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: BODY_FONT,
};

const iconLabelStyle: CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  fontFamily: BODY_FONT,
  fontWeight: 500,
  letterSpacing: "0.04em",
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog behaviour: moves focus in, traps Tab, closes on Escape, and returns focus
 * to whatever was focused before when it closes.
 */
function useModalDialog(open: boolean, panelRef: RefObject<HTMLElement | null>, initialFocusRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    (initialFocusRef.current ?? panelRef.current)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [open, panelRef, initialFocusRef]);
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Shopify cart payloads are untyped here */
type CartLine = any;
type Cart = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const subscribeNoop = () => () => {};

function countLabel(n: number) {
  return n > 9 ? "9+" : String(n);
}

function Badge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "-7px",
        right: "-10px",
        minWidth: "18px",
        height: "18px",
        padding: "0 4px",
        borderRadius: "9px",
        backgroundColor: color,
        color: "#FFFFFF",
        fontSize: "11px",
        fontWeight: 700,
        lineHeight: "18px",
        textAlign: "center",
        fontFamily: BODY_FONT,
      }}
    >
      {countLabel(count)}
    </span>
  );
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  // false during SSR/hydration, true after: avoids auth-dependent hydration mismatches.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const burgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const cartPanelRef = useRef<HTMLDivElement>(null);
  const cartCloseRef = useRef<HTMLButtonElement>(null);
  const shopMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const checkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/brand/story") return pathname === "/brand/story";
    return pathname.startsWith(href);
  };

  // ---- Mini-cart state ----
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<Cart>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const fetchCart = useCallback(async () => {
    const cartId = typeof window !== "undefined" ? localStorage.getItem("nomadica_cart_id") : null;
    if (!cartId) {
      setCart(null);
      return;
    }
    setCartLoading(true);
    try {
      const res = await api.cart.get(cartId);
      setCart(res.cart);
      setCartError(null);
    } catch (err) {
      console.error("[NAVBAR] Failed to fetch cart:", err);
      setCartError("We couldn't load your bag. Please try again.");
    } finally {
      setCartLoading(false);
    }
  }, []);

  const handleUpdateQuantity = async (line: CartLine, quantity: number) => {
    const cartId = localStorage.getItem("nomadica_cart_id");
    if (!cartId) return;
    const title = line.merchandise?.product?.title || "Item";
    setPendingLineId(line.id);
    setCartError(null);
    try {
      await api.cart.update(cartId, {
        lines: [{ id: line.id, quantity, merchandiseId: line.merchandise?.id }],
      });
      await fetchCart();
      // The removed line's buttons are gone; keep focus inside the dialog.
      if (quantity === 0) cartPanelRef.current?.focus();
      setAnnouncement(quantity === 0 ? `${title} removed from your bag` : `${title} quantity updated to ${quantity}`);
    } catch (err) {
      console.error("[NAVBAR] Failed to update cart:", err);
      setCartError(
        quantity === 0
          ? `We couldn't remove ${title}. Please try again.`
          : `We couldn't update the quantity of ${title}. Please try again.`
      );
    } finally {
      setPendingLineId(null);
    }
  };

  useModalDialog(cartOpen, cartPanelRef, cartCloseRef, () => setCartOpen(false));
  useModalDialog(mobileOpen, mobileMenuRef, mobileCloseRef, () => setMobileOpen(false));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    setCartOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  // Body scroll lock while a panel is open
  useEffect(() => {
    document.body.style.overflow = (mobileOpen || cartOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen, cartOpen]);

  // Other components dispatch `cart-updated`; open the mini-cart unless told not to.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCart();

    const handleCartUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ openDrawer?: boolean } | undefined>).detail;
      fetchCart();
      const onBagPage = pathnameRef.current === "/cart" || pathnameRef.current.startsWith("/checkout");
      if (detail?.openDrawer !== false && !onBagPage) {
        setMobileOpen(false);
        setCartOpen(true);
        if (detail?.openDrawer === true) setAnnouncement("Added to your bag");
      }
    };

    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, [fetchCart]);

  // ---- Wishlist count ----
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!isAuthenticated) {
        setWishlistCount(0);
        return;
      }
      try {
        const res = await api.wishlist.list();
        setWishlistCount(res?.wishlist?.length || 0);
      } catch (err) {
        // Keep the last known count; the wishlist page shows its own error.
        console.error("[NAVBAR] Failed to fetch wishlist:", err);
      }
    };
    fetchWishlist();
    window.addEventListener("wishlist-updated", fetchWishlist);
    return () => window.removeEventListener("wishlist-updated", fetchWishlist);
  }, [isAuthenticated]);

  // ---- Desktop dropdowns: click/keyboard toggle, hover on mouse, Escape and outside click close ----
  useEffect(() => {
    if (!openDropdown) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (shopMenuRef.current?.contains(target) || userMenuRef.current?.contains(target)) return;
      setOpenDropdown(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openDropdown]);

  const dropdownKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && openDropdown) {
      e.stopPropagation();
      setOpenDropdown(null);
      e.currentTarget.querySelector<HTMLButtonElement>("button[aria-expanded]")?.focus();
    }
  };

  const dropdownBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenDropdown(null);
  };

  const lines: CartLine[] = cart?.lines?.edges?.map((edge: { node: CartLine }) => edge.node) ?? [];
  const totalItems = lines.reduce((acc: number, line: CartLine) => acc + (line.quantity || 0), 0);
  const subtotal = parseFloat(cart?.cost?.subtotalAmount?.amount || "0");
  const toFreeShipping = POLICY.freeShippingThreshold - subtotal;
  const wishlistHref = mounted && !isAuthenticated ? "/account/login?redirect=/account/wishlist" : "/account/wishlist";
  const showWishlistCount = mounted && isAuthenticated ? wishlistCount : 0;
  // Sign-in links bring the shopper back to the page they were on.
  const loginHref =
    pathname && !pathname.startsWith("/account/login") && !pathname.startsWith("/account/signup")
      ? `/account/login?redirect=${encodeURIComponent(pathname)}`
      : "/account/login";

  // Checkout gets a quiet header (logo + back to bag) so the funnel has no distractions.
  if (pathname?.startsWith("/checkout")) {
    return (
      <header style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 1rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" aria-label="Nomadica home" style={{ display: "flex", alignItems: "center" }}>
            <Image src={LOGO_SRC} alt="Nomadica" width={176} height={40} style={{ height: "36px", width: "auto" }} priority />
          </Link>
          <Link href="/cart" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "#6B4E37", textDecoration: "underline", textUnderlineOffset: "3px" }}>
            Back to bag
          </Link>
        </div>
      </header>
    );
  }

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          width: "100%",
          background: "#FBF9F7",
          borderBottom: "1px solid #eee",
          zIndex: 100,
        }}
      >
        <nav
          aria-label="Main"
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "74px",
            position: "relative",
          }}
        >
          <Link
            href="/"
            aria-label="Nomadica home"
            style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#1E1E1E", minHeight: "44px" }}
          >
            <Image
              src={LOGO_SRC}
              alt="Nomadica"
              width={Math.round(40 * LOGO_RATIO)}
              height={40}
              preload
              style={{ height: "40px", width: "auto", maxWidth: "45vw", objectFit: "contain", display: "block" }}
            />
          </Link>

          {/* Desktop Nav */}
          <ul
            style={{
              alignItems: "center",
              gap: "2rem",
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
            className="hidden lg:flex"
          >
            {navLinks.map((link) => (
              <li key={link.label}>
                {link.children ? (
                  <div
                    ref={shopMenuRef}
                    style={{ position: "relative", display: "flex", alignItems: "center" }}
                    onMouseEnter={() => setOpenDropdown(link.label)}
                    onMouseLeave={() => setOpenDropdown((cur) => (cur === link.label ? null : cur))}
                    onKeyDown={dropdownKeyDown}
                    onBlur={dropdownBlur}
                  >
                    <Link
                      href={link.href}
                      className={`nav-link ${checkActive(link.href) ? "nav-link-active" : ""}`}
                      aria-current={pathname === link.href ? "page" : undefined}
                      style={{ fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.02em", padding: "0.75rem 0" }}
                    >
                      {link.label}
                    </Link>
                    <button
                      type="button"
                      aria-label={`${link.label.charAt(0)}${link.label.slice(1).toLowerCase()} menu`}
                      aria-expanded={openDropdown === link.label}
                      aria-controls="shop-menu"
                      onClick={() => setOpenDropdown(openDropdown === link.label ? null : link.label)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "44px", padding: 0 }}
                    >
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        style={{ transform: openDropdown === link.label ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}
                      />
                    </button>

                    <div
                      id="shop-menu"
                      hidden={openDropdown !== link.label}
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid rgba(30,30,30,0.1)",
                        minWidth: "200px",
                        padding: "0.5rem 0",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                        animation: "fade-in 0.2s ease",
                      }}
                    >
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {link.children.map((child) => (
                          <li key={child.label}>
                            <Link
                              href={child.href}
                              className="nav-dropdown-item"
                              aria-current={pathname === child.href ? "page" : undefined}
                              style={{ ...dropdownItemStyle, padding: "0.5rem 1.25rem", fontFamily: "var(--font-heading), serif", fontSize: "0.9375rem", fontWeight: 500 }}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={link.href}
                    className={`nav-link ${checkActive(link.href) ? "nav-link-active" : ""}`}
                    aria-current={checkActive(link.href) ? "page" : undefined}
                    style={{ fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.02em", display: "flex", alignItems: "center", padding: "0.75rem 0" }}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            {/* Search */}
            <Link className="flex" href="/shop/search" aria-label="Search" style={iconButtonStyle}>
              <Search size={20} aria-hidden="true" />
              <span className="hidden xl:block" style={iconLabelStyle} aria-hidden="true">search</span>
            </Link>

            {/* Wishlist */}
            <Link
              href={wishlistHref}
              aria-label={showWishlistCount > 0 ? `Wishlist, ${showWishlistCount} ${showWishlistCount === 1 ? "item" : "items"}` : "Wishlist"}
              style={iconButtonStyle}
              className="hidden sm:flex"
            >
              <span style={{ position: "relative", display: "flex" }}>
                <Heart size={20} aria-hidden="true" />
                <Badge count={showWishlistCount} color="#B3261E" />
              </span>
              <span className="hidden xl:block" style={iconLabelStyle} aria-hidden="true">wishlist</span>
            </Link>

            {/* Account */}
            {mounted && isAuthenticated ? (
              <div
                ref={userMenuRef}
                style={{ position: "relative" }}
                className="hidden sm:block"
                onMouseEnter={() => setOpenDropdown("user")}
                onMouseLeave={() => setOpenDropdown((cur) => (cur === "user" ? null : cur))}
                onKeyDown={dropdownKeyDown}
                onBlur={dropdownBlur}
              >
                <button
                  type="button"
                  aria-label={`Account menu${user?.firstName ? ` for ${user.firstName}` : ""}`}
                  aria-expanded={openDropdown === "user"}
                  aria-controls="account-menu"
                  onClick={() => setOpenDropdown(openDropdown === "user" ? null : "user")}
                  style={iconButtonStyle}
                  className="flex"
                >
                  <User size={20} aria-hidden="true" />
                  <span className="hidden xl:block" style={iconLabelStyle} aria-hidden="true">
                    {user?.firstName || "account"}
                  </span>
                </button>
                <div
                  id="account-menu"
                  hidden={openDropdown !== "user"}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid rgba(30,30,30,0.1)",
                    minWidth: "200px",
                    padding: "0.25rem 0",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                    animation: "fade-in 0.2s ease",
                    zIndex: 1001,
                    borderRadius: "8px",
                  }}
                >
                  <p style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(30,30,30,0.08)", fontFamily: BODY_FONT, fontWeight: 600, fontSize: "0.95rem", color: "#1E1E1E", margin: 0 }}>
                    Hi, {user?.firstName || "there"}
                  </p>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    <li>
                      <Link href="/account/orders" className="nav-dropdown-item" style={dropdownItemStyle}>
                        <Package size={18} aria-hidden="true" color={MUTED} />
                        Orders
                      </Link>
                    </li>
                    <li>
                      <Link href="/order-tracking" className="nav-dropdown-item" style={dropdownItemStyle}>
                        <Search size={18} aria-hidden="true" color={MUTED} />
                        Track Order
                      </Link>
                    </li>
                    <li>
                      <Link href="/account/profile" className="nav-dropdown-item" style={dropdownItemStyle}>
                        <Settings size={18} aria-hidden="true" color={MUTED} />
                        Profile
                      </Link>
                    </li>
                    <li style={{ borderTop: "1px solid rgba(30,30,30,0.08)", marginTop: "0.25rem" }}>
                      <button
                        type="button"
                        className="nav-dropdown-item"
                        onClick={async () => {
                          setOpenDropdown(null);
                          await logout();
                        }}
                        style={dropdownItemStyle}
                      >
                        <LogOut size={18} aria-hidden="true" color={MUTED} />
                        Log out
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <Link href={loginHref} aria-label="Log in" style={iconButtonStyle} className="hidden sm:flex">
                <User size={20} aria-hidden="true" />
                <span className="hidden xl:block" style={iconLabelStyle} aria-hidden="true">log in</span>
              </Link>
            )}

            {/* Bag: opens the mini-cart */}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setCartOpen(true);
                fetchCart();
              }}
              aria-label={totalItems > 0 ? `Bag, ${totalItems} ${totalItems === 1 ? "item" : "items"}` : "Bag, empty"}
              aria-haspopup="dialog"
              aria-expanded={cartOpen}
              aria-controls="mini-cart"
              style={iconButtonStyle}
              className="flex"
            >
              <span style={{ position: "relative", display: "flex" }}>
                <ShoppingBag size={20} aria-hidden="true" />
                <Badge count={totalItems} color="#1E1E1E" />
              </span>
              <span className="hidden xl:block" style={iconLabelStyle} aria-hidden="true">bag</span>
            </button>

            {/* Burger */}
            <button
              ref={burgerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              style={{ ...iconButtonStyle, padding: 0 }}
              className="flex lg:hidden"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <Menu size={24} aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      {/* Screen-reader announcements for bag changes */}
      <div aria-live="polite" role="status" className="sr-only-text">
        {announcement}
      </div>

      {/* Mobile Menu */}
      <div
        ref={mobileMenuRef}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!mobileOpen}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          backgroundColor: "#FFFFFF",
          transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
          visibility: mobileOpen ? "visible" : "hidden",
          transition: mobileOpen
            ? "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
            : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear 0.35s",
          overflowY: "auto",
        }}
        className="lg:hidden"
      >
        <div
          style={{
            padding: "0 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: "64px",
            borderBottom: "1px solid rgba(30,30,30,0.08)",
          }}
        >
          <Image
            src={LOGO_SRC}
            alt="Nomadica"
            width={Math.round(32 * LOGO_RATIO)}
            height={32}
            style={{ height: "32px", width: "auto", objectFit: "contain", display: "block" }}
          />
          <button
            ref={mobileCloseRef}
            type="button"
            onClick={() => setMobileOpen(false)}
            style={{ ...iconButtonStyle, padding: 0 }}
            className="flex"
            aria-label="Close menu"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: "1.5rem 16px 2rem" }}>
          <Link
            href="/shop/search"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              minHeight: "48px",
              padding: "0 1rem",
              border: "1px solid rgba(30,30,30,0.2)",
              borderRadius: "4px",
              fontFamily: BODY_FONT,
              fontSize: "0.9375rem",
              color: MUTED,
              textDecoration: "none",
              marginBottom: "1rem",
            }}
          >
            <Search size={18} aria-hidden="true" />
            Search products
          </Link>

          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {navLinks.map((link) => (
              <li key={link.label} style={{ borderBottom: "1px solid rgba(30,30,30,0.08)" }}>
                {link.children ? (
                  <>
                    <button
                      type="button"
                      aria-expanded={mobileExpanded === link.label}
                      aria-controls={`mobile-sub-${link.label}`}
                      onClick={() => setMobileExpanded(mobileExpanded === link.label ? null : link.label)}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "1rem 0",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-heading), serif",
                        fontSize: "1.375rem",
                        fontWeight: 500,
                        color: "var(--charcoal)",
                        textAlign: "left",
                      }}
                    >
                      {link.label}
                      <ChevronDown
                        size={18}
                        aria-hidden="true"
                        style={{
                          transform: mobileExpanded === link.label ? "rotate(180deg)" : "rotate(0)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    </button>
                    <ul id={`mobile-sub-${link.label}`} hidden={mobileExpanded !== link.label} style={{ listStyle: "none", margin: 0, padding: "0 0 1rem" }}>
                      {link.children.map((child) => (
                        <li key={child.label}>
                          <Link
                            href={child.href}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              minHeight: "44px",
                              padding: "0 1rem",
                              fontFamily: "var(--font-heading), serif",
                              fontSize: "1.05rem",
                              fontWeight: 500,
                              color: "var(--charcoal)",
                              textDecoration: "none",
                            }}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link
                    href={link.href}
                    aria-current={checkActive(link.href) ? "page" : undefined}
                    style={{
                      display: "block",
                      padding: "1rem 0",
                      fontFamily: "var(--font-heading), serif",
                      fontSize: "1.375rem",
                      fontWeight: 500,
                      color: "var(--charcoal)",
                      textDecoration: "none",
                    }}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <ul style={{ listStyle: "none", margin: "1rem 0 0", padding: 0 }}>
            {helpLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{ display: "flex", alignItems: "center", minHeight: "44px", fontFamily: BODY_FONT, fontSize: "0.9375rem", color: "#1E1E1E", textDecoration: "none" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link href={wishlistHref} className="btn-outline" style={{ width: "100%", textDecoration: "none" }}>
              My Wishlist{showWishlistCount > 0 ? ` (${showWishlistCount})` : ""}
            </Link>
            {mounted && isAuthenticated ? (
              <>
                <Link href="/account/orders" className="btn-outline" style={{ width: "100%", textDecoration: "none" }}>
                  My Orders
                </Link>
                <Link href="/account/profile" className="btn-primary" style={{ width: "100%", textDecoration: "none" }}>
                  My Account
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileOpen(false);
                    await logout();
                  }}
                  className="btn-outline"
                  style={{ width: "100%" }}
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link href={loginHref} className="btn-primary" style={{ width: "100%", textDecoration: "none" }}>
                  Sign In
                </Link>
                <Link href="/account/signup" className="btn-outline" style={{ width: "100%", textDecoration: "none" }}>
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mini-cart overlay */}
      {cartOpen && (
        <div
          aria-hidden="true"
          onClick={() => setCartOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            backgroundColor: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            animation: "fade-in 0.2s ease",
          }}
        />
      )}

      {/* Mini-cart */}
      <div
        ref={cartPanelRef}
        id="mini-cart"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mini-cart-title"
        inert={!cartOpen}
        tabIndex={-1}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: "450px",
          backgroundColor: "#FFFFFF",
          boxShadow: cartOpen ? "-10px 0 40px rgba(0,0,0,0.15)" : "none",
          zIndex: 2001,
          transform: cartOpen ? "translateX(0)" : "translateX(100%)",
          visibility: cartOpen ? "visible" : "hidden",
          transition: cartOpen
            ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear 0.4s",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 16px 1rem 1.5rem",
            borderBottom: "1px solid rgba(30,30,30,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 id="mini-cart-title" style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1E1E1E", margin: 0 }}>
            Your Bag{totalItems > 0 ? ` (${totalItems})` : ""}
          </h2>
          <button
            ref={cartCloseRef}
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close bag"
            style={{ ...iconButtonStyle, padding: 0 }}
            className="flex"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }} aria-busy={cartLoading}>
          {cartError && (
            <div
              role="alert"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                backgroundColor: "#FDECEA",
                border: "1px solid #F5C2C0",
                color: "#8A1C1C",
                fontFamily: BODY_FONT,
                fontSize: "0.875rem",
                borderRadius: "4px",
              }}
            >
              <span>{cartError}</span>
              <button
                type="button"
                onClick={() => fetchCart()}
                style={{ background: "none", border: "none", color: "#8A1C1C", fontWeight: 600, textDecoration: "underline", cursor: "pointer", minHeight: "40px", fontFamily: BODY_FONT, fontSize: "0.875rem" }}
              >
                Retry
              </button>
            </div>
          )}

          {cartLoading && !cart ? (
            <div role="status" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <span className="sr-only-text">Loading your bag</span>
              {[0, 1].map((i) => (
                <div key={i} aria-hidden="true" style={{ display: "flex", gap: "1rem" }}>
                  <div className="skeleton" style={{ width: "80px", aspectRatio: "3/4" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div className="skeleton" style={{ height: "14px", width: "80%" }} />
                    <div className="skeleton" style={{ height: "12px", width: "40%" }} />
                    <div className="skeleton" style={{ height: "14px", width: "30%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : lines.length === 0 ? (
            !cartError && (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", textAlign: "center" }}>
                <ShoppingBag size={48} aria-hidden="true" style={{ color: "rgba(30,30,30,0.3)", marginBottom: "1rem" }} />
                <p style={{ fontFamily: BODY_FONT, fontSize: "0.9375rem", fontWeight: 500, color: "#1E1E1E", margin: "0 0 1.5rem" }}>
                  Your bag is empty.
                </p>
                <Link href="/shop" onClick={() => setCartOpen(false)} className="btn-primary" style={{ textDecoration: "none" }}>
                  Continue Shopping
                </Link>
              </div>
            )
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {lines.map((line: CartLine) => {
                const price = parseFloat(line.merchandise?.price?.amount || "0");
                const title: string = line.merchandise?.product?.title || "Product";
                const variant: string = line.merchandise?.title || "";
                const image: string = line.merchandise?.product?.images?.edges?.[0]?.node?.url || (typeof line.merchandise?.image === "string" ? line.merchandise.image : line.merchandise?.image?.url) || "";
                const busy = pendingLineId === line.id;

                return (
                  <li key={line.id} aria-busy={busy} style={{ display: "flex", gap: "1rem", borderBottom: "1px solid rgba(30,30,30,0.08)", paddingBottom: "1.5rem", opacity: busy ? 0.6 : 1 }}>
                    <div style={{ position: "relative", width: "80px", aspectRatio: "3/4", overflow: "hidden", backgroundColor: "#F3EFE9", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {image ? (
                        <Image src={getShopifyImageUrl(image, 160)} alt="" fill sizes="80px" style={{ objectFit: "cover" }} />
                      ) : (
                        <ShoppingBag size={24} aria-hidden="true" style={{ color: "rgba(107,78,55,0.45)" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontFamily: BODY_FONT, fontSize: "0.875rem", fontWeight: 600, color: "#1E1E1E", margin: "0 0 0.25rem" }}>{title}</p>
                        {variant && variant !== "Default Title" && (
                          <p style={{ fontFamily: BODY_FONT, fontSize: "0.8125rem", color: MUTED, margin: "0 0 0.375rem" }}>{variant}</p>
                        )}
                        <p style={{ fontFamily: BODY_FONT, fontSize: "0.875rem", fontWeight: 600, color: "#1E1E1E", margin: 0 }}>
                          {formatINR(price * line.quantity)}
                          {line.quantity > 1 && (
                            <span style={{ fontWeight: 400, color: MUTED, fontSize: "0.8125rem" }}> ({formatINR(price)} each)</span>
                          )}
                        </p>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", gap: "0.5rem" }}>
                        <div role="group" aria-label={`Quantity for ${title}`} style={{ display: "flex", alignItems: "center", border: "1px solid rgba(30,30,30,0.2)", borderRadius: "4px" }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(line, line.quantity - 1)}
                            disabled={busy || line.quantity <= 1}
                            aria-label={`Decrease quantity of ${title}`}
                            style={{ width: "40px", height: "40px", border: "none", background: "none", cursor: line.quantity <= 1 ? "not-allowed" : "pointer", color: line.quantity <= 1 ? "rgba(30,30,30,0.35)" : "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Minus size={16} aria-hidden="true" />
                          </button>
                          <span aria-live="polite" style={{ minWidth: "32px", textAlign: "center", fontFamily: BODY_FONT, fontSize: "0.875rem", fontWeight: 600 }}>
                            <span className="sr-only-text">Quantity </span>
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(line, line.quantity + 1)}
                            disabled={busy}
                            aria-label={`Increase quantity of ${title}`}
                            style={{ width: "40px", height: "40px", border: "none", background: "none", cursor: "pointer", color: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Plus size={16} aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(line, 0)}
                          disabled={busy}
                          aria-label={`Remove ${title} from bag`}
                          style={{ background: "none", border: "none", cursor: "pointer", fontFamily: BODY_FONT, fontSize: "0.8125rem", color: "#A12C2C", textDecoration: "underline", minHeight: "40px", padding: "0 0.25rem" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {lines.length > 0 && (
          <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid rgba(30,30,30,0.08)", backgroundColor: "#FFFFFF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.25rem" }}>
              <span style={{ fontFamily: BODY_FONT, fontSize: "0.9375rem", fontWeight: 600, color: "#1E1E1E" }}>Subtotal</span>
              <span style={{ fontFamily: "var(--font-heading), serif", fontSize: "1.125rem", fontWeight: 600, color: "#1E1E1E" }}>
                {formatINR(subtotal)}
              </span>
            </div>
            <p style={{ fontFamily: BODY_FONT, fontSize: "0.8125rem", color: MUTED, margin: "0 0 0.25rem" }}>
              Inclusive of all taxes.
            </p>
            <p style={{ fontFamily: BODY_FONT, fontSize: "0.8125rem", color: toFreeShipping > 0 ? MUTED : "#2E6B47", fontWeight: toFreeShipping > 0 ? 400 : 600, margin: "0 0 1rem" }}>
              {toFreeShipping > 0
                ? `Add ${formatINR(toFreeShipping)} more for free shipping.`
                : "You've unlocked free shipping."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Link href="/cart" onClick={() => setCartOpen(false)} className="btn-outline" style={{ flex: 1, textDecoration: "none", padding: "12px 16px" }}>
                View Bag
              </Link>
              <Link
                href={`/checkout?cartId=${encodeURIComponent(cart.id)}`}
                onClick={() => setCartOpen(false)}
                className="btn-primary"
                style={{ flex: 1, textDecoration: "none", padding: "12px 16px" }}
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
