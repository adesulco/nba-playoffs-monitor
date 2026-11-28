/**
 * TopologyTree4a.jsx — Interactive 5-Shape Playoff Bracket UI in Sistem 4a.
 *
 * Shared presentation + interaction tree for:
 *   - Simulasi4a (/simulasi/:competition) — zero-login viral scenario builder
 *   - Bracket4a  (/bagan/:competition)    — official Playoff Bracket + Babak Baru
 *
 * Designed mobile-first for 390px 1-thumb play (stage pills + tappable matchup
 * cards + optional series-score bonus chips) and scales cleanly inside `.g4-body`
 * on 1440px desktop rails.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  nodesForPhase,
  resolveNodeTeams,
} from '../playoffTopology.js';
import { IconCheck, IconLock } from './icons4a.jsx';

export default function TopologyTree4a({
  topology,
  skin,
  state,
  phaseKey = 'full',
  locked = false,
  lang = 'id',
  onPickWinner,
  onPickDetail,
  onPromoteGroup,
}) {
  const tx = (en, id) => (lang === 'id' ? id : en);
  const accent = skin?.accent || 'var(--g4-scarlet)';

  const activeNodes = useMemo(
    () => nodesForPhase(topology, phaseKey),
    [topology, phaseKey]
  );

  const visibleStages = useMemo(() => {
    if (!topology?.stages) return [];
    const nodeStages = new Set(activeNodes.map((n) => n.stage));
    return topology.stages.filter((st) => {
      if (st.key === 'groups') return phaseKey === 'full' && !!topology.groups;
      return nodeStages.has(st.key);
    });
  }, [topology, activeNodes, phaseKey]);

  const [activeStage, setActiveStage] = useState(() => visibleStages[0]?.key || '');

  useEffect(() => {
    if (!visibleStages.some((s) => s.key === activeStage)) {
      setActiveStage(visibleStages[0]?.key || '');
    }
  }, [visibleStages, activeStage]);

  if (!topology) return null;

  const phaseObj = topology.phases?.find((p) => p.key === phaseKey) || { multiplier: 1 };
  const mult = phaseObj.multiplier ?? 1;

  const stageCounts = (stageKey) => {
    if (stageKey === 'groups') {
      const total = Object.keys(topology.groups || {}).length;
      return { done: total, total };
    }
    const list = activeNodes.filter((n) => n.stage === stageKey);
    const done = list.filter((n) => !!state?.nodes?.[n.id]?.winner).length;
    return { done, total: list.length };
  };

  const stageNodes = activeNodes.filter((n) => n.stage === activeStage);

  const describeSlotPlaceholder = (src) => {
    if (!src) return 'TBD';
    if (src.seed) return src.seed;
    if (src.groupRankOf) {
      return tx(
        `Group ${src.groupRankOf.group} #${src.groupRankOf.rank}`,
        `Grup ${src.groupRankOf.group} #${src.groupRankOf.rank}`
      );
    }
    if (src.winnerOf) {
      const up = topology.nodes.find((n) => n.id === src.winnerOf);
      const label = up ? (lang === 'id' ? up.roundLabel.id : up.roundLabel.en).split('·')[0].trim() : src.winnerOf;
      return tx(`Winner ${label}`, `Pemenang ${label}`);
    }
    if (src.loserOf) {
      const up = topology.nodes.find((n) => n.id === src.loserOf);
      const label = up ? (lang === 'id' ? up.roundLabel.id : up.roundLabel.en).split('·')[0].trim() : src.loserOf;
      return tx(`Drop from ${label}`, `Turun dari ${label}`);
    }
    return 'TBD';
  };

  return (
    <div style={S.wrap}>
      {/* Stage navigation pills */}
      <div style={S.stageBar} role="tablist" aria-label={tx('Tournament stages', 'Babak turnamen')}>
        {visibleStages.map((st) => {
          const isCur = st.key === activeStage;
          const { done, total } = stageCounts(st.key);
          const allIn = total > 0 && done === total && st.key !== 'groups';
          return (
            <button
              key={st.key}
              type="button"
              role="tab"
              aria-selected={isCur}
              onClick={() => setActiveStage(st.key)}
              style={{
                ...S.stagePill,
                ...(isCur
                  ? { background: 'var(--g4-ink-block)', color: 'var(--g4-paper)', borderColor: 'var(--g4-ink-block)' }
                  : {}),
              }}
            >
              <span>{lang === 'id' ? st.label.id : st.label.en}</span>
              {st.key !== 'groups' && (
                <span
                  style={{
                    ...S.stageCount,
                    background: allIn ? 'var(--g4-win)' : isCur ? 'rgba(255,255,255,0.18)' : 'var(--g4-border-soft)',
                    color: allIn ? '#fff' : isCur ? 'var(--g4-paper)' : 'var(--g4-text-muted)',
                  }}
                >
                  {done}/{total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Group-stage ranker for `group-plus-ko` topologies */}
      {activeStage === 'groups' && topology.groups && (
        <div style={S.list}>
          <p style={S.stageHint}>
            {tx(
              'Tap #1 or #2 to set which two nations qualify for the knockout bracket.',
              'Ketuk #1 atau #2 untuk memilih dua tim yang lolos ke bagan fase gugur.'
            )}
          </p>
          {Object.keys(topology.groups).map((letter) => {
            const order = state?.groups?.[letter] || topology.groups[letter];
            return (
              <div key={letter} style={S.card}>
                <div style={S.cardHead}>
                  <span style={{ ...S.eyebrow, color: accent }}>
                    {tx(`GROUP ${letter}`, `GRUP ${letter}`)}
                  </span>
                  <span style={S.ptsBadge}>
                    {tx('Top 2 advance · +5 / +3 pts', '2 teratas lolos · +5 / +3 poin')}
                  </span>
                </div>
                {order.map((code, idx) => {
                  const team = topology.teams[code] || { code, name: code };
                  const qualifies = idx < 2;
                  return (
                    <div
                      key={code}
                      style={{
                        ...S.groupRow,
                        borderTop: idx === 0 ? 'none' : '1px solid var(--g4-border-soft)',
                        background: qualifies ? 'var(--g4-win-bg)' : 'transparent',
                      }}
                    >
                      <span
                        style={{
                          ...S.rankBadge,
                          background: qualifies ? 'var(--g4-win)' : 'var(--g4-border-soft)',
                          color: qualifies ? '#fff' : 'var(--g4-text-muted)',
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <span style={S.teamCode}>{team.code}</span>
                      <span style={S.teamName}>{team.name}</span>
                      {!locked && (
                        <span style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => onPromoteGroup && onPromoteGroup(letter, code, 1)}
                            style={{
                              ...S.miniRankBtn,
                              ...(idx === 0 ? { background: 'var(--g4-ink-block)', color: 'var(--g4-paper)' } : {}),
                            }}
                          >
                            #1
                          </button>
                          <button
                            type="button"
                            onClick={() => onPromoteGroup && onPromoteGroup(letter, code, 2)}
                            style={{
                              ...S.miniRankBtn,
                              ...(idx === 1 ? { background: 'var(--g4-ink-block)', color: 'var(--g4-paper)' } : {}),
                            }}
                          >
                            #2
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Knockout / Series nodes */}
      {activeStage !== 'groups' && (
        <div style={S.list}>
          {stageNodes.map((node) => {
            const [codeA, codeB] = resolveNodeTeams(topology, state, node.id);
            const teamA = codeA ? (topology.teams[codeA] || { code: codeA, name: codeA }) : null;
            const teamB = codeB ? (topology.teams[codeB] || { code: codeB, name: codeB }) : null;
            const pick = state?.nodes?.[node.id] || null;
            const basePts = Math.round((node.points || 0) * mult);
            const bonusPts = Math.round((node.detailBonus || 0) * mult);
            const ready = !!(codeA && codeB);

            return (
              <div
                key={node.id}
                style={{
                  ...S.card,
                  ...(node.isFinal ? { border: '2px solid var(--g4-text)' } : {}),
                }}
              >
                <div style={S.cardHead}>
                  <span style={{ ...S.eyebrow, color: accent }}>
                    {lang === 'id' ? node.roundLabel.id : node.roundLabel.en}
                  </span>
                  <span style={S.ptsBadge}>
                    +{basePts}{bonusPts > 0 ? ` (+${bonusPts})` : ''} pts
                  </span>
                </div>

                <div style={S.matchupCol}>
                  {[
                    { code: codeA, team: teamA, src: node.a },
                    { code: codeB, team: teamB, src: node.b },
                  ].map((slot, sIdx) => {
                    const isSelected = !!slot.code && pick?.winner === slot.code;
                    const canTap = !locked && ready && !!slot.code;
                    return (
                      <button
                        key={sIdx}
                        type="button"
                        disabled={!canTap}
                        onClick={canTap ? () => onPickWinner && onPickWinner(node.id, slot.code) : undefined}
                        style={{
                          ...S.slotBtn,
                          ...(isSelected
                            ? {
                                background: accent,
                                color: '#fff',
                                borderColor: accent,
                              }
                            : slot.code
                              ? {
                                  background: 'var(--g4-bg)',
                                  color: 'var(--g4-text)',
                                  borderColor: 'var(--g4-text)',
                                }
                              : {
                                  background: 'var(--g4-locked-chip-bg)',
                                  color: 'var(--g4-locked-chip-fg)',
                                  borderColor: 'transparent',
                                }),
                          cursor: canTap ? 'pointer' : 'default',
                        }}
                      >
                        <span style={S.slotLeft}>
                          {slot.team?.seed && (
                            <span
                              style={{
                                ...S.seedChip,
                                background: isSelected ? 'rgba(255,255,255,0.22)' : 'var(--g4-surface)',
                                color: isSelected ? '#fff' : 'var(--g4-text-muted)',
                              }}
                            >
                              {slot.team.seed}
                            </span>
                          )}
                          <span style={S.slotCode}>
                            {slot.team ? slot.team.code : '—'}
                          </span>
                          <span
                            style={{
                              ...S.slotName,
                              color: isSelected ? '#fff' : slot.team ? 'var(--g4-text)' : 'var(--g4-text-muted)',
                            }}
                          >
                            {slot.team ? slot.team.name : describeSlotPlaceholder(slot.src)}
                          </span>
                        </span>
                        <span style={S.slotRight}>
                          {locked && isSelected && <IconLock size={14} />}
                          {!locked && isSelected && <IconCheck size={16} />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Optional series length / game score bonus row */}
                {pick?.winner && Array.isArray(node.detailOptions) && node.detailOptions.length > 0 && (
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>
                      {topology.detailLabel
                        ? (lang === 'id' ? topology.detailLabel.id : topology.detailLabel.en)
                        : tx('Bonus', 'Bonus')}
                      {bonusPts > 0 ? ` (+${bonusPts})` : ''}
                    </span>
                    <div style={S.detailPills}>
                      {node.detailOptions.map((opt) => {
                        const isDetail = pick.detail === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={locked}
                            onClick={locked ? undefined : () => onPickDetail && onPickDetail(node.id, opt)}
                            style={{
                              ...S.detailChip,
                              ...(isDetail
                                ? { background: 'var(--g4-ink-block)', color: 'var(--g4-paper)', borderColor: 'var(--g4-ink-block)' }
                                : {}),
                              cursor: locked ? 'default' : 'pointer',
                            }}
                          >
                            {topology.shape === 'playoff-series' ? `${opt}G` : opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Next-stage quick advance button */}
      {visibleStages.length > 1 && (() => {
        const curIdx = visibleStages.findIndex((s) => s.key === activeStage);
        const nextStage = curIdx >= 0 && curIdx < visibleStages.length - 1 ? visibleStages[curIdx + 1] : null;
        if (!nextStage) return null;
        return (
          <button
            type="button"
            onClick={() => setActiveStage(nextStage.key)}
            style={S.nextStageBtn}
          >
            {tx(
              `Next round: ${nextStage.label.en} →`,
              `Lanjut ke ${nextStage.label.id} →`
            )}
          </button>
        );
      })()}
    </div>
  );
}

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 10 },
  stageBar: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 4,
    scrollbarWidth: 'none',
  },
  stagePill: {
    appearance: 'none',
    border: '1.5px solid var(--g4-text)',
    background: 'var(--g4-surface)',
    color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '7px 12px',
    font: '700 12px/1 var(--g4-font-ui)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  stageCount: {
    font: '700 10px/1 var(--g4-font-ui)',
    padding: '3px 6px',
    borderRadius: 'var(--g4-radius-pill)',
  },
  stageHint: {
    font: '500 12px/1.45 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
    margin: '0 0 2px',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    background: 'var(--g4-surface)',
    border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-card)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
  },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    font: '700 10px/1.2 var(--g4-font-ui)',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },
  ptsBadge: {
    font: '700 10px/1 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
  },
  matchupCol: { display: 'flex', flexDirection: 'column', gap: 6 },
  slotBtn: {
    appearance: 'none',
    width: '100%',
    border: '1.5px solid var(--g4-text)',
    borderRadius: 12,
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    textAlign: 'left',
    boxSizing: 'border-box',
  },
  slotLeft: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 },
  seedChip: {
    font: '700 9px/1 var(--g4-font-ui)',
    padding: '3px 6px',
    borderRadius: 'var(--g4-radius-pill)',
    flex: 'none',
  },
  slotCode: {
    font: '800 13px/1 var(--g4-font-display)',
    letterSpacing: '-0.2px',
    minWidth: 32,
    flex: 'none',
  },
  slotName: {
    font: '600 13px/1.2 var(--g4-font-ui)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  slotRight: { display: 'inline-flex', alignItems: 'center', flex: 'none' },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 4,
    borderTop: '1px dashed var(--g4-border)',
    flexWrap: 'wrap',
  },
  detailLabel: {
    font: '600 11px/1.2 var(--g4-font-ui)',
    color: 'var(--g4-text-muted)',
  },
  detailPills: { display: 'inline-flex', gap: 5, flexWrap: 'wrap' },
  detailChip: {
    appearance: 'none',
    border: '1px solid var(--g4-text)',
    background: 'transparent',
    color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '5px 10px',
    font: '700 11px/1 var(--g4-font-ui)',
  },
  groupRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 6px',
    borderRadius: 8,
  },
  rankBadge: {
    font: '800 10px/1 var(--g4-font-display)',
    padding: '4px 6px',
    borderRadius: 'var(--g4-radius-pill)',
    flex: 'none',
  },
  teamCode: { font: '800 12px/1 var(--g4-font-display)', minWidth: 30 },
  teamName: { font: '600 13px/1.2 var(--g4-font-ui)', flex: 1, minWidth: 0 },
  miniRankBtn: {
    appearance: 'none',
    border: '1px solid var(--g4-text)',
    background: 'var(--g4-surface)',
    color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '4px 8px',
    font: '700 10px/1 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  nextStageBtn: {
    appearance: 'none',
    border: '1.5px solid var(--g4-text)',
    background: 'var(--g4-surface)',
    color: 'var(--g4-text)',
    borderRadius: 'var(--g4-radius-pill)',
    padding: '11px 16px',
    font: '700 13px/1 var(--g4-font-ui)',
    cursor: 'pointer',
    textAlign: 'center',
  },
};
