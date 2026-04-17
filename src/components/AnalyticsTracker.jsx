import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, trackPageview, isAnalyticsEnabled } from '../lib/analytics.js';

/**
 * Mount once inside the Router. Bootstraps gtag on first render, then
 * fires a pageview on every route change.
 */
export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (isAnalyticsEnabled()) initAnalytics();
  }, []);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    // Small delay so document.title has updated after route render
    const id = setTimeout(() => {
      trackPageview(location.pathname + location.search, document.title);
    }, 50);
    return () => clearTimeout(id);
  }, [location.pathname, location.search]);

  return null;
}
