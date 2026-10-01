import { trackEvent } from '../lib/analytics.js';

/**
 * share.js — share a g4-* card (api/og-recap?type=g4-…) the way phones
 * expect: the PNG as a file through the Web Share API when the browser
 * can, else the invite link + text, else a copy to the clipboard.
 * Returns 'file' | 'link' | 'copy' | 'none'.
 */
export function cardUrl(type, params = {}) {
  const usp = new URLSearchParams({ type: `g4-${type}` });
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') usp.set(k, String(v));
  return `https://www.gibol.co/api/og-recap?${usp.toString()}`;
}

export async function shareCard({ type, params, title, text, url }) {
  const image = cardUrl(type, params);
  if (typeof navigator === 'undefined') return 'none';
  // Share-card CTR for PostHog (doc 17 S3 exit check): one event per attempt
  // with the outcome filled in by the caller's chosen channel below.
  const done = (via) => { try { trackEvent('pickem_share', { card: type, via }); } catch { /* ignore */ } return via; };
  try {
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await fetch(image).then((r) => (r.ok ? r.blob() : null));
        if (blob && blob.size > 0) {
          const file = new File([blob], `gibol-${type}.png`, { type: blob.type || 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title, text: `${text}${url ? ` ${url}` : ''}` });
            return done('file');
          }
        }
      } catch { /* fall through to link share */ }
    }
    if (navigator.share) {
      await navigator.share({ title, text, url: url || image });
      return done('link');
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text} ${url || image}`.trim());
      return done('copy');
    }
  } catch { /* user cancelled or unsupported */ }
  return 'none';
}
