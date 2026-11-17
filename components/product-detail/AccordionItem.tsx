"use client";
import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Disclosure section: a real button with aria-expanded controlling a labelled region. */
export const AccordionItem = ({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) => {
  const id = useId();
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;
  return (
    <div style={{ borderBottom: "1px solid rgba(30, 30, 30, 0.12)" }}>
      <h3 style={{ margin: 0 }}>
        <button
          id={buttonId}
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="pd-focus"
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: 52,
            padding: "1rem 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#1E1E1E",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            textAlign: "left",
          }}
        >
          {title}
          <ChevronDown
            size={16}
            aria-hidden="true"
            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", color: "#1E1E1E", flexShrink: 0 }}
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        style={{ paddingBottom: "1.25rem", color: "rgba(30,30,30,0.8)", fontFamily: "'Montserrat', sans-serif", fontSize: "0.875rem", lineHeight: 1.6 }}
      >
        {children}
      </div>
    </div>
  );
};
