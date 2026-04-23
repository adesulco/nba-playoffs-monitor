import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDailyRecap } from '../hooks/useDailyRecap.js';
import { TEAM_META, COLORS as C } from '../lib/constants.js';
import TopBar from '../components/TopBar.jsx';
import SEO from '../components/SEO.jsx';
import PlayerHead from '../components/PlayerHead.jsx';
import ContactBar from '../components/ContactBar.jsx';
import SportIcon from '../components/SportIcon.jsx';
import Button from '../components/Button.jsx';
import Chip from '../components/Chip.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { trackEvent } from '../lib/analytics.js';
import ShareButton from '../components/ShareButton.jsx';
import { buildNBAFinalShareText, buildNBAGameShareUrl, buildNBARecapPngUrl } from '../lib/share.js';

const byAbbr = (abbr) => Object.keys(TEAM_META).find((n) => TEAM_META[n]?.abbr === abbr);

function formatJakartaDate(iso, lang) {
  const d = new Date(iso + 'T12:00:00Z');
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return d.toLocaleDateString(locale, opts);
}

// Use **user-local** date — toISOString() uses UTC and would flip the day for
// Jakarta users in the evening (UTC is already next-day) or in the morning
// (UTC is still yesterday). This must match NBADashboard's day-tab key scheme.
function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function isoYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
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
  // Score-derived winner — ESPN's game.away.winner / game.home.winner
  // flags aren't reliably set on freshly-completed games. See the detailed
  // note in useDailyRecap.js::buildGameNarrative.
  const awayScoreN = parseInt(game.away?.score || 0);
  const homeScoreN = parseInt(game.home?.score || 0);
  const wonByAway = awayScoreN > homeScoreN;
  const winnerColor = wonByAway ? awayMeta.color : homeMeta.color;

  // Step 6: collapsed from (linear@50 + radial@60) → single soft wash at ~10%.
  // Title moved from Bebas Neue 48/-0.8em to Space Grotesk 36/700/-0.025em.
  // Tag chip pinned top-right (<Chip>). Top performer moved out of hero into
  // its own sibling row below so the hero is strictly {kicker, chip, title, caption}.
  return (
    <>
      <div
        style={{
          padding: '28px 24px',
          background: `linear-gradient(135deg, ${winnerColor}1a 0%, ${C.bg} 70%)`,
          borderBottom: topPerformer ? 'none' : `1px solid ${C.line}`,
        }}
      >
        <div style={{ maxWidth: 900 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            gap: 12, marginBottom: 14,
          }}>
            <div style={{
              fontSize: 10, color: C.dim, letterSpacing: 1.5, fontWeight: 700,
              paddingTop: 6,
            }}>
              {lang === 'id' ? 'MOMEN HARI INI' : 'MOMENT OF THE DAY'}
            </div>
            <Chip
              variant="live"
              sportId="nba"
              accent={winnerColor}
              label={`⚡ ${tag}`}
            />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 36, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.025em',
            color: C.text, marginBottom: 14, marginTop: 0,
            maxWidth: 780,
            textWrap: 'balance',
          }}>
            {headline}
          </h2>
          {caption && (
            <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.55, margin: 0, maxWidth: 640 }}>
              {caption}
            </p>
          )}
        </div>
      </div>
      {topPerformer && (
        <div style={{
          padding: '14px 24px',
          borderBottom: `1px solid ${C.line}`,
          background: C.bg,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '6px 12px 6px 6px',
            background: `${winnerColor}18`,
            border: `1px solid ${winnerColor}60`,
            borderRadius: 24,
          }}>
            <PlayerHead id={topPerformer.id} name={topPerformer.name} color={winnerColor} size={32} ring />
            <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>
              {topPerformer.short || topPerformer.name}
            </span>
            <span style={{ fontSize: 11, color: accent, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              {topPerformer.pts}/{topPerformer.reb}/{topPerformer.ast}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

function PerformerChip({ player, teamColor, accent }) {
  if (!player) return null;
  return (
    <a
      href={player.id ? `https://www.espn.com/nba/player/_/id/${player.id}` : '#'}
      target={player.id ? '_blank' : undefined}
      rel={player.id ? 'noopener noreferrer' : undefined}
      style={{
        textDecoration: 'none', color: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '5px 10px 5px 5px',
        background: `${teamColor}18`,
        border: `1px solid ${teamColor}40`,
        borderRadius: 20,
        minWidth: 0,
      }}
    >
      <PlayerHead id={player.id} name={player.name} color={teamColor} size={24} />
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: C.text, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {player.short || player.name}
        </span>
        <span style={{ fontSize: 9.5, color: C.dim, letterSpacing: 0.3 }}>
          <span style={{ color: accent, fontWeight: 700 }}>{player.pts} PTS</span>
          {' · '}{player.reb}R · {player.ast}A
        </span>
      </div>
    </a>
  );
}

function StatEdgePill({ edge, lang }) {
  const color = TEAM_META[byAbbr(edge.winnerAbbr)]?.color || C.amber;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px',
      border: `1px solid ${color}40`,
      background: `${color}10`,
      borderRadius: 3,
      fontSize: 10, letterSpacing: 0.3,
    }}>
      <span style={{ color: C.dim, fontWeight: 600 }}>{edge.label}</span>
      <span style={{ color, fontWeight: 700 }}>{edge.winnerAbbr}</span>
      <span style={{ color: C.text, fontFamily: 'var(--font-sans)' }}>{edge.winnerVal}</span>
      <span style={{ color: C.muted }}>{edge.diff}</span>
    </div>
  );
}

function GameRecapCard({ game, summary, topPerformer, topByTeamMap, statEdges, deepDetails, narrative, dateIso, lang }) {
  const awayMeta = TEAM_META[byAbbr(game.away?.abbr)] || { color: '#555' };
  const homeMeta = TEAM_META[byAbbr(game.home?.abbr)] || { color: '#777' };
  // Score-derived winner (see note in useDailyRecap.js::buildGameNarrative).
  const awayScoreN = parseInt(game.away?.score || 0);
  const homeScoreN = parseInt(game.home?.score || 0);
  const wonByAway = awayScoreN > homeScoreN;
  const wonByHome = homeScoreN > awayScoreN;
  const winnerColor = wonByAway ? awayMeta.color : homeMeta.color;

  // Per-game shareable text + URL. Each card is now its own atomic
  // WhatsApp/X/Threads/IG post — core "shareable > beautiful" principle.
  // Uses the overall top scorer (either team) for the tail line.
  const shareText = buildNBAFinalShareText(game, topPerformer, lang);
  const shareUrl = buildNBAGameShareUrl(game, dateIso);
  const shareTitle = lang === 'id'
    ? `${game.away?.abbr || ''} vs ${game.home?.abbr || ''} · Recap gibol.co`
    : `${game.away?.abbr || ''} vs ${game.home?.abbr || ''} · gibol.co recap`;

  // v0.9.0 — dynamic IG Story PNG backed by /api/recap/[gameId]?v=story.
  // TEAM_META is keyed by full team name; the share helper expects abbr-
  // keyed { color } so we build a compact lookup inline. awayMeta/homeMeta
  // above already pair with abbrs; plus the top scorer's team colour if it
  // differs (rare — top is usually on one of the two playing teams but we
  // hedge for completeness). Only the three possibly-referenced abbrs go
  // in so we don't pay for a 30-team map on every render.
  const abbrMeta = {};
  if (game.away?.abbr) abbrMeta[game.away.abbr] = awayMeta;
  if (game.home?.abbr) abbrMeta[game.home.abbr] = homeMeta;
  const igStoryPngUrl = buildNBARecapPngUrl(game, topPerformer, abbrMeta, {
    variant: 'story',
    dateIso,
    lang,
  });
  const accent = C.amber;

  const awayTop = topByTeamMap?.[game.away?.abbr];
  const homeTop = topByTeamMap?.[game.home?.abbr];

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

      {/* Narrative + deep details + head-to-head performers + stat edges */}
      <div style={{
        padding: '12px 18px 14px',
        borderTop: `1px solid ${C.lineSoft}`,
        background: C.panelSoft,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {/* Headline narrative (1-2 sentences) + deep details (2-3 sentences) */}
        {narrative && (
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.55, letterSpacing: 0.1 }}>
            <span style={{ fontWeight: 600 }}>{narrative}</span>
            {deepDetails && deepDetails.length > 0 && (
              <span style={{ color: C.dim, marginLeft: 4 }}>
                {' '}{deepDetails.join(' ')}
              </span>
            )}
          </div>
        )}

        {/* Head-to-head performer chips — top scorer from BOTH teams */}
        {(awayTop || homeTop) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {awayTop && <PerformerChip player={awayTop} teamColor={awayMeta.color} accent={wonByAway ? awayMeta.color : C.dim} />}
            {homeTop && <PerformerChip player={homeTop} teamColor={homeMeta.color} accent={wonByHome ? homeMeta.color : C.dim} />}
          </div>
        )}

        {/* Stat edge pills + per-game share — share trigger floats right
            so the pills fill the left. On narrow cards the pills wrap
            above the button. Every final-state card is now its own
            shareable unit (WhatsApp / X / Threads / Copy). */}
        {(statEdges?.length > 0 || shareText) && (
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
              {(statEdges || []).map((e, i) => <StatEdgePill key={i} edge={e} lang={lang} />)}
            </div>
            {shareText && (
              <ShareButton
                url={shareUrl}
                title={shareTitle}
                text={shareText}
                accent={winnerColor}
                size="sm"
                label={lang === 'id' ? 'BAGIKAN' : 'SHARE'}
                analyticsEvent="recap_game_share"
                igStory={igStoryPngUrl ? { pngUrl: igStoryPngUrl } : undefined}
                dropDirection="up"
              />
            )}
          </div>
        )}
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
        fontFamily: 'var(--font-sans)',
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

function ShareBar({ url, lang, biggestMoment, gameDigests, humanDate, dateIso, gamesCount }) {
  const [copied, setCopied] = useState(false);
  // Default to "MOMENT OF THE DAY" — punchier for first-share. Users can
  // flip to "FULL RECAP" to share a digest of every game that day.
  const [mode, setMode] = useState('moment'); // 'moment' | 'fullday'

  const hasFullDay = Array.isArray(gameDigests) && gameDigests.length > 0;

  // Build the full-day digest text: headline line + 1 per game.
  // Kept compact — WhatsApp/Threads/X all respect newlines, and Bahasa fans
  // prefer list form on mobile. Capped at 6 lines to stay share-friendly.
  const fullDayText = useMemo(() => {
    const head = lang === 'id'
      ? `Rekap NBA Playoff · ${humanDate}`
      : `NBA Playoff Recap · ${humanDate}`;
    const lines = (gameDigests || []).slice(0, 6);
    return [head, ...lines, 'via gibol.co'].join('\n');
  }, [lang, humanDate, gameDigests]);

  const momentText = biggestMoment
    ? `${biggestMoment.headline} · via gibol.co`
    : (lang === 'id' ? 'Catatan Playoff hari ini · gibol.co' : 'Today\'s playoff recap · gibol.co');

  const text = mode === 'fullday' ? fullDayText : momentText;

  // Full-day mode appends ?share=fullday so both the visited page and the OG
  // image can show "all games" framing without breaking the canonical URL.
  const shareUrl = mode === 'fullday' ? `${url}?share=fullday` : url;

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(text);

  // api.whatsapp.com/send works on both desktop (WhatsApp Web) and mobile.
  // wa.me fails silently on desktop — per audit F12.
  const waLink = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
  const xLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const tgLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  // Threads (Meta) — intent/post accepts ?text=... and deep-links to the native app
  // on iOS/Android, falls back to threads.net on desktop. No url param supported; we
  // inline the URL in the text, same pattern as WhatsApp.
  const thLink  = `https://www.threads.net/intent/post?text=${encodedText}%20${encodedUrl}`;

  function copyLink() {
    // In full-day mode, copy the digest text + URL as one block — much more
    // useful when pasted into WhatsApp / group chats. Falls back to URL only
    // if clipboard API rejects (some older browsers block multiline).
    const payload = mode === 'fullday' ? `${text}\n${shareUrl}` : shareUrl;
    navigator.clipboard?.writeText(payload).then(() => {
      setCopied(true);
      trackEvent('recap_share', { method: 'copy', mode });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const tabBtn = (active) => ({
    padding: '4px 10px',
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    background: active ? C.amber : 'transparent',
    color: active ? '#000' : C.dim,
    borderRadius: 2,
  });

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
      display: 'flex', flexDirection: 'column', gap: 10,
      padding: '14px 18px',
      background: C.panel,
      border: `1px solid ${C.line}`,
      borderRadius: 4,
    }}>
      {/* Mode toggle — only if we have multiple games to make FULL RECAP meaningful */}
      {hasFullDay && gamesCount > 1 && (
        <div style={{
          display: 'inline-flex', alignSelf: 'flex-start', gap: 4,
          padding: 3, background: C.panelRow, border: `1px solid ${C.line}`, borderRadius: 4,
        }}>
          <button onClick={() => setMode('moment')} style={tabBtn(mode === 'moment')}>
            ⚡ {lang === 'id' ? 'MOMEN HARI INI' : 'MOMENT OF THE DAY'}
          </button>
          <button onClick={() => setMode('fullday')} style={tabBtn(mode === 'fullday')}>
            📋 {lang === 'id' ? 'REKAP LENGKAP' : 'FULL RECAP'}
          </button>
        </div>
      )}

      {/* Preview of what will be shared — helps user decide before clicking */}
      {mode === 'fullday' && hasFullDay && (
        <div style={{
          fontSize: 11, color: C.dim, whiteSpace: 'pre-line', lineHeight: 1.55,
          padding: '8px 10px', background: C.panelSoft, border: `1px dashed ${C.line}`,
          borderRadius: 3, maxHeight: 140, overflow: 'hidden',
        }}>
          {text}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10.5, color: C.dim, letterSpacing: 1, fontWeight: 600, marginRight: 4 }}>
          {lang === 'id' ? 'BAGIKAN' : 'SHARE'}
        </span>
        <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('recap_share', { method: 'whatsapp', mode })}
           style={{ ...btn, background: '#25D366', color: '#fff' }}>
          WhatsApp
        </a>
        <a href={xLink} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('recap_share', { method: 'x', mode })}
           style={{ ...btn, background: '#000', color: '#fff' }}>
          X / Twitter
        </a>
        <a href={thLink} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('recap_share', { method: 'threads', mode })}
           style={{ ...btn, background: '#101010', color: '#fff', border: `1px solid #333` }}>
          Threads
        </a>
        <a href={tgLink} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('recap_share', { method: 'telegram', mode })}
           style={{ ...btn, background: '#0088cc', color: '#fff' }}>
          Telegram
        </a>
        <button onClick={copyLink} style={{ ...btn, background: copied ? C.green : C.panelRow, color: C.text, border: `1px solid ${C.line}` }}>
          {copied ? (lang === 'id' ? '✓ Tersalin' : '✓ Copied') : (lang === 'id' ? 'Salin' : 'Copy')}
        </button>
      </div>
    </div>
  );
}

export default function Recap() {
  const { date } = useParams();
  const navigate = useNavigate();
  const { lang } = useApp();

  // If no date in URL, default to today (user-local). The "Today" button also
  // links here explicitly so the label always matches the destination.
  const dateIso = date || todayIso();

  useEffect(() => {
    if (!date) navigate(`/recap/${dateIso}`, { replace: true });
  }, [date, dateIso, navigate]);

  // lang is passed through so the hook rebuilds narratives + biggestMoment headline/caption
  // whenever the user flips the EN/ID toggle.
  const {
    games,
    summaries,
    topPerformers,
    topByTeamPerGame,
    statEdgesPerGame,
    deepDetailsPerGame,
    narratives,
    biggestMoment,
    gameDigests,
    loading,
  } = useDailyRecap(dateIso, lang);
  const url = `https://www.gibol.co/recap/${dateIso}`;
  const humanDate = formatJakartaDate(dateIso, lang);
  const accent = C.amber;

  // Dynamic title — biggestMoment.headline is already lang-aware from the hook.
  const seoTitle = biggestMoment
    ? (lang === 'id'
        ? `${biggestMoment.headline} · Catatan Playoff NBA ${humanDate} | gibol.co`
        : `${biggestMoment.headline} · NBA Playoff Recap ${humanDate} | gibol.co`)
    : (lang === 'id'
      ? `Catatan Playoff NBA · ${humanDate} | gibol.co`
      : `NBA Playoff Recap · ${humanDate} | gibol.co`);

  const seoDescription = biggestMoment
    ? (lang === 'id'
        ? biggestMoment.caption + ' Hasil lengkap semua laga, top scorer, dan momen terbesar — hanya di gibol.co.'
        : biggestMoment.caption + ' Full results, top performers, and the biggest moments — only on gibol.co.')
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
      logo: { '@type': 'ImageObject', url: 'https://www.gibol.co/gibol-logo-512.png' },
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
        <TopBar
          showBackLink
          title="gibol.co"
          subtitle={lang === 'id' ? 'catatan playoff · recap harian' : 'playoff journal · daily recap'}
        />

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
            fontFamily: 'var(--font-sans)',
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
              to={`/recap/${todayIso()}`}
              aria-label={lang === 'id' ? 'Catatan playoff hari ini' : `Today's recap`}
              style={{
                padding: '6px 12px',
                background: dateIso === todayIso() ? C.amber : C.panel,
                color: dateIso === todayIso() ? '#000' : C.text,
                border: `1px solid ${dateIso === todayIso() ? C.amber : C.line}`,
                borderRadius: 3, textDecoration: 'none',
                letterSpacing: 0.3, fontWeight: 600,
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
              <SportIcon id="nba" inline size={14} style={{ marginRight: 6 }} />
              {lang === 'id' ? 'Dashboard Playoff Live' : 'Live Playoffs Dashboard'} →
            </Link>
          </div>
        </div>

        {/* Big moment hero */}
        {biggestMoment && <BigMomentHero moment={biggestMoment} lang={lang} accent={accent} />}

        {/* Share bar — sticky position, first impression */}
        <div style={{ padding: '14px 24px 0' }}>
          <ShareBar
            url={url}
            lang={lang}
            biggestMoment={biggestMoment}
            gameDigests={gameDigests}
            humanDate={humanDate}
            dateIso={dateIso}
            gamesCount={games.length}
          />
        </div>

        {/* All games */}
        {games.length > 0 && (
          <div style={{ padding: '18px 24px' }}>
            <h2 style={{
              fontFamily: 'var(--font-sans)',
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
                  topByTeamMap={topByTeamPerGame[g.id]}
                  statEdges={statEdgesPerGame[g.id]}
                  deepDetails={deepDetailsPerGame[g.id]}
                  narrative={narratives[g.id]}
                  dateIso={dateIso}
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
          <Button
            variant="primary"
            sportId="nba"
            accent={accent}
            to="/nba-playoff-2026"
            onClick={() => trackEvent('recap_cta_click', { target: 'nba_dashboard' })}
            label={lang === 'id' ? 'Buka Dashboard Live →' : 'Open Live Dashboard →'}
          />
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: `1px solid ${C.line}`,
          fontSize: 9.5, color: C.muted, letterSpacing: 0.3,
          alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div>gibol.co · {lang === 'id' ? 'catatan playoff harian' : 'daily playoff recap'}</div>
          <ContactBar lang={lang} variant="inline" />
          <div>ESPN · Polymarket</div>
        </div>
      </div>
    </div>
  );
}
