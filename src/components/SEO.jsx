import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Single-spot SEO component — picks up per-page title/description/og/canonical/
 * hreflang + any page-scoped JSON-LD. Call from the top of each page.
 */
export default function SEO({
  title,
  description,
  path = '/',
  image = 'https://www.gibol.co/og-image.png',
  lang = 'id',
  jsonLd,
  keywords,
}) {
  const canonical = `https://www.gibol.co${path}`;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="id" href={canonical} />
      <link rel="alternate" hrefLang="en" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="gibol.co" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:locale:alternate" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* jsonLd may be a single schema object OR an array of schemas.
          Each gets its own <script> block so validators parse them independently. */}
      {jsonLd && (
        Array.isArray(jsonLd)
          ? jsonLd.map((schema, i) => (
              <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
            ))
          : <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
