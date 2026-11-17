"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

/**
 * The banner artwork has its headline baked into the image, so each slide repeats that
 * headline as real text (for screen readers and search engines) and describes the
 * photo in `alt`. If new artwork is made without baked-in text, the headline can be
 * shown visibly instead of with `sr-only`.
 */
const SLIDES = [
  {
    src: "/Main Banner 1.jpg",
    headline: "Wear your journey",
    subline: "Travel-inspired T-shirts",
    alt: "Three Nomadica travel T-shirts displayed at a riverside campsite beside a vintage camper van",
  },
  {
    src: "/Main Banner 2.jpg",
    headline: "Travel beyond limits with Nomadica",
    subline: "Apparel for modern explorers",
    alt: "A traveller in a sun hat looking out over a turquoise bay and a green island",
  },
  {
    src: "/Main Banner 4.jpg",
    headline: "Go where others only dream",
    subline: "Apparel for modern explorers",
    alt: "A glowing igloo under the northern lights in a snowy mountain valley",
  },
] as const;

const INTERVAL_MS = 6000;
const SWIPE_THRESHOLD_PX = 40;

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  // Paused by the shopper with the pause button.
  const [userPaused, setUserPaused] = useState(false);
  // Paused while the pointer or keyboard focus is inside the hero.
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = SLIDES.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Autoplay never runs for people who asked for reduced motion; they can still use
  // the arrows, dots and swipe.
  const playing = !userPaused && !reducedMotion;

  useEffect(() => {
    if (!playing || interacting) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % count);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing, interacting, count]);

  const goTo = useCallback((index: number) => setCurrentSlide((index + count) % count), [count]);
  const handlePrev = () => goTo(currentSlide - 1);
  const handleNext = () => goTo(currentSlide + 1);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setInteracting(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    const end = e.changedTouches[0]?.clientX;
    touchStartX.current = null;
    setInteracting(false);
    if (start == null || end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) handleNext();
    else handlePrev();
  };

  const controlButton: React.CSSProperties = {
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    backgroundColor: "#FFFFFF",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setInteracting(false);
      }}
      style={{ position: "relative", width: "100%", marginTop: 0, backgroundColor: "#000000" }}
    >
      <style>{`
        .hero-ctrl:focus-visible, .hero-cta:focus-visible, .hero-slide-link:focus-visible {
          outline: 3px solid #FFFFFF; outline-offset: 2px; box-shadow: 0 0 0 5px #6B4E37;
        }
        .hero-ctrl { transition: transform 0.2s ease; }
        .hero-ctrl:hover { transform: scale(1.08); }
        .hero-cta { background-color: #6B4E37; transition: background-color 0.2s ease; }
        .hero-cta:hover { background-color: #553D2B; }
        @media (prefers-reduced-motion: reduce) {
          .hero-track, .hero-ctrl { transition: none !important; }
        }
      `}</style>

      <div
        className="min-h-[140px] sm:min-h-[250px] md:min-h-[400px] lg:min-h-[450px]"
        style={{ position: "relative", width: "100%", aspectRatio: "2000/695", overflow: "hidden" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => { touchStartX.current = null; setInteracting(false); }}
      >
        <div
          className="hero-track"
          aria-live={playing ? "off" : "polite"}
          style={{
            display: "flex",
            width: `${count * 100}%`,
            height: "100%",
            transform: `translateX(-${currentSlide * (100 / count)}%)`,
            transition: "transform 1.0s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {SLIDES.map((slide, index) => {
            const active = index === currentSlide;
            return (
              <div
                key={slide.src}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                aria-hidden={!active}
                inert={!active}
                style={{ position: "relative", width: `${100 / count}%`, height: "100%", flexShrink: 0 }}
              >
                <Link
                  href="/shop"
                  className="hero-slide-link"
                  style={{ position: "absolute", inset: 0, display: "block" }}
                >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    {...(index === 0 ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
                    sizes="100vw"
                    style={{ objectFit: "cover", objectPosition: "center" }}
                  />
                  <span className="sr-only">
                    {slide.headline}. {slide.subline}. Shop the collection.
                  </span>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Prev / next */}
        <button
          type="button"
          onClick={handlePrev}
          className="hero-ctrl"
          style={{ ...controlButton, position: "absolute", left: "0.75rem", top: "calc(50% - 22px)", zIndex: 20 }}
          aria-label="Previous slide"
        >
          <ChevronLeft size={22} color="#1E1E1E" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="hero-ctrl"
          style={{ ...controlButton, position: "absolute", right: "0.75rem", top: "calc(50% - 22px)", zIndex: 20 }}
          aria-label="Next slide"
        >
          <ChevronRight size={22} color="#1E1E1E" aria-hidden="true" />
        </button>

        {/* Shop CTA over the banner on larger screens */}
        <Link
          href="/shop/new-arrivals"
          className="hero-cta hidden md:inline-flex"
          style={{
            position: "absolute",
            left: "clamp(1.5rem, 4vw, 4rem)",
            bottom: "clamp(1.25rem, 3vw, 2.5rem)",
            zIndex: 20,
            alignItems: "center",
            minHeight: "48px",
            padding: "0.75rem 1.75rem",
            borderRadius: "4px",
            color: "#FFFFFF",
            textDecoration: "none",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "0.875rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          Shop New Arrivals
        </Link>

        {/* Dots + pause/play */}
        <div
          className="bottom-1 md:bottom-4"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            zIndex: 20,
          }}
        >
          {SLIDES.map((slide, index) => {
            const active = currentSlide === index;
            return (
              <button
                key={slide.src}
                type="button"
                className="hero-ctrl"
                onClick={() => goTo(index)}
                aria-label={`Go to slide ${index + 1}: ${slide.headline}`}
                aria-current={active ? "true" : undefined}
                style={{
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: active ? "14px" : "10px",
                    height: active ? "14px" : "10px",
                    borderRadius: "50%",
                    backgroundColor: active ? "#E65A00" : "rgba(255, 255, 255, 0.85)",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
                    transition: "all 0.3s ease",
                  }}
                />
              </button>
            );
          })}
          {!reducedMotion && (
            <button
              type="button"
              className="hero-ctrl"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
              style={{ ...controlButton, marginLeft: "0.25rem", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
            >
              {userPaused ? (
                <Play size={16} color="#1E1E1E" aria-hidden="true" />
              ) : (
                <Pause size={16} color="#1E1E1E" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* On phones the banner is short, so the CTA sits below it instead of on top. */}
      <div className="md:hidden" style={{ backgroundColor: "#FAF9F7", padding: "0.75rem 1rem", textAlign: "center" }}>
        <Link
          href="/shop/new-arrivals"
          className="hero-cta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "44px",
            padding: "0.625rem 1.5rem",
            borderRadius: "4px",
            color: "#FFFFFF",
            textDecoration: "none",
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Shop New Arrivals
        </Link>
      </div>
    </section>
  );
}
