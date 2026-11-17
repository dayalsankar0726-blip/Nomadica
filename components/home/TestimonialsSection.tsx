/**
 * Customer quotes.
 *
 * There is no review system yet, so this section only renders when real quotes are
 * passed in. The previous hard-coded names, 5-star ratings and "Verified Purchase"
 * labels were removed: they weren't linked to real orders and couldn't be verified.
 *
 * TODO: feed this from a Shopify reviews app (e.g. Judge.me, Shopify Product Reviews)
 * so quotes, names and any rating or "verified buyer" badge come from real orders.
 * Only show a rating or "verified" label when the reviews app provides it.
 */
export interface Testimonial {
  name: string;
  quote: string;
}

export function TestimonialsSection({
  testimonials = [],
  bgTint,
}: { testimonials?: Testimonial[]; bgTint?: boolean } = {}) {
  if (testimonials.length === 0) return null;

  return (
    <section
      className="testimonials-section"
      aria-labelledby="home-testimonials-title"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "700px",
        backgroundImage: "url('/testimonials-bg.jpg')",
        backgroundColor: bgTint ? "#F5F3F0" : "transparent",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        padding: "4rem 1.5rem",
        boxSizing: "border-box",
        overflow: "hidden"
      }}
    >
      <style>{`
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          width: 100%;
          max-width: 800px;
        }
        .testimonial-card {
          background-color: #FFFFFF;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(30,30,30,0.03);
          box-sizing: border-box;
        }
        @media (max-width: 991px) {
          .testimonials-grid {
            max-width: 100%;
          }
        }
        @media (max-width: 768px) {
          .testimonials-section {
            min-height: auto !important;
            padding: 3rem 1rem !important;
          }
          .testimonials-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: "1400px", width: "100%", margin: "0 auto" }}>
        {/* Title */}
        <h2
          id="home-testimonials-title"
          style={{
            fontFamily: "'Playfair Display', sans-serif",
            fontSize: "clamp(2.25rem, 4vw, 2.75rem)",
            fontWeight: 600,
            color: "#1E1E1E",
            letterSpacing: "-0.02em",
            marginBottom: "2.5rem",
            textAlign: "left"
          }}
        >
          What Travellers Say
        </h2>

        {/* 2x2 Grid */}
        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <figure
              key={i}
              className="testimonial-card"
              style={{ margin: 0 }}
            >
              {/* Review Text */}
              <blockquote
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.875rem",
                  lineHeight: "1.6",
                  color: "rgba(30, 30, 30, 0.8)",
                  fontStyle: "italic",
                  margin: "0 0 1rem 0",
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <figcaption
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "#1E1E1E",
                  marginTop: "auto"
                }}
              >
                {t.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
