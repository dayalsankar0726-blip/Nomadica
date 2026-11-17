// app/account/_components/Dialog.tsx
"use client";
import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useModalDialog } from "@/components/orders/useModalDialog";

interface Props {
  title: string;
  onClose: () => void;
  /** False while a request is running, so the dialog can't be closed half-way. */
  canClose?: boolean;
  maxWidth?: number;
  /** Optional line under the title. */
  description?: ReactNode;
  children: ReactNode;
}

/**
 * A modal dialog: focus moves in and stays inside, Escape closes it, the page behind
 * doesn't scroll, and focus returns to the button that opened it. Clicking the
 * backdrop does nothing, so a half-filled form isn't lost by a stray tap.
 */
export function Dialog({ title, onClose, canClose = true, maxWidth = 600, description, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useModalDialog(ref, { onClose, canClose });

  return (
    <div className="acct-dialog-backdrop">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="acct-dialog"
        style={{ maxWidth }}
      >
        <div className="acct-dialog-header">
          <div>
            <h2 id={titleId} className="acct-dialog-title">
              {title}
            </h2>
            {description && (
              <p id={descId} className="acct-muted" style={{ marginTop: "0.4rem" }}>
                {description}
              </p>
            )}
          </div>
          <button type="button" className="acct-icon-btn" onClick={onClose} disabled={!canClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
