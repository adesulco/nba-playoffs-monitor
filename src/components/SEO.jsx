import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Single-spot SEO component — picks up per-page title/description/og/canonical/
 * hreflang + any page-scoped JSON-LD. Call from the top of each page.
 *
 * v0.11.27 — explicit document.title sync useEffect alongside the Helmet
 * managed <title>. The audit team's verification of v0.11.26 found that
 * react-helmet-async (both v2 and v3) intermittently fails to overwrite
 * statically pre-rendered <title> tags during SPA navigation — the
 * hydration race is the root of FU-1. Belt-and-suspenders: also write
 * document.title imperatively from a useEffect so the rendered DOM
 * always reflects the React-computed title regardless of Helmet
 * hydration timing. Helmet still emits the canonical <title> element
 * + the og: / twitter: meta tags + hreflang links + JSON-LD, all of
 * which it manages reliably; this useEffect just fills the title gap.
 */
export default function SEO({
  title,
  description,
  path = '/',
  image = 'https://www.gibol.co/og-image.png',
  lang = 'id',
  jsonLd,
  keywords,
  noindex = false,
}) {
  const canonical = `https://www.gibol.co${path}`;

  useEffect(() => {
    if (typeof document !== 'undefined' && title && document.title !== title) {
      document.title = title;
    }
  }, [title]);

  // v0.11.27 — also keep og:title and twitter:title in sync via direct
  // DOM mutation when Helmet hasn't caught up. Crawlers don't care
  // (they read the static prerender) but in-page sharing widgets that
  // probe these meta values benefit from the consistency.
  useEffect(() => {
    if (typeof document === 'undefined' || !title) return;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content') !== title) {
      ogTitle.setAttribute('content', title);
    }
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle && twTitle.getAttribute('content') !== title) {
      twTitle.setAttribute('content', title);
    }
  }, [title]);

  // og:url + canonical also reflect deep-link state (?club=, ?team=,
  // ?player=) per GIB-018. Helmet handles these but we mirror to DOM
  // for the same reason as the title sync above.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl && ogUrl.getAttribute('content') !== canonical) {
      ogUrl.setAttribute('content', canonical);
    }
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon && canon.getAttribute('href') !== canonical) {
      canon.setAttribute('href', canonical);
    }
  }, [canonical]);

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
      {/* v0.12.10 — noindex for the NotFound surface (and any future
          surface that should not be crawlable). Google honors this
          via JS-rendered crawl; we additionally rely on the Vercel
          file-system 404.html for non-JS crawlers. */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {noindex && <meta name="googlebot" content="noindex, nofollow" />}

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
