// app/account/_components/BusyButton.tsx
"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
  /** Text shown while busy, e.g. "Saving…". */
  busyLabel?: string;
  variant?: "primary" | "outline" | "danger";
  block?: boolean;
  small?: boolean;
  children: ReactNode;
}

/** A button that shows a spinner and can't be clicked again while its request runs. */
export function BusyButton({ busy = false, busyLabel, variant = "primary", block, small, children, disabled, className, ...rest }: Props) {
  const classes = [
    variant === "primary" ? "acct-btn" : variant === "danger" ? "acct-btn-danger" : "acct-btn-outline",
    block ? "acct-btn-block" : "",
    small ? "acct-btn-small" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button {...rest} className={classes} disabled={disabled || busy} aria-busy={busy || undefined}>
      {busy && <span className="acct-spinner" aria-hidden="true" />}
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}
