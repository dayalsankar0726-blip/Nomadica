// components/orders/useModalDialog.ts
//
// Accessible modal behaviour for a dialog element: moves focus in, keeps Tab inside,
// closes on Escape, locks page scroll behind it, and returns focus to whatever opened
// it when it closes. Used by the account, order and quick-view dialogs.
"use client";
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalDialog(
  ref: RefObject<HTMLElement | null>,
  { onClose, canClose = true, initialFocus }: { onClose: () => void; canClose?: boolean; initialFocus?: RefObject<HTMLElement | null> }
) {
  // Keep the latest callbacks without re-running the mount effect.
  const latest = useRef({ onClose, canClose });
  useEffect(() => {
    latest.current = { onClose, canClose };
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    // Start on the first form field when there is one, otherwise the first control.
    const first =
      initialFocus?.current ||
      dialog?.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])') ||
      dialog?.querySelector<HTMLElement>(FOCUSABLE) ||
      dialog;
    first?.focus();

    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const onKey = (e: KeyboardEvent) => {
      const node = ref.current;
      if (!node) return;
      if (e.key === "Escape") {
        if (latest.current.canClose) {
          e.stopPropagation();
          latest.current.onClose();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstItem || active === node)) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && active === lastItem) {
        e.preventDefault();
        firstItem.focus();
      } else if (!node.contains(active)) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      if (opener && document.contains(opener)) opener.focus();
    };
    // Runs once per open dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
