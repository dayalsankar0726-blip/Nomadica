import Link from "next/link";
import Image from "next/image";

export function ImageBanner({
  image,
  href,
  label,
  alt = "",
  aspect = "1536/454",
  minHeightClass = "min-h-[110px] sm:min-h-[180px] md:min-h-[220px] lg:min-h-[300px] xl:min-h-[370px] 2xl:min-h-[450px]",
}: {
  image: string;
  href: string;
  /** Accessible name for the link: where it goes, e.g. "Watch our travel stories". */
  label: string;
  /** Describes the artwork. Leave empty when `label` already says everything. */
  alt?: string;
  /** Width/height of the artwork, e.g. "2000/923". */
  aspect?: string;
  minHeightClass?: string;
}) {
  return (
    <section
      className={`relative w-full overflow-hidden bg-black ${minHeightClass}`}
      style={{ aspectRatio: aspect }}
    >
      <Link
        href={href}
        aria-label={label}
        className="home-banner-link"
        style={{ position: "relative", display: "block", width: "100%", height: "100%" }}
      >
        <Image
          src={image}
          alt={alt}
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      </Link>
      <style>{`
        .home-banner-link:focus-visible { outline: 3px solid #FFFFFF; outline-offset: -6px; box-shadow: inset 0 0 0 8px #6B4E37; }
      `}</style>
    </section>
  );
}
