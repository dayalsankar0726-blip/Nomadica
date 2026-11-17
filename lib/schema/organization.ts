import { getCanonicalUrl } from '../seo/canonical';
import { SITE } from '../site';

/**
 * Builds the Organization schema for structured JSON-LD data.
 * Only facts set in lib/site.ts are included; unknown ones (null) are left out.
 */
export function getOrganizationSchema() {
  const homeUrl = getCanonicalUrl('/');
  const sameAs = [SITE.social.instagram, SITE.social.facebook].filter((u): u is string => Boolean(u));

  const contactPoint: Record<string, string> = {
    '@type': 'ContactPoint',
    email: SITE.supportEmail,
    contactType: 'customer service',
    areaServed: 'IN',
    availableLanguage: 'English',
  };
  if (SITE.supportPhone) contactPoint.telephone = SITE.supportPhone;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${homeUrl}#organization`,
    name: SITE.name,
    ...(SITE.legalName ? { legalName: SITE.legalName } : {}),
    url: homeUrl,
    logo: {
      '@type': 'ImageObject',
      url: getCanonicalUrl('/Nomadica.jpg'),
      caption: `${SITE.name} logo`,
    },
    ...(sameAs.length ? { sameAs } : {}),
    ...(SITE.registeredAddress ? { address: SITE.registeredAddress } : {}),
    contactPoint: [contactPoint],
  };
}
