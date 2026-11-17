/** Small inline "couldn't load" message with a Retry button, used by home page sections. */
export function SectionError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.75rem",
        fontFamily: "'Montserrat', sans-serif",
        fontSize: "0.875rem",
        color: "rgba(30,30,30,0.8)",
        padding: "0.5rem 0 1rem",
      }}
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            minHeight: "44px",
            backgroundColor: "#6B4E37",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "4px",
            padding: "0.5rem 1.25rem",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
