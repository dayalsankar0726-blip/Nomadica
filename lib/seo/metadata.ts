import { Metadata } from 'next';
import { getCanonicalUrl } from './canonical';
import { SITE } from '../site';

interface MetadataOptions {
  /**
   * Page title. Short titles ("Shop", "Your Bag") get " | Nomadica" added by the root
   * layout's title template. Titles that already contain the brand name are used as-is.
   */
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
}

/** Root title template: child segments' titles become "<title> | Nomadica". */
export const TITLE_TEMPLATE = `%s | ${SITE.name}`;
export const DEFAULT_TITLE = `${SITE.name} | Premium Travel Lifestyle Apparel & Adventure Wear`;
export const DEFAULT_DESCRIPTION =
  'Discover premium travel-inspired apparel, adventure wear, and lifestyle essentials crafted for explorers, creators, and modern nomads.';

function hasBrand(title: string) {
  return title.toLowerCase().includes(SITE.name.toLowerCase());
}

/**
 * Reusable utility to build standard Next.js Metadata objects for a page or segment.
 * Sets a self-referencing canonical for `path`.
 */
export function constructMetadata({
  title,
  description,
  path,
  ogImage = '/opengraph-image.jpg',
  noIndex = false,
  type = 'website',
}: MetadataOptions): Metadata {
  const canonical = getCanonicalUrl(path);
  // Avoid "Product - Nomadica | Nomadica": titles that already name the brand skip the template.
  const fullTitle = hasBrand(title) ? title : `${title} | ${SITE.name}`;

  return {
    // Always the full title: a nested layout's plain title would otherwise stop the root
    // "%s | Nomadica" template reaching pages below it (e.g. /shop/search showed just "Search").
    title: { absolute: fullTitle },
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: SITE.name,
      type,
      locale: 'en_IN',
      images: [
        {
          url: ogImage,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: robotsFor(noIndex),
  };
}

function robotsFor(noIndex: boolean): Metadata['robots'] {
  return {
    index: !noIndex,
    follow: !noIndex,
    googleBot: {
      index: !noIndex,
      follow: !noIndex,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  };
}

/**
 * Metadata for the root layout. Deliberately sets NO canonical or og:url: those are
 * inherited by every page that doesn't override them, which used to point every page's
 * canonical at the home page. Pages set their own via constructMetadata().
 */
export function constructRootMetadata(): Metadata {
  return {
    metadataBase: new URL(getCanonicalUrl('/')),
    title: {
      default: DEFAULT_TITLE,
      template: TITLE_TEMPLATE,
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: SITE.name,
    openGraph: {
      siteName: SITE.name,
      type: 'website',
      locale: 'en_IN',
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      // og:image comes from the app/opengraph-image.jpg file convention.
    },
    twitter: {
      card: 'summary_large_image',
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    },
    robots: robotsFor(false),
  };
}
