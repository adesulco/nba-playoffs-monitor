import React, { useEffect, useState } from 'react';
import Flag from '../Flag.jsx';
import { BackIcon } from '../icons.jsx';
import { PickemBtn } from './social.jsx';
import {
  GROUP_LETTERS,
  SAMPLE_GROUPS,
  STAGE_LABELS,
  teamLabel,
  teamShort,
} from '../bracketData.js';

// ============================================================================
// v0.69.0 — Bracket stage components (Pick'em P4).
//
// Per-stage rendering surfaces ported from design-handoff-pickem/js/
// bracket.jsx#323-660. Each stage is its own pattern:
//
//   Group     12 groups, pager pills + arrows, rank picker per team
//   Knockout  list of match-ups, tap a team to advance (R32/R16/QF/SF)
//   Final     ceremonial solo card with bigger type
//   Champion  trophy + flag + potential-points + lock CTA
//   MiniStrip persistent footer summary (totalPicks / 68 + champion preview)
//   LockConfirm modal with consequences in plain Bahasa
// ============================================================================

// ── Group stage ────────────────────────────────────────────────────────────

export function BracketGroupStage({ groups, setPick, locked }) {
  const [active, setActive] = useState('A');
  const activeGroup = SAMPLE_GROUPS[active];
  const picks = groups[active] || {};
  const activeIdx = GROUP_LETTERS.indexOf(active);

  return (
    <>
      {/* Group pager */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 0 14px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: 'var(--bg-base)',
        }}
      >
        <PagerArrow
          ariaLabel="Grup sebelumnya"
          onClick={() => setActive(GROUP_LETTERS[Math.max(0, activeIdx - 1)])}
          disabled={activeIdx === 0}
          flip={false}
        />
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
            paddingBottom: 2,
          }}
        >
          {GROUP_LETTERS.map((g) => {
            const sel = g === active;
            const done = Object.values(groups[g] || {}).filter((v) => v !== null).length === 3;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setActive(g)}
                aria-current={sel ? 'true' : undefined}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  minWidth: 36,
                  height: 36,
                  borderRadius: 8,
                  background: sel ? 'var(--pickem-orange)' : 'var(--bg-raised)',
                  color: sel ? '#0A1628' : done ? 'var(--p-up)' : 'var(--ink-2)',
                  border:
                    '1px solid ' +
                    (sel
                      ? 'var(--pickem-orange)'
                      : done
                      ? 'rgba(52, 211, 153, 0.3)'
                      : 'var(--line-2)'),
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                {done && <span style={{ fontSize: 9 }}>✓</span>}
                {g}
              </button>
            );
          })}
        </div>
        <PagerArrow
          ariaLabel="Grup berikutnya"
          onClick={() => setActive(GROUP_LETTERS[Math.min(11, activeIdx + 1)])}
          disabled={activeIdx === 11}
          flip
        />
      </div>

      {/* Group card */}
      <div
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-1)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--line-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
            Grup {active}
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--ink-3)',
            }}
          >
            Pilih urutan
          </span>
        </div>
        {activeGroup.teams.map(([code]) => (
          <BracketGroupRow
            key={code}
            code={code}
            rank={picks[code]}
            onSet={(r) => setPick(active, code, r)}
            locked={locked}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 14,
          background: 'var(--p-info-wash)',
          borderRadius: 10,
          border: '1px solid rgba(42, 111, 219, 0.30)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-2)',
            fontFamily: 'var(--font-ui-pickem)',
            lineHeight: 1.5,
          }}
        >
          <strong>Juara grup + runner-up</strong> langsung lolos. <strong>4 grup terbaik #3</strong>{' '}
          menyusul. Otomatis dihitung dari pilihan kamu.
        </div>
      </div>
    </>
  );
}

function PagerArrow({ ariaLabel, onClick, disabled, flip }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        minWidth: 36,
        minHeight: 36,
        width: 36,
        height: 36,
        borderRadius: 8,
        background: 'transparent',
        color: 'var(--ink-2)',
        border: '1px solid var(--line-2)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ display: 'inline-flex', transform: flip ? 'rotate(180deg)' : undefined }}>
        <BackIcon size={16} />
      </span>
    </button>
  );
}

function BracketGroupRow({ code, rank, onSet, locked }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 14px',
        borderBottom: '1px solid var(--line-1)',
        gap: 10,
        minHeight: 64,
      }}
    >
      <Flag code={code} w={32} h={22} round={3} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)' }}>{teamLabel(code)}</div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          {teamShort(code)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }} role="radiogroup" aria-label={`Peringkat ${code}`}>
        {[1, 2, 3].map((r) => {
          const sel = rank === r;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={sel}
              aria-label={`Pilih ${code} sebagai peringkat ${r}`}
              disabled={locked}
              onClick={() => !locked && onSet(r)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.5 : 1,
                background: sel ? 'var(--pickem-orange)' : 'var(--bg-base)',
                color: sel ? '#0A1628' : 'var(--ink-2)',
                border: '1px solid ' + (sel ? 'var(--pickem-orange)' : 'var(--line-2)'),
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 13,
                transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
              }}
            >
              {r}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Knockout stage ─────────────────────────────────────────────────────────

export function BracketKnockoutStage({ label, stage, matches, setPick, locked }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
      {matches.map((m, i) => (
        <BracketMatch
          key={m.id}
          match={m}
          label={label}
          idx={i + 1}
          onPick={(team) => !locked && setPick(stage, m.id, team)}
          locked={locked}
        />
      ))}
    </div>
  );
}

function BracketMatch({ match, label, idx, onPick, locked }) {
  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--line-1)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--line-1)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--ink-3)',
            letterSpacing: '0.10em',
          }}
        >
          {label} · {idx}
        </span>
        {match.pick && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--p-up)',
              letterSpacing: '0.08em',
            }}
          >
            ✓ LOLOS
          </span>
        )}
      </div>
      <BracketPickRow
        team={match.home}
        selected={match.pick === match.home}
        onPick={() => onPick(match.home)}
        locked={locked}
      />
      <BracketPickRow
        team={match.away}
        selected={match.pick === match.away}
        onPick={() => onPick(match.away)}
        locked={locked}
        last
      />
    </div>
  );
}

function BracketPickRow({ team, selected, onPick, locked, last }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      disabled={locked}
      style={{
        width: '100%',
        appearance: 'none',
        cursor: locked ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        background: selected ? 'var(--pickem-orange-wash)' : 'transparent',
        border: 'none',
        borderBottom: last ? 'none' : '1px solid var(--line-1)',
        borderLeft: selected ? '3px solid var(--pickem-orange)' : '3px solid transparent',
        color: 'var(--ink-1)',
        fontFamily: 'var(--font-ui-pickem)',
        minHeight: 52,
        opacity: locked ? 0.7 : 1,
        transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
      }}
    >
      <Flag code={team} w={28} h={20} round={3} />
      <span
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: selected ? 700 : 500,
          color: selected ? 'var(--pickem-orange)' : 'var(--ink-1)',
        }}
      >
        {teamLabel(team)}
      </span>
      {selected && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--pickem-orange)',
            letterSpacing: '0.06em',
          }}
        >
          →
        </span>
      )}
    </button>
  );
}

// ── Final stage ────────────────────────────────────────────────────────────

export function BracketFinalStage({ match, setPick, locked }) {
  return (
    <div style={{ paddingTop: 4 }}>
      <div
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--pickem-orange-soft)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.06)',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            textAlign: 'center',
            background: 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid var(--pickem-orange-soft)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--pickem-orange)',
              letterSpacing: '0.12em',
              marginBottom: 4,
            }}
          >
            🏆 FINAL · MARACANÃ · MINGGU 19 JULI
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink-1)',
            }}
          >
            Siapa juaranya?
          </div>
        </div>
        <BracketFinalRow
          team={match.home}
          selected={match.pick === match.home}
          onPick={() => !locked && setPick(match.home)}
          locked={locked}
        />
        <div
          style={{
            textAlign: 'center',
            padding: '6px 0',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--ink-3)',
          }}
        >
          vs
        </div>
        <BracketFinalRow
          team={match.away}
          selected={match.pick === match.away}
          onPick={() => !locked && setPick(match.away)}
          locked={locked}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 14,
          background: 'var(--pickem-orange-wash)',
          borderRadius: 10,
          border: '1px solid var(--pickem-orange-soft)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-2)',
            fontFamily: 'var(--font-ui-pickem)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--pickem-orange)' }}>Bonus juara:</strong> +200 poin kalau
          tebakan kamu jadi juara. Tinggal pilih sekali lagi.
        </div>
      </div>
    </div>
  );
}

function BracketFinalRow({ team, selected, onPick, locked }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      disabled={locked}
      style={{
        width: '100%',
        appearance: 'none',
        cursor: locked ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '20px 18px',
        minHeight: 84,
        background: selected ? 'var(--pickem-orange)' : 'transparent',
        color: selected ? '#0A1628' : 'var(--ink-1)',
        border: 'none',
        textAlign: 'left',
        opacity: locked && !selected ? 0.55 : 1,
        transition: 'all 200ms cubic-bezier(0.2, 0.7, 0.3, 1)',
      }}
    >
      <Flag code={team} w={56} h={40} round={6} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.015em',
          }}
        >
          {teamLabel(team)}
        </div>
        {selected && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              marginTop: 2,
              letterSpacing: '0.08em',
            }}
          >
            JUARAMU
          </div>
        )}
      </div>
      {selected && <span style={{ fontSize: 28 }}>🏆</span>}
    </button>
  );
}

// ── Champion stage ─────────────────────────────────────────────────────────

export function BracketChampion({ team, onCrown, potentialPoints }) {
  // Side effect on mount: persist the picked finalist as the champion so the
  // champ stage doesn't require a second tap (matches handoff §"Champion").
  useEffect(() => {
    if (team && onCrown) onCrown(team);
    // Intentionally only fires when the picked team changes — the
    // BracketChampion view is ceremonial, not a new pick surface.
  }, [team, onCrown]);

  if (!team) {
    // No final winner picked yet — gentle nudge back to Final stage.
    return (
      <div
        style={{
          padding: '32px 20px',
          textAlign: 'center',
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-1)',
          borderRadius: 14,
          fontFamily: 'var(--font-ui-pickem)',
        }}
      >
        <div style={{ fontSize: 38, marginBottom: 8 }}>🏆</div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--ink-1)',
            marginBottom: 6,
          }}
        >
          Belum ada juara
        </div>
        <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>
          Balik dulu ke Final untuk pilih.
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        padding: '32px 24px 28px',
        textAlign: 'center',
        marginTop: 4,
        background:
          'linear-gradient(180deg, rgba(245, 158, 11, 0.14) 0%, var(--bg-raised) 70%)',
        borderRadius: 18,
        border: '1px solid var(--pickem-orange-soft)',
        boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.06)',
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div
        style={{
          fontSize: 56,
          marginBottom: 8,
          filter: 'drop-shadow(0 6px 18px rgba(245, 158, 11, 0.4))',
        }}
      >
        🏆
      </div>
      <div
        className="p-eyebrow"
        style={{ color: 'var(--pickem-orange)', marginBottom: 12, fontSize: 11 }}
      >
        JUARA DUNIA 2026 · MENURUT KAMU
      </div>
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
        <Flag code={team} w={88} h={62} round={8} />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          fontWeight: 700,
          color: 'var(--ink-1)',
          marginBottom: 12,
          letterSpacing: '-0.025em',
          lineHeight: 1,
        }}
      >
        {teamLabel(team)}
      </div>
      <div
        style={{
          color: 'var(--ink-2)',
          fontSize: 13,
          marginBottom: 22,
          padding: '0 8px',
          lineHeight: 1.55,
        }}
      >
        Bracket kamu lengkap. Kunci sekarang dan nggak bisa diubah lagi sampai turnamen selesai.
      </div>
      {potentialPoints != null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            paddingTop: 16,
            borderTop: '1px solid var(--line-1)',
          }}
        >
          <div>
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
              +{potentialPoints}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini-strip (persistent footer) ─────────────────────────────────────────

export function BracketMiniStrip({ champion, totalPicks, target = 68 }) {
  return (
    <div
      style={{
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        borderBottom: '1px solid var(--line-1)',
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div>
        <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>
          BRACKET KAMU
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>
          {totalPicks > 0 ? (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{totalPicks}</span>
              <span style={{ color: 'var(--ink-3)' }}> / {target} pilihan</span>
            </>
          ) : (
            <span style={{ color: 'var(--ink-3)' }}>Belum ada pilihan</span>
          )}
        </div>
      </div>
      {champion ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏆</span>
          <Flag code={champion} w={28} h={20} round={3} />
          <div style={{ textAlign: 'right' }}>
            <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 1 }}>
              JUARAMU
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--pickem-orange)',
              }}
            >
              {teamShort(champion)}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--ink-3)',
            letterSpacing: '0.08em',
          }}
        >
          PILIH SAMPAI JUARA →
        </div>
      )}
    </div>
  );
}

// ── Lock confirmation modal ────────────────────────────────────────────────

export function BracketLockConfirm({ champion, onCancel, onConfirm, locking = false, error = null }) {
  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 16, 29, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
        fontFamily: 'var(--font-ui-pickem)',
        zIndex: 9000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kunci bracket"
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-1)',
          borderRadius: 18,
          padding: '22px 22px 18px',
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
          color: 'var(--ink-1)',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div style={{ fontSize: 38, marginBottom: 8 }}>🔒</div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 8,
            letterSpacing: '-0.015em',
          }}
        >
          Kunci bracket?
        </div>
        <div
          style={{
            color: 'var(--ink-2)',
            fontSize: 13,
            marginBottom: 18,
            lineHeight: 1.5,
          }}
        >
          Setelah dikunci, bracket nggak bisa diubah lagi sampai final WC 2026 selesai. Kamu masih
          bisa main mode lain (matchday, jagoan, survivor).
        </div>
        {champion && (
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-base)',
              border: '1px solid var(--line-1)',
              borderRadius: 10,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 22 }}>🏆</span>
            <Flag code={champion} w={32} h={22} round={3} />
            <div style={{ textAlign: 'left' }}>
              <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 1 }}>
                JUARAMU
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--pickem-orange)',
                }}
              >
                {teamLabel(champion)}
              </div>
            </div>
          </div>
        )}
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 12,
              padding: '8px 10px',
              background: 'var(--p-down-wash)',
              color: 'var(--p-down)',
              borderRadius: 'var(--r-2)',
              fontSize: 12,
              textAlign: 'left',
              fontFamily: 'var(--font-ui-pickem)',
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PickemBtn full size="lg" variant="primary" onClick={onConfirm} disabled={locking}>
            {locking ? 'Mengunci…' : '🔒 Kunci bracket'}
          </PickemBtn>
          <PickemBtn full size="md" variant="ghost" onClick={onCancel} disabled={locking}>
            Nanti aja
          </PickemBtn>
        </div>
      </div>
    </div>
  );
}

// ── Stepper (sticky stage selector) ───────────────────────────────────────

export function BracketStepper({ stages, currentStage, stageIdx, counts, onStageChange }) {
  return (
    <div
      role="tablist"
      style={{
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--line-1)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          padding: '8px 14px 10px',
        }}
      >
        {stages.map((s, i) => {
          const sel = s.k === currentStage;
          const stageCount = counts[s.k] ?? 0;
          const done = i < stageIdx || (i === stageIdx && stageCount >= s.total);
          // Can't skip more than one stage forward — guides the user through the funnel
          const lockedAhead = i > stageIdx + 1;
          return (
            <button
              key={s.k}
              type="button"
              role="tab"
              aria-selected={sel}
              aria-label={STAGE_LABELS[s.k]}
              onClick={() => !lockedAhead && onStageChange?.(s.k)}
              disabled={lockedAhead}
              style={{
                appearance: 'none',
                cursor: lockedAhead ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                padding: '8px 12px',
                borderRadius: 999,
                background: sel ? 'var(--pickem-orange)' : 'transparent',
                color: sel
                  ? '#0A1628'
                  : lockedAhead
                  ? 'var(--ink-4)'
                  : done
                  ? 'var(--p-up)'
                  : 'var(--ink-3)',
                border:
                  '1px solid ' +
                  (sel
                    ? 'var(--pickem-orange)'
                    : done
                    ? 'rgba(52, 211, 153, 0.3)'
                    : 'var(--line-2)'),
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
                opacity: lockedAhead ? 0.4 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {done && <span style={{ fontSize: 10 }}>✓</span>}
              {s.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
