import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import SportIcon from './SportIcon.jsx';
import Chip from './Chip.jsx';
import Button from './Button.jsx';
import { LIVE } from '../lib/flags.js';

/**
 * Card — shared sport-dashboard nav card for Home (step 5/9).
 *
 * Two variants:
 *   featured   → horizontal, NBA hero. 52px icon, 19/600/-0.2em title,
 *                inline CTA Button on the right.
 *   secondary  → compact, vertical stack. 30px icon, 14/600/-0.2em title,
 *                mono-caps footer CTA (no Button — the whole card links).
 *
 * Data shape (`d` prop) matches the DASHBOARDS entries in Home.jsx:
 *   { id, href, status, featured?, tag, title, titleId, league,
 *     blurb, blurbId, accent, launchDate, icon, cta, ctaId }
 *
 * Why variants share one component: the two shapes are 80% identical — same
 * tokens, same Chip+Icon combo, same accent-border convention. Keeping them
 * in one file makes future tweaks (hover curve, accent weight) a one-file
 * edit instead of a two-page sync.
 *
 * Hover: translateY(-1px) + var(--e-1) shadow over var(--dur-base)
 * var(--ease-standard) — matches Button exactly so a card+CTA feel like one
 * gesture. Honored by the global prefers-reduced-motion zero-duration block.
 *
 * Title: wraps via `text-wrap: balance` on supporting browsers (Chrome 114+,
 * Safari 17.4+). Falls back to normal wrapping — no layout break in older
 * browsers.
 *
 * Live-flag gate: a card is "live" iff `d.status === 'live'` AND
 * `LIVE[d.id] !== false`. A prod flag flip hides the live chip/styling
 * without a redeploy, matching §2.3.
 */

function Featured({ d, isLive, title, blurb, cta, liveTeaser }) {
  return (
    <div
      className="home-card-live home-featured gibol-card gibol-card-featured"
      style={{
        padding: '14px 18px',
        background: `linear-gradient(135deg, ${d.accent}28 0%, ${C.panelRow} 70%)`,
        border: `1px solid ${d.accent}`,
        borderLeft: `4px solid ${d.accent}`,
        borderRadius: 6,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 16,
        alignItems: 'center',
        transition: 'transform var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)',
        cursor: 'pointer',
        boxShadow: `0 4px 24px -14px ${d.accent}`,
        willChange: 'transform',
      }}
    >
      <SportIcon id={d.icon} size={52} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Chip
            variant={isLive ? 'live' : 'soon'}
            sportId={d.icon}
            accent={d.accent}
            label={d.tag}
          />
          <span style={{ fontSize: 9, color: C.dim, letterSpacing: 1, fontWeight: 500 }}>{d.league}</span>
          {liveTeaser && (
            <span
              style={{
                fontSize: 9,
                color: d.accent,
                letterSpacing: 0.5,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                padding: '2px 6px',
                background: `${d.accent}18`,
                borderRadius: 2,
              }}
            >
              {liveTeaser}
            </span>
          )}
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 19, fontWeight: 600, color: C.text, letterSpacing: -0.2,
          lineHeight: 1.2,
          textWrap: 'balance',
        }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, maxWidth: 680 }}>
          {blurb}
        </div>
      </div>

      <Button
        as="span"
        variant="primary"
        sportId={d.icon}
        accent={d.accent}
        label={cta}
        className="home-featured-cta"
      />
    </div>
  );
}

function Secondary({ d, isLive, title, blurb, cta, liveTeaser }) {
  return (
    <div
      className={`${isLive ? 'home-card-live' : 'home-card-soon'} home-secondary gibol-card gibol-card-secondary`}
      style={{
        padding: '14px 16px',
        background: C.panelRow,
        border: `1px solid ${isLive ? `${d.accent}66` : C.line}`,
        borderLeft: `3px solid ${d.accent}`,
        borderRadius: 6,
        display: 'flex', flexDirection: 'column', gap: 7,
        minHeight: 132, height: '100%',
        transition: 'transform var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)',
        cursor: 'pointer',
        opacity: isLive ? 1 : 0.88,
        willChange: 'transform',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <SportIcon id={d.icon} size={30} />
          <Chip
            variant={isLive ? 'live' : 'soon'}
            sportId={d.icon}
            accent={d.accent}
            label={d.tag}
          />
        </span>
        {liveTeaser && (
          <span
            style={{
              fontSize: 9,
              color: d.accent,
              letterSpacing: 0.3,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              background: `${d.accent}18`,
              borderRadius: 2,
              whiteSpace: 'nowrap',
            }}
          >
            {liveTeaser}
          </span>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: -0.2,
        lineHeight: 1.2,
        textWrap: 'balance',
      }}>
        {title}
      </div>
      <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.45, flex: 1 }}>
        {blurb}
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 10.5, fontWeight: 700,
        color: isLive ? d.accent : C.muted,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginTop: 'auto',
      }}>
        {cta}
      </div>
    </div>
  );
}

export default function Card({ d, lang, variant, liveTeaser }) {
  const isLive = d.status === 'live' && LIVE[d.id] !== false;
  const resolvedVariant = variant || (d.featured ? 'featured' : 'secondary');
  const title = lang === 'id' ? d.titleId : d.title;
  const blurb = lang === 'id' ? d.blurbId : d.blurb;
  const cta = lang === 'id' ? d.ctaId : d.cta;

  const body = resolvedVariant === 'featured'
    ? <Featured d={d} isLive={isLive} title={title} blurb={blurb} cta={cta} liveTeaser={liveTeaser} />
    : <Secondary d={d} isLive={isLive} title={title} blurb={blurb} cta={cta} liveTeaser={liveTeaser} />;

  // Whole card is a single Link — SEO crawlers and keyboard tab-through both
  // hit one anchor per sport. Coming-soon routes resolve to a real page
  // (ComingSoon.jsx) so no card ever 404s.
  return <Link to={d.href} style={{ textDecoration: 'none', display: 'block' }}>{body}</Link>;
}
