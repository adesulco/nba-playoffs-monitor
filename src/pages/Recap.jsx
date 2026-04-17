import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDailyRecap } from '../hooks/useDailyRecap.js';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import PlayerHead from '../components/PlayerHead.jsx';
import ContactBar from '../components/ContactBar.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { trackEvent } from '../lib/analytics.js';

const byAbbr = (abbr) => Object.keys(TEAM_META).find((n) => TEAM_META[n]?.abbr === abbr);

function formatJakartaDate(iso, lang) {
  const d = new Date(iso + 'T12:00:00Z');
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return d.toLocaleDateString(locale, opts);
}

function isoYesterday() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Shift an ISO date string by N days (positive or negative). Used for prev/next day nav.
function isoShift(iso, days) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function BigMomentHero({ moment, lang, accent }) {
  if (!moment) return null;
  const { game, tag, headline, caption, topPerformer } = moment;
  const awayMeta = TEAM_META[byAbbr(game.away?.abbr)] || { color: '#555' };
  const homeMeta = TEAM_META[byAbbr(game.home?.abbr)] || { color: '#777' };
  const wonByAway = game.away?.winner;
  const winnerColor = wonByAway ? awayMeta.color : homeMeta.color;

  return (
    <div
      style={{
        padding: '28px 24px',
        background: `linear-gradient(135deg, ${winnerColor}50 0%, ${C.bg} 75%)`,
        borderBottom: `1px solid ${C.line}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 20% 20%, ${winnerColor}60 0%, transparent 55%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900 }}>
        <div style={{
          display: 'inline-block', padding: '4px 10px',
          background: winnerColor, color: '#fff',
          fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
          borderRadius: 2, marginBottom: 16,
        }}>
          ⚡ {lang === 'id' ? 'MOMEN HARI INI' : 'MOMENT OF THE DAY'} · {tag}
        </div>
        <h2 style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: 48, lineHeight: 1.05, letterSpacing: -0.8,
          color: C.text, marginBottom: 14, marginTop: 0,
          maxWidth: 780,
        }}>
          {headline}
        </h2>
        {caption && (
          <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.55, marginBottom: 20, maxWidth: 640 }}>
            {caption}
          </p>
        )}
        {topPerformer && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '6px 12px 6px 6px',
            background: `${winnerColor}30`,
            border: `1px solid ${winnerColor}80`,
            borderRadius: 24,
          }}>
            <PlayerHead id={topPerformer.id} name={topPerformer.name} color={winnerColor} size={32} ring />
            <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>
              {topPerformer.short || topPerformer.name}
            </span>
            <span style={{ fontSize: 11, color: accent, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
              {topPerformer.pts}/{topPerformer.reb}/{topPerformer.ast}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function GameRecapCard({ game, summary, topPerformer, lang }) {
  const awayMeta = TEAM_META[byAbbr(game.away?.abbr)] || { color: '#555' };
  const homeMeta = TEAM_META[byAbbr(game.home?.abbr)] || { color: '#777' };
  const wonByAway = game.away?.winner;
  const wonByHome = game.home?.winner;
  const winnerColor = wonByAway ? awayMeta.color : homeMeta.color;
  const margin = Math.abs(parseInt(game.away?.score || 0) - parseInt(game.home?.score || 0));

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr',
      border: `1px solid ${C.line}`,
      borderLeft: `4px solid ${winnerColor}`,
      borderRadius: 4,
      overflow: 'hidden',
      background: C.panelRow,
    }}>
      {/* Score row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '14px 18px', gap: 16 }}>
        <TeamScore abbr={game.away?.abbr} score={game.away?.score} won={wonByAway} color={awayMeta.color} align="left" />
        <span style={{ color: C.muted, fontSize: 11, letterSpacing: 1 }}>FINAL</span>
        <TeamScore abbr={game.home?.abbr} score={game.home?.score} won={wonByHome} color={homeMeta.color} align="right" />
      </div>

      {/* Narrative */}
      <div style={{
        padding: '10px 18px',
        borderTop: `1px solid ${C.lineSoft}`,
        background: C.panelSoft,
        display: 'grid',
        gridTemplateColumns: topPerformer ? 'auto 1fr' : '1fr',
        gap: 12,
        alignItems: 'center',
      }}>
        {topPerformer && (
          <a
            href={topPerformer.id ? `https://www.espn.com/nba/player/_/id/${topPerformer.id}` : '#'}
            target={topPerformer.id ? '_blank' : undefined}
            rel={topPerformer.id ? 'noopener noreferrer' : undefined}
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <PlayerHead id={topPerformer.id} name={topPerformer.name} color={winnerColor} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {topPerformer.short || topPerformer.name}
              </div>
              <div style={{ fontSize: 10, color: C.dim }}>
                <span style={{ color: winnerColor, fontWeight: 700 }}>{topPerformer.pts} PTS</span>
                {' · '}{topPerformer.reb} REB · {topPerformer.ast} AST
              </div>
            </div>
          </a>
        )}
        <div style={{ fontSize: 11.5, color: C.dim, lineHeight: 1.45 }}>
          {margin <= 3
            ? (lang === 'id' ? `Selisih ${margin} poin — laga ketat sampai akhir.` : `${margin}-point thriller.`)
            : margin >= 20
            ? (lang === 'id' ? `Kemenangan dominan dengan selisih ${margin}.` : `Dominant ${margin}-point win.`)
            : (lang === 'id' ? `Margin ${margin} poin.` : `Final margin: ${margin}.`)}
        </div>
      </div>
    </div>
  );
}

function TeamScore({ abbr, score, won, color, align }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: 10 }}>
      {align === 'left' && (
        <div style={{
          width: 36, height: 36, borderRadius: 4, background: color,
          color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{abbr}</div>
      )}
      <span style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 28, fontWeight: 700, letterSpacing: -0.5,
        color: won ? C.text : C.muted,
      }}>
        {score}
      </span>
      {align === 'right' && (
        <div style={{
          width: 36, height: 36, borderRadius: 4, background: color,
          color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{abbr}</div>
      )}
    </div>
  );
}

function ShareBar({ url, lang, biggestMoment }) {
  const [copied, setCopied] = useState(false);

  const text = biggestMoment
    ? `${biggestMoment.headline} · via gibol.co`
    : (lang === 'id' ? 'Catatan Playoff hari ini · gibol.co' : 'Today\'s playoff recap · gibol.co');

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  // api.whatsapp.com/send works on both desktop (WhatsApp Web) and mobile.
  // wa.me fails silently on desktop — per audit F12.
  const waLink = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
  const xLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const tgLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;

  function copyLink() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      trackEvent('recap_share', { method: 'copy' });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const btn = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 4,
    fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3,
    textDecoration: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: 'none',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      padding: '14px 18px',
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderRadius: 4,
    }}>
      <span style={{ fontSize: 10.5, color: C.dim, letterSpacing: 1, fontWeight: 600, marginRight: 4 }}>
        {lang === 'id' ? 'BAGIKAN' : 'SHARE'}
      </span>
      <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('recap_share', { method: 'whatsapp' })}
         style={{ ...btn, background: '#25D366', color: '#fff' }}>
        WhatsApp
      </a>
      <a href={xLink} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('recap_share', { method: 'x' })}
         style={{ ...btn, background: '#000', color: '#fff' }}>
        X / Twitter
      </a>
      <a href={tgLink} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('recap_share', { method: 'telegram' })}
         style={{ ...btn, background: '#0088cc', color: '#fff' }}>
        Telegram
      </a>
      <button onClick={copyLink} style={{ ...btn, background: copied ? C.green : C.panelRow, color: C.text, border: `1px solid ${C.line}` }}>
        {copied ? (lang === 'id' ? '✓ Tersalin' : '✓ Copied') : (lang === 'id' ? 'Salin link' : 'Copy link')}
      </button>
    </div>
  );
}

export default function Recap() {
  const { date } = useParams();
  const navigate = useNavigate();
  const { lang } = useApp();

  // If no date in URL, use yesterday (most common case — someone sharing morning-after)
  const dateIso = date || isoYesterday();

  useEffect(() => {
    if (!date) navigate(`/recap/${dateIso}`, { replace: true });
  }, [date, dateIso, navigate]);

  const { games, summaries, topPerformers, biggestMoment, loading } = useDailyRecap(dateIso);
  const url = `https://www.gibol.co/recap/${dateIso}`;
  const humanDate = formatJakartaDate(dateIso, lang);
  const accent = C.amber;

  // Generate Bahasa-first dynamic title for SEO
  const seoTitle = biggestMoment
    ? `${biggestMoment.headline} · Catatan Playoff NBA ${humanDate} | gibol.co`
    : (lang === 'id'
      ? `Catatan Playoff NBA · ${humanDate} | gibol.co`
      : `NBA Playoff Recap · ${humanDate} | gibol.co`);

  const seoDescription = biggestMoment
    ? biggestMoment.caption + ' Hasil lengkap semua laga, top scorer, dan momen terbesar — hanya di gibol.co.'
    : (lang === 'id'
      ? `Hasil lengkap NBA Playoff ${humanDate}. Skor akhir, top scorer, momen terbesar, dan analisis per laga. Catatan Playoff harian dari gibol.co.`
      : `Complete NBA Playoff results for ${humanDate}. Final scores, top performers, biggest moments, per-game analysis.`);

  // Dynamic OG image URL — generated on-the-fly by /api/og-recap Edge function.
  // Updates per-date with the actual biggest moment headline so each shared recap
  // gets its own branded social card (great for WhatsApp/Twitter/Instagram).
  const ogHeadline = biggestMoment?.headline || (lang === 'id' ? `Catatan Playoff ${humanDate}` : `Playoff Recap ${humanDate}`);
  const ogSubtitle = biggestMoment?.caption || (lang === 'id' ? 'Hasil lengkap, top scorer, momen terbesar' : 'Full results, top scorers, biggest moments');
  const ogImage = `https://www.gibol.co/api/og-recap?date=${encodeURIComponent(dateIso)}&headline=${encodeURIComponent(ogHeadline)}&subtitle=${encodeURIComponent(ogSubtitle)}&games=${games.length || ''}`;

  // F11 / audit recommendation — NewsArticle JSON-LD for Google News eligibility.
  // Each dated recap has its own unique schema with publish date + author.
  const newsArticleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: ogHeadline,
    description: seoDescription,
    image: [ogImage, 'https://www.gibol.co/og-image.png'],
    datePublished: `${dateIso}T23:59:00+07:00`,
    dateModified: `${dateIso}T23:59:00+07:00`,
    author: { '@type': 'Organization', name: 'gibol.co', url: 'https://www.gibol.co' },
    publisher: {
      '@type': 'Organization',
      name: 'gibol.co',
      logo: { '@type': 'ImageObject', url: 'https://www.gibol.co/og-image.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: 'NBA Playoff 2026',
    inLanguage: lang === 'id' ? 'id-ID' : 'en-US',
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={seoTitle}
        description={seoDescription}
        path={`/recap/${dateIso}`}
        lang={lang}
        image={ogImage}
        keywords={`hasil nba, hasil playoff nba, catatan playoff, recap nba playoff, skor akhir nba, hasil nba hari ini, hasil nba kemarin, rekap playoff nba ${dateIso}, skor akhir playoff`}
        jsonLd={newsArticleJsonLd}
      />
      <div className="dashboard-wrap">
        <TopBar showBackLink title="gibol.co" subtitle="catatan playoff · live recap" />

        {/* Date masthead */}
        <div style={{
          padding: '22px 24px',
          borderBottom: `1px solid ${C.line}`,
          background: C.heroBg,
        }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: C.dim, fontWeight: 600, marginBottom: 6 }}>
            {lang === 'id' ? 'CATATAN PLAYOFF' : 'PLAYOFF JOURNAL'} · NBA · POSTSEASON 2026
          </div>
          <h1 style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 44, lineHeight: 1, letterSpacing: -0.8,
            color: C.text, margin: 0,
          }}>
            {humanDate}
          </h1>
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 8 }}>
            {loading
              ? (lang === 'id' ? 'Memuat hasil…' : 'Loading results…')
              : games.length === 0
              ? (lang === 'id' ? 'Belum ada laga yang selesai hari ini.' : 'No games completed yet.')
              : (lang === 'id' ? `${games.length} laga · semua hasil di bawah` : `${games.length} games · all results below`)}
          </div>

          {/* Day-to-day nav — F28: internal linking between dated recaps */}
          <div style={{
            display: 'flex', gap: 8, marginTop: 14, fontSize: 11, flexWrap: 'wrap',
          }}>
            <Link
              to={`/recap/${isoShift(dateIso, -1)}`}
              aria-label={lang === 'id' ? `Catatan playoff kemarin, ${isoShift(dateIso, -1)}` : `Previous day's recap`}
              style={{
                padding: '6px 12px', background: C.panel, color: C.text,
                border: `1px solid ${C.line}`, borderRadius: 3, textDecoration: 'none',
                letterSpacing: 0.3, fontWeight: 500,
              }}
            >
              ← {lang === 'id' ? 'Kemarin' : 'Previous day'}
            </Link>
            <Link
              to="/recap"
              aria-label={lang === 'id' ? 'Catatan playoff hari ini' : `Today's recap`}
              style={{
                padding: '6px 12px', background: C.panel, color: C.text,
                border: `1px solid ${C.line}`, borderRadius: 3, textDecoration: 'none',
                letterSpacing: 0.3, fontWeight: 500,
              }}
            >
              {lang === 'id' ? 'Hari Ini' : 'Today'}
            </Link>
            {isoShift(dateIso, 1) <= todayIso() && (
              <Link
                to={`/recap/${isoShift(dateIso, 1)}`}
                aria-label={lang === 'id' ? `Catatan playoff besok, ${isoShift(dateIso, 1)}` : `Next day's recap`}
                style={{
                  padding: '6px 12px', background: C.panel, color: C.text,
                  border: `1px solid ${C.line}`, borderRadius: 3, textDecoration: 'none',
                  letterSpacing: 0.3, fontWeight: 500,
                }}
              >
                {lang === 'id' ? 'Besok' : 'Next day'} →
              </Link>
            )}
            <Link
              to="/nba-playoff-2026"
              style={{
                padding: '6px 12px', background: 'transparent', color: accent,
                border: `1px solid ${accent}`, borderRadius: 3, textDecoration: 'none',
                letterSpacing: 0.3, fontWeight: 600, marginLeft: 'auto',
              }}
            >
              🏀 {lang === 'id' ? 'Dashboard Playoff Live' : 'Live Playoffs Dashboard'} →
            </Link>
          </div>
        </div>

        {/* Big moment hero */}
        {biggestMoment && <BigMomentHero moment={biggestMoment} lang={lang} accent={accent} />}

        {/* Share bar — sticky position, first impression */}
        <div style={{ padding: '14px 24px 0' }}>
          <ShareBar url={url} lang={lang} biggestMoment={biggestMoment} />
        </div>

        {/* All games */}
        {games.length > 0 && (
          <div style={{ padding: '18px 24px' }}>
            <h2 style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 18, fontWeight: 600, color: C.text,
              letterSpacing: -0.2, marginBottom: 12, marginTop: 0,
            }}>
              {lang === 'id' ? 'Semua Hasil' : 'All Results'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {games.map((g) => (
                <GameRecapCard
                  key={g.id}
                  game={g}
                  summary={summaries[g.id]}
                  topPerformer={topPerformers[g.id]}
                  lang={lang}
                />
              ))}
            </div>
          </div>
        )}

        {games.length === 0 && !loading && (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: C.dim, fontSize: 13 }}>
            {lang === 'id'
              ? 'Belum ada laga yang selesai tanggal ini. Cek besok pagi!'
              : 'No completed games for this date yet. Check back tomorrow!'}
          </div>
        )}

        {/* Dashboard CTA */}
        <div style={{
          padding: '22px 24px',
          borderTop: `1px solid ${C.line}`,
          background: C.panelSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.dim, letterSpacing: 1, marginBottom: 4 }}>
              {lang === 'id' ? 'MAU IKUTI LIVE?' : 'WATCH LIVE?'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
              {lang === 'id'
                ? 'Dashboard live NBA Playoff — skor, win probability, play-by-play real-time.'
                : 'Full live NBA Playoff dashboard — scores, win probability, play-by-play in real time.'}
            </div>
          </div>
          <Link
            to="/nba-playoff-2026"
            onClick={() => trackEvent('recap_cta_click', { target: 'nba_dashboard' })}
            style={{
              padding: '10px 18px', background: accent, color: '#000',
              fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
              borderRadius: 4, textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {lang === 'id' ? 'Buka Dashboard Live →' : 'Open Live Dashboard →'}
          </Link>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · catatan playoff harian</div>
          <ContactBar lang={lang} variant="inline" />
          <div>ESPN · Polymarket</div>
        </div>
      </div>
    </div>
  );
}
