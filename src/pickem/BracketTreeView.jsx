import React from 'react';
import { useNavigate } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import useBracketState from './useBracketState.js';
import Flag from './Flag.jsx';
import { PickemBtn } from './components/social.jsx';
import { teamLabel, teamShort, potentialBracketPoints } from './bracketData.js';
import { usePickemCompetition } from './useCompetition.jsx';

// ============================================================================
// v0.75.0 — Desktop bracket tree (Pick'em P7).
//
// /pickem/bracket/tree — the full WC bracket laid out horizontally:
//
//   R16  →  QF  →  SF  →  Final  →  Champion  ←  SF  ←  QF  ←  R16
//
// Read-only — editing happens on /pickem/bracket via the stage-paged
// mobile-first surface. This view is the "see your whole bracket"
// surface, optimised for ≥1024 widths but degrades to a horizontal-
// scroll layout on mobile (so deep-links work everywhere).
//
// Anatomy ported from design-handoff-pickem/js/bracket.jsx#DesktopBracketView.
// State comes from the SAME useBracketState() instance the editor uses
// (localStorage-backed under gibol:pickem:bracket:WC2026), so the tree
// view reflects whatever the user has saved.
// ============================================================================

// v0.79.1 — COMPETITION reads from usePickemCompetition() at render time.

export default function BracketTreeView() {
  const { competition } = usePickemCompetition();
  // Mirror Bracket.jsx: gate first, then render the impl so the hooks order
  // inside BracketTreeViewImpl (which calls useBracketState) stays stable.
  if (!competition.hasBracket) {
    return (
      <PickemRoot active="bracket">
        <div style={{ padding: '40px 16px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h1 className="p-display-sm" style={{ marginBottom: 12, color: 'var(--ink-1)' }}>
            Bracket {competition.label} belum aktif
          </h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>
            Format seri best-of-7 nggak pakai bracket prediksi. Cek tab <strong>Prediksi</strong>.
          </p>
        </div>
      </PickemRoot>
    );
  }
  return <BracketTreeViewImpl competition={competition} />;
}

function BracketTreeViewImpl({ competition }) {
  const navigate = useNavigate();
  const COMPETITION = competition.key;
  const b = useBracketState(COMPETITION);
  const potential = potentialBracketPoints(b.rawState);

  // Split each round into "left half" (top of the bracket) and "right
  // half" (bottom). The handoff uses 4+4 R16, 2+2 QF, 1+1 SF, 1 Final.
  const leftR16 = (b.r16 || []).slice(0, 4);
  const rightR16 = (b.r16 || []).slice(4);
  const leftQF = (b.qf || []).slice(0, 2);
  const rightQF = (b.qf || []).slice(2);
  const leftSF = (b.sf || []).slice(0, 1);
  const rightSF = (b.sf || []).slice(1);
  const finalPick = b.final?.pick || null;
  const champion = b.champion || finalPick;

  return (
    <PickemRoot active="bracket">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: '100%',
          fontFamily: 'var(--font-ui-pickem)',
        }}
      >
        <Header
          locked={b.locked}
          potential={potential}
          onEdit={() => navigate('/pickem/bracket')}
        />

        {/* Horizontal-scrollable tree on narrow screens, full grid on desktop. */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, minHeight: 0 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(140px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) auto minmax(120px, 1fr) minmax(120px, 1fr) minmax(140px, 1fr)',
              gap: 12,
              alignItems: 'center',
              minWidth: 'min-content',
            }}
          >
            <BracketColumn label="R16" matches={leftR16} />
            <BracketColumn label="QF" matches={leftQF} compact />
            <BracketColumn label="SF" matches={leftSF} compact />

            {/* Center: final + champion */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: '0 12px',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.10em',
                }}
              >
                FINAL
              </div>
              <FinalCard
                home={b.final?.home}
                away={b.final?.away}
                pick={finalPick}
              />
              {champion && (
                <ChampionPanel team={champion} />
              )}
            </div>

            <BracketColumn label="SF" matches={rightSF} compact mirror />
            <BracketColumn label="QF" matches={rightQF} compact mirror />
            <BracketColumn label="R16" matches={rightR16} mirror />
          </div>
        </div>
      </div>
    </PickemRoot>
  );
}

// ── Header ────────────────────────────────────────────────────────────────

function Header({ locked, potential, onEdit }) {
  return (
    <header
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--line-1)',
        background: 'var(--bg-raised)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div
            className="p-eyebrow"
            style={{ color: 'var(--pickem-orange)', marginBottom: 4 }}
          >
            BRACKET · WC 2026 · TREE
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 24,
              color: 'var(--ink-1)',
              letterSpacing: '-0.02em',
            }}
          >
            {locked ? 'Bracket terkunci' : 'Bracket kamu'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>
              POTENSI POIN
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--pickem-orange)',
              }}
            >
              +{potential}
            </div>
          </div>
          {!locked && (
            <PickemBtn variant="primary" onClick={onEdit}>
              Edit bracket
            </PickemBtn>
          )}
        </div>
      </div>
    </header>
  );
}

// ── BracketColumn (vertical stack of match cards) ─────────────────────────

function BracketColumn({ label, matches, compact = false, mirror = false }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 16 : 10,
        alignItems: mirror ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        className="p-eyebrow"
        style={{ marginBottom: 4, alignSelf: mirror ? 'flex-end' : 'flex-start' }}
      >
        {label}
      </div>
      {matches.map((m) => (
        <MatchCompact key={m.id} match={m} mirror={mirror} />
      ))}
      {matches.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-3)',
            fontFamily: 'var(--font-ui-pickem)',
          }}
        >
          —
        </div>
      )}
    </div>
  );
}

function MatchCompact({ match, mirror }) {
  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--line-1)',
        borderRadius: 8,
        overflow: 'hidden',
        minWidth: 110,
        maxWidth: 160,
      }}
    >
      {[match.home, match.away].map((teamCode, i) => {
        const sel = match.pick === teamCode;
        return (
          <div
            key={teamCode + '-' + i}
            style={{
              display: 'flex',
              alignItems: 'center',
              flexDirection: mirror ? 'row-reverse' : 'row',
              gap: 6,
              padding: '7px 10px',
              borderBottom: i === 0 ? '1px solid var(--line-1)' : 'none',
              background: sel ? 'var(--pickem-orange-wash)' : 'transparent',
              borderLeft: !mirror && sel ? '2px solid var(--pickem-orange)' : '2px solid transparent',
              borderRight: mirror && sel ? '2px solid var(--pickem-orange)' : '2px solid transparent',
            }}
          >
            <Flag code={teamCode} w={18} h={13} round={2} />
            <span
              style={{
                fontSize: 11,
                fontWeight: sel ? 700 : 500,
                color: sel ? 'var(--pickem-orange)' : 'var(--ink-2)',
                fontFamily: 'var(--font-ui-pickem)',
              }}
            >
              {teamShort(teamCode)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── FinalCard (centerpiece) ───────────────────────────────────────────────

function FinalCard({ home, away, pick }) {
  if (!home || !away) {
    return (
      <div
        style={{
          background: 'var(--bg-raised)',
          border: '1px dashed var(--line-2)',
          borderRadius: 10,
          padding: 14,
          color: 'var(--ink-3)',
          fontFamily: 'var(--font-ui-pickem)',
          fontSize: 12,
          textAlign: 'center',
        }}
      >
        Belum ada finalis
      </div>
    );
  }
  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--pickem-orange-soft)',
        borderRadius: 10,
        overflow: 'hidden',
        minWidth: 180,
        maxWidth: 220,
        boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.08)',
      }}
    >
      {[home, away].map((teamCode, i) => {
        const sel = pick === teamCode;
        return (
          <div
            key={teamCode + '-' + i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderBottom: i === 0 ? '1px solid var(--line-1)' : 'none',
              background: sel ? 'var(--pickem-orange-wash)' : 'transparent',
              borderLeft: sel ? '3px solid var(--pickem-orange)' : '3px solid transparent',
            }}
          >
            <Flag code={teamCode} w={24} h={17} round={3} />
            <span
              style={{
                fontFamily: 'var(--font-ui-pickem)',
                fontSize: 13,
                fontWeight: sel ? 700 : 500,
                color: sel ? 'var(--pickem-orange)' : 'var(--ink-2)',
              }}
            >
              {teamLabel(teamCode)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── ChampionPanel (trophy + flag, ceremonial) ─────────────────────────────

function ChampionPanel({ team }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '14px 18px',
        background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.14) 0%, var(--bg-raised) 70%)',
        border: '1px solid var(--pickem-orange-soft)',
        borderRadius: 12,
        boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.06)',
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 36 }} aria-hidden="true">🏆</div>
      <div
        className="p-eyebrow"
        style={{ color: 'var(--pickem-orange)', fontSize: 10 }}
      >
        JUARA
      </div>
      <Flag code={team} w={48} h={34} round={4} />
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--ink-1)',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        {teamLabel(team)}
      </div>
    </div>
  );
}
