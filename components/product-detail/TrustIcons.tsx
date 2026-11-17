export const ThoughtfulIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1C3F30" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V10" />
    <path d="M12 12c1.5-1.5 3-1.5 3-3.5S13.5 6 12 8.5" />
    <path d="M12 12c-1.5-1.5-3-1.5-3-3.5S10.5 6 12 8.5" />
    <path d="M2 14c2 2 4 4 7 4h6c3 0 5-2 7-4" />
  </svg>
);

export const QualityIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1C3F30" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5" />
    <path d="M9 12.5l-2 5.5l5-2l5 2l-2-5.5" />
    <path d="M9.5 8l1.5 1.5l3.5-3.5" />
  </svg>
);

export const SecureIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1C3F30" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <rect x="9.5" y="11" width="5" height="4" rx="0.5" />
    <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" />
  </svg>
);

export const IndiaIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1C3F30" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="1.5" />
    <path d="M12 4v16" />
    <path d="M4 12h16" />
    <path d="M6.34 6.34l11.32 11.32" />
    <path d="M17.66 6.34L6.34 17.66" />
  </svg>
);

export const FreeShippingIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1C3F30" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="13" height="11" rx="1" />
    <polygon points="15 7 19 7 22 10 22 15 15 15" />
    <circle cx="6.5" cy="17" r="2" />
    <circle cx="17.5" cy="17" r="2" />
  </svg>
);

/**
 * The store's promises as real text (replaces the features image). Free shipping is
 * shown with its threshold from POLICY.
 */
export function TrustBadges({ freeShippingFrom }: { freeShippingFrom: string }) {
  const items = [
    { icon: <ThoughtfulIcon />, label: "Thoughtful designs" },
    { icon: <QualityIcon />, label: "Quality assured" },
    { icon: <SecureIcon />, label: "Secure payments" },
    { icon: <IndiaIcon />, label: "Made in India" },
    { icon: <FreeShippingIcon />, label: `Free shipping over ${freeShippingFrom}` },
  ];
  return (
    <ul
      aria-label="Why shop with Nomadica"
      style={{ listStyle: "none", padding: "1rem 0.5rem", margin: "0 0 2rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: "0.75rem", backgroundColor: "#FFFFFF", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)" }}
    >
      {items.map((item) => (
        <li key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem", textAlign: "center", fontFamily: "'Montserrat', sans-serif", fontSize: "0.75rem", fontWeight: 600, color: "#1C3F30", lineHeight: 1.3 }}>
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
