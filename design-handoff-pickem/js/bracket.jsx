// =====================================================================
// Gibol Pick'em — Bracket Builder (Stadium Night) · refined
// =====================================================================
// The hardest responsive problem in the product. 48 teams → 32 knockout.
//
// Phone solution: STAGE-BY-STAGE PAGING with a sticky stepper.
//   Group → R32 → R16 → QF → SF → Final → Champion
//
// Each stage is its own pattern:
//   • Group: 12 groups, swipeable via pager dots. Pick 1/2/3, "–" reserves.
//   • Knockout (R32 → SF): list of matchups, tap a team to advance.
//   • Final: solo card, bigger type, ceremonial.
//   • Champion: trophy + flag + lock CTA.
//
// Persistent "your bracket so far" mini-strip at the bottom of every
// stage shows total picks made and a Champion preview when set.
//
// Auto-pick favourites: one-tap to prefill from odds; chip shows source.
// Lock confirmation: modal with consequences in plain Bahasa.
// =====================================================================

const STAGES = [
  { k: 'group', l: 'Grup',  total: 36 },   // 12 groups × 3 picks (1st/2nd/3rd)
  { k: 'r32',   l: 'R32',   total: 16 },
  { k: 'r16',   l: 'R16',   total: 8  },
  { k: 'qf',    l: 'QF',    total: 4  },
  { k: 'sf',    l: 'SF',    total: 2  },
  { k: 'final', l: 'Final', total: 1  },
  { k: 'champ', l: 'Juara', total: 1  },
];

// ----- Full sample bracket data --------------------------------------

const GROUP_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const SAMPLE_GROUPS = {
  A: { teams: [['CAN', 78], ['MEX', 65], ['IDN', 28], ['SEN', 56]] },
  B: { teams: [['BRA', 88], ['BEL', 60], ['KOR', 32], ['MAR', 45]] },
  C: { teams: [['ARG', 84], ['CRO', 58], ['KOR', 38], ['AUS', 30]] },
  D: { teams: [['FRA', 80], ['NED', 62], ['JPN', 50], ['USA', 35]] },
  E: { teams: [['ESP', 82], ['GER', 70], ['ITA', 55], ['URU', 40]] },
  F: { teams: [['ENG', 76], ['POR', 68], ['COL', 48], ['AUS', 32]] },
  G: { teams: [['BRA', 75], ['SEN', 55], ['MAR', 48], ['JPN', 40]] },
  H: { teams: [['NED', 70], ['MEX', 58], ['CRO', 50], ['USA', 38]] },
  I: { teams: [['GER', 72], ['BEL', 62], ['POR', 55], ['SEN', 35]] },
  J: { teams: [['ITA', 68], ['COL', 55], ['CAN', 50], ['IDN', 30]] },
  K: { teams: [['URU', 65], ['KOR', 52], ['MAR', 48], ['AUS', 35]] },
  L: { teams: [['POR', 70], ['JPN', 58], ['CRO', 52], ['USA', 40]] },
};

// Knockout brackets are pre-seeded based on plausible top-2 from groups + best-thirds
const SAMPLE_R32 = [
  ['CAN','MEX'], ['BRA','POR'], ['ARG','JPN'], ['FRA','GER'],
  ['ESP','BEL'], ['ENG','URU'], ['NED','SEN'], ['ITA','COL'],
  ['BRA','MAR'], ['GER','CRO'], ['POR','KOR'], ['CAN','USA'],
  ['NED','BEL'], ['ESP','SEN'], ['ARG','MEX'], ['FRA','ITA'],
].map(([h, a], i) => ({ id: 'r32-' + i, home: h, away: a, pick: null }));

const SAMPLE_R16_DEFAULT = [
  ['CAN','BRA'], ['ARG','FRA'], ['ESP','ENG'], ['NED','ITA'],
  ['BRA','GER'], ['POR','CAN'], ['NED','ESP'], ['ARG','FRA'],
].map(([h, a], i) => ({ id: 'r16-' + i, home: h, away: a, pick: null }));

// ----- Custom hook: bracket state ------------------------------------

function useBracketState() {
  // Each group: { code -> rank (1|2|3|null) }
  const initGroups = () => {
    const o = {};
    GROUP_LETTERS.forEach(g => {
      o[g] = SAMPLE_GROUPS[g].teams.reduce((acc, [c]) => ({ ...acc, [c]: null }), {});
    });
    return o;
  };
  const [groups, setGroups] = React.useState(initGroups);
  const [r32, setR32] = React.useState(SAMPLE_R32);
  const [r16, setR16] = React.useState(SAMPLE_R16_DEFAULT);
  const [qf, setQf] = React.useState([
    { id: 'qf-0', home: 'CAN', away: 'ARG', pick: null },
    { id: 'qf-1', home: 'ESP', away: 'NED', pick: null },
    { id: 'qf-2', home: 'BRA', away: 'POR', pick: null },
    { id: 'qf-3', home: 'NED', away: 'ARG', pick: null },
  ]);
  const [sf, setSf] = React.useState([
    { id: 'sf-0', home: 'ARG', away: 'NED', pick: null },
    { id: 'sf-1', home: 'BRA', away: 'NED', pick: null },
  ]);
  const [final, setFinal] = React.useState({ id: 'final', home: 'ARG', away: 'BRA', pick: null });
  const [champion, setChampion] = React.useState(null);

  // Group pick logic — only one team per rank slot
  const setGroupPick = (group, team, rank) => {
    setGroups((g) => {
      const next = { ...g[group] };
      // Toggle off if already picked
      if (next[team] === rank) {
        next[team] = null;
        return { ...g, [group]: next };
      }
      // Clear any existing holder of this rank
      Object.keys(next).forEach((t) => {
        if (next[t] === rank) next[t] = null;
      });
      next[team] = rank;
      return { ...g, [group]: next };
    });
  };

  const setKnockoutPick = (stage, id, team) => {
    const setters = { r32: setR32, r16: setR16, qf: setQf, sf: setSf };
    setters[stage]((rows) => rows.map(r => r.id === id ? { ...r, pick: r.pick === team ? null : team } : r));
  };

  const setFinalPick = (team) => setFinal((f) => ({ ...f, pick: f.pick === team ? null : team }));

  // Auto-pick favourites — fills every pick with the higher-odds team
  const autoFill = () => {
    setGroups(() => {
      const out = {};
      GROUP_LETTERS.forEach((g) => {
        const sorted = [...SAMPLE_GROUPS[g].teams].sort((a, b) => b[1] - a[1]);
        out[g] = {};
        sorted.forEach(([c], i) => { out[g][c] = i < 3 ? i + 1 : null; });
      });
      return out;
    });
    setR32((rs) => rs.map(r => ({ ...r, pick: r.home })));
    setR16((rs) => rs.map(r => ({ ...r, pick: r.home })));
    setQf((rs) => rs.map(r => ({ ...r, pick: r.home })));
    setSf((rs) => rs.map(r => ({ ...r, pick: r.home })));
    setFinal((f) => ({ ...f, pick: 'ARG' }));
    setChampion('ARG');
  };

  const reset = () => {
    setGroups(initGroups());
    setR32(SAMPLE_R32);
    setR16(SAMPLE_R16_DEFAULT);
    setQf((q) => q.map(r => ({ ...r, pick: null })));
    setSf((s) => s.map(r => ({ ...r, pick: null })));
    setFinal((f) => ({ ...f, pick: null }));
    setChampion(null);
  };

  // Picks count per stage
  const counts = {
    group: Object.values(groups).reduce((sum, g) => sum + Object.values(g).filter(v => v !== null).length, 0),
    r32: r32.filter(m => m.pick).length,
    r16: r16.filter(m => m.pick).length,
    qf: qf.filter(m => m.pick).length,
    sf: sf.filter(m => m.pick).length,
    final: final.pick ? 1 : 0,
    champ: champion ? 1 : 0,
  };

  return {
    groups, r32, r16, qf, sf, final, champion,
    setGroupPick, setKnockoutPick, setFinalPick, setChampion,
    autoFill, reset, counts,
  };
}

// ----- Main bracket screen --------------------------------------------

function ScreenBracket({ onNav, onLocked }) {
  const [stage, setStage] = React.useState('group');
  const [confirmLock, setConfirmLock] = React.useState(false);
  const [autofilled, setAutofilled] = React.useState(false);
  const b = useBracketState();

  const stageIdx = STAGES.findIndex(s => s.k === stage);
  const stageMeta = STAGES[stageIdx];
  const isLast = stage === 'champ';
  const nextLabel = isLast ? '🔒 Kunci bracket' : `Lanjut ke ${STAGES[stageIdx + 1].l} →`;

  const advance = () => {
    if (isLast) return setConfirmLock(true);
    setStage(STAGES[stageIdx + 1].k);
  };

  const handleAuto = () => {
    b.autoFill();
    setAutofilled(true);
    setTimeout(() => setAutofilled(false), 2200);
  };

  return (
    <MobileScreen navActive="hub" onNav={onNav}>
      {/* Header (compact, page-style) */}
      <header style={{ padding: '8px 18px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="p-eyebrow" style={{ color: 'var(--pickem-orange)' }}>BRACKET · WC 2026</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--p-live)' }}>
            🔒 4 hari
          </span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24,
          margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em',
        }}>
          Bangun bracket kamu
        </h1>
      </header>

      {/* Auto-fill / reset row */}
      <div style={{ padding: '0 18px 12px', display: 'flex', gap: 8 }}>
        <button onClick={handleAuto} style={autoBtn}>
          <span>⚡</span> Pilih semua favorit
        </button>
        <button onClick={b.reset} style={resetBtn}>Reset</button>
      </div>

      {/* Stage stepper (sticky) */}
      <div style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 14px 10px' }}>
          {STAGES.map((s, i) => {
            const sel = s.k === stage;
            const done = i < stageIdx;
            const lockedAhead = i > stageIdx + 1; // can't skip more than one forward
            return (
              <button key={s.k} onClick={() => !lockedAhead && setStage(s.k)} disabled={lockedAhead}
                aria-current={sel ? 'page' : undefined} style={stepperPill(sel, done, lockedAhead)}>
                {done && <span style={{ fontSize: 10 }}>✓</span>} {s.l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage progress */}
      <div style={{ padding: '12px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>
          {stageLabel(stage)}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: b.counts[stage] >= stageMeta.total ? 'var(--p-up)' : 'var(--ink-3)' }}>
          {b.counts[stage]} / {stageMeta.total}
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 12px' }}>
        {stage === 'group' && <BracketGroupStage groups={b.groups} setPick={b.setGroupPick} />}
        {stage === 'r32'   && <BracketKnockoutStage label="R32" stage="r32" matches={b.r32} setPick={b.setKnockoutPick} />}
        {stage === 'r16'   && <BracketKnockoutStage label="R16" stage="r16" matches={b.r16} setPick={b.setKnockoutPick} />}
        {stage === 'qf'    && <BracketKnockoutStage label="QF"  stage="qf"  matches={b.qf}  setPick={b.setKnockoutPick} />}
        {stage === 'sf'    && <BracketKnockoutStage label="SF"  stage="sf"  matches={b.sf}  setPick={b.setKnockoutPick} />}
        {stage === 'final' && <BracketFinalStage match={b.final} setPick={b.setFinalPick} />}
        {stage === 'champ' && <BracketChampion team={b.champion || b.final.pick || 'ARG'} onCrown={(t) => b.setChampion(t)} />}
      </div>

      {/* Persistent mini-bracket strip + advance CTA */}
      <div style={{ borderTop: '1px solid var(--line-1)', background: 'var(--bg-raised)', flexShrink: 0 }}>
        <BracketMiniStrip champion={b.champion || b.final.pick} totalPicks={Object.values(b.counts).reduce((a, x) => a + x, 0)} />
        <div style={{ padding: '8px 18px 14px' }}>
          <PickemBtn full size="lg" onClick={advance} disabled={b.counts[stage] < stageMeta.total}>
            {nextLabel}
          </PickemBtn>
        </div>
      </div>

      {/* Auto-fill confirmation toast */}
      {autofilled && (
        <div style={{
          position: 'absolute', top: 64, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', zIndex: 200, pointerEvents: 'none',
        }}>
          <Toast tone="success" visible icon={<CheckIcon size={14} />}>
            Bracket diisi pakai favorit. Edit yang nggak setuju.
          </Toast>
        </div>
      )}

      {/* Lock confirmation modal */}
      {confirmLock && (
        <BracketLockConfirm
          champion={b.champion || b.final.pick}
          onCancel={() => setConfirmLock(false)}
          onConfirm={() => { setConfirmLock(false); onLocked?.(); }}
        />
      )}
    </MobileScreen>
  );
}

function stageLabel(s) {
  return ({
    group: 'Standings Grup',
    r32: 'Babak 32 Besar',
    r16: 'Babak 16 Besar',
    qf: 'Perempat Final',
    sf: 'Semi Final',
    final: 'Final',
    champ: 'Juara Dunia 2026',
  })[s];
}

const stepperPill = (sel, done, locked) => ({
  appearance: 'none', cursor: locked ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
  padding: '8px 12px', borderRadius: 999,
  background: sel ? 'var(--pickem-orange)' : 'transparent',
  color: sel ? '#0A1628' : locked ? 'var(--ink-4)' : done ? 'var(--p-up)' : 'var(--ink-3)',
  border: '1px solid ' + (sel ? 'var(--pickem-orange)' : done ? 'color-mix(in oklab, var(--p-up) 30%, transparent)' : 'var(--line-2)'),
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
  opacity: locked ? 0.4 : 1,
  display: 'inline-flex', alignItems: 'center', gap: 4,
});

const autoBtn = {
  appearance: 'none', cursor: 'pointer',
  flex: 1, padding: '12px 14px', minHeight: 44,
  background: 'var(--pickem-orange)', color: '#0A1628',
  border: 'none', borderRadius: 999,
  fontFamily: 'var(--font-ui-pickem)', fontSize: 14, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
const resetBtn = {
  appearance: 'none', cursor: 'pointer',
  padding: '12px 18px', minHeight: 44,
  background: 'transparent', color: 'var(--ink-2)',
  border: '1px solid var(--line-2)', borderRadius: 999,
  fontFamily: 'var(--font-ui-pickem)', fontSize: 14, fontWeight: 600,
};

// ----- Group stage ----------------------------------------------------

function BracketGroupStage({ groups, setPick }) {
  const [active, setActive] = React.useState('A');
  const activeGroup = SAMPLE_GROUPS[active];
  const picks = groups[active];
  const activeIdx = GROUP_LETTERS.indexOf(active);

  return (
    <>
      {/* Pager — group letter pills + arrows */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 0 14px', position: 'sticky', top: 0, zIndex: 1,
        background: 'var(--bg-base)',
      }}>
        <button aria-label="Grup sebelumnya" onClick={() => setActive(GROUP_LETTERS[Math.max(0, activeIdx - 1)])} style={pagerBtn} disabled={activeIdx === 0}>
          <BackIcon size={16} />
        </button>
        <div style={{ flex: 1, display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {GROUP_LETTERS.map((g) => {
            const sel = g === active;
            const done = Object.values(groups[g]).filter(v => v !== null).length === 3;
            return (
              <button key={g} onClick={() => setActive(g)} style={{
                appearance: 'none', cursor: 'pointer',
                minWidth: 36, height: 36, borderRadius: 8,
                background: sel ? 'var(--pickem-orange)' : 'var(--bg-raised)',
                color: sel ? '#0A1628' : done ? 'var(--p-up)' : 'var(--ink-2)',
                border: '1px solid ' + (sel ? 'var(--pickem-orange)' : done ? 'color-mix(in oklab, var(--p-up) 30%, transparent)' : 'var(--line-2)'),
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}>{done && <span style={{ fontSize: 9 }}>✓</span>}{g}</button>
            );
          })}
        </div>
        <button aria-label="Grup berikutnya" onClick={() => setActive(GROUP_LETTERS[Math.min(11, activeIdx + 1)])} style={pagerBtn} disabled={activeIdx === 11}>
          <BackIcon size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>

      {/* Group card */}
      <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>Grup {active}</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)' }}>Pilih urutan</span>
        </div>
        {activeGroup.teams.map(([code, odds]) => (
          <BracketGroupRow key={code} code={code} odds={odds} rank={picks[code]} onSet={(r) => setPick(active, code, r)} />
        ))}
      </div>

      <div style={{ marginTop: 14, padding: 14, background: 'var(--p-info-wash)', borderRadius: 10, border: '1px solid color-mix(in oklab, var(--p-info) 30%, transparent)' }}>
        <div className="p-bodysm" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          <strong>Juara grup + runner-up</strong> langsung lolos. <strong>4 grup terbaik #3</strong> menyusul. Otomatis dihitung dari pilihan kamu.
        </div>
      </div>
    </>
  );
}

const pagerBtn = {
  appearance: 'none', cursor: 'pointer',
  minWidth: 36, minHeight: 36, width: 36, height: 36,
  borderRadius: 8, background: 'transparent', color: 'var(--ink-2)',
  border: '1px solid var(--line-2)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

function BracketGroupRow({ code, odds, rank, onSet }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--line-1)', gap: 10, minHeight: 64 }}>
      <Flag team={code} w={32} h={22} round={3} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{TEAMS[code].name}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
          Peluang lolos {odds}%
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3].map((r) => {
          const sel = rank === r;
          return (
            <button key={r} onClick={() => onSet(r)} aria-label={`Pilih sebagai peringkat ${r}`} style={{
              width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
              background: sel ? 'var(--pickem-orange)' : 'var(--bg-base)',
              color: sel ? '#0A1628' : 'var(--ink-2)',
              border: '1px solid ' + (sel ? 'var(--pickem-orange)' : 'var(--line-2)'),
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
              transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
            }}>{r}</button>
          );
        })}
      </div>
    </div>
  );
}

// ----- Knockout stage -------------------------------------------------

function BracketKnockoutStage({ label, stage, matches, setPick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
      {matches.map((m, i) => (
        <BracketMatch key={m.id} match={m} label={label} idx={i + 1} onPick={(team) => setPick(stage, m.id, team)} />
      ))}
    </div>
  );
}

function BracketMatch({ match, label, idx, onPick }) {
  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: '1px solid var(--line-1)', borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-1)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.10em' }}>{label} · {idx}</span>
        {match.pick && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--p-up)', letterSpacing: '0.08em' }}>✓ LOLOS</span>}
      </div>
      <BracketPickRow team={match.home} selected={match.pick === match.home} onPick={() => onPick(match.home)} />
      <BracketPickRow team={match.away} selected={match.pick === match.away} onPick={() => onPick(match.away)} last />
    </div>
  );
}

function BracketPickRow({ team, selected, onPick, last }) {
  const t = TEAMS[team];
  return (
    <button onClick={onPick} aria-pressed={selected} style={{
      width: '100%', appearance: 'none', cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px',
      background: selected ? 'var(--pickem-orange-wash)' : 'transparent',
      border: 'none',
      borderBottom: last ? 'none' : '1px solid var(--line-1)',
      borderLeft: selected ? '3px solid var(--pickem-orange)' : '3px solid transparent',
      color: 'var(--ink-1)',
      fontFamily: 'var(--font-ui-pickem)',
      minHeight: 52,
      transition: 'all 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
    }}>
      <Flag team={team} w={28} h={20} round={3} />
      <span style={{ flex: 1, fontSize: 14, fontWeight: selected ? 700 : 500, color: selected ? 'var(--pickem-orange)' : 'var(--ink-1)' }}>{t.name}</span>
      {selected && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--pickem-orange)', letterSpacing: '0.06em' }}>→</span>}
    </button>
  );
}

// ----- Final stage (solo, ceremonial) --------------------------------

function BracketFinalStage({ match, setPick }) {
  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--pickem-orange-soft)',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.06)',
      }}>
        <div style={{
          padding: '14px 16px', textAlign: 'center',
          background: 'rgba(245, 158, 11, 0.08)',
          borderBottom: '1px solid var(--pickem-orange-soft)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--pickem-orange)', letterSpacing: '0.12em', marginBottom: 4 }}>
            🏆 FINAL · MARACANÃ · MINGGU 19 JULI
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink-1)' }}>
            Siapa juaranya?
          </div>
        </div>
        <BracketFinalRow team={match.home} selected={match.pick === match.home} onPick={() => setPick(match.home)} />
        <div style={{ textAlign: 'center', padding: '6px 0', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)' }}>vs</div>
        <BracketFinalRow team={match.away} selected={match.pick === match.away} onPick={() => setPick(match.away)} />
      </div>

      <div style={{ marginTop: 14, padding: 14, background: 'var(--pickem-orange-wash)', borderRadius: 10, border: '1px solid var(--pickem-orange-soft)' }}>
        <div className="p-bodysm" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          <strong style={{ color: 'var(--pickem-orange)' }}>Bonus juara:</strong> +50 poin kalau tebakan kamu jadi juara. Tinggal pilih sekali lagi.
        </div>
      </div>
    </div>
  );
}

function BracketFinalRow({ team, selected, onPick }) {
  const t = TEAMS[team];
  return (
    <button onClick={onPick} aria-pressed={selected} style={{
      width: '100%', appearance: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '20px 18px', minHeight: 84,
      background: selected ? 'var(--pickem-orange)' : 'transparent',
      color: selected ? '#0A1628' : 'var(--ink-1)',
      border: 'none', textAlign: 'left',
      transition: 'all 200ms cubic-bezier(0.2, 0.7, 0.3, 1)',
    }}>
      <Flag team={team} w={56} h={40} round={6} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em' }}>
          {t.name}
        </div>
        {selected && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, marginTop: 2, letterSpacing: '0.08em' }}>JUARAMU</div>}
      </div>
      {selected && <span style={{ fontSize: 28 }}>🏆</span>}
    </button>
  );
}

// ----- Champion stage -------------------------------------------------

function BracketChampion({ team, onCrown }) {
  // Mount: persist the champion when stage opens
  React.useEffect(() => { if (team && onCrown) onCrown(team); }, [team]);
  const t = TEAMS[team];
  return (
    <div style={{
      padding: '32px 24px 28px', textAlign: 'center', marginTop: 4,
      background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.14) 0%, var(--bg-raised) 70%)',
      borderRadius: 18, border: '1px solid var(--pickem-orange-soft)',
      boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.06)',
    }}>
      <div style={{ fontSize: 56, marginBottom: 8, filter: 'drop-shadow(0 6px 18px rgba(245, 158, 11, 0.4))' }}>🏆</div>
      <div className="p-eyebrow" style={{ color: 'var(--pickem-orange)', marginBottom: 12, fontSize: 11 }}>JUARA DUNIA 2026 · MENURUT KAMU</div>
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
        <Flag team={team} w={88} h={62} round={8} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 12, letterSpacing: '-0.025em', lineHeight: 1 }}>
        {t.name}
      </div>
      <div className="p-bodysm" style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 22, padding: '0 8px', lineHeight: 1.55 }}>
        Bracket kamu lengkap. Kunci sekarang dan nggak bisa diubah lagi sampai turnamen selesai.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 16, borderTop: '1px solid var(--line-1)' }}>
        <div>
          <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>POTENSI POIN</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--pickem-orange)' }}>+285</div>
        </div>
        <div style={{ width: 1, height: 32, background: 'var(--line-2)' }} />
        <div>
          <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>RANK BERPOTENSI</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--ink-1)' }}>#34</div>
        </div>
      </div>
    </div>
  );
}

// ----- Persistent mini-strip at the bottom ---------------------------

function BracketMiniStrip({ champion, totalPicks }) {
  return (
    <div style={{
      padding: '10px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      borderBottom: '1px solid var(--line-1)',
    }}>
      <div>
        <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>BRACKET KAMU</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>
          {totalPicks > 0 ? (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{totalPicks}</span>
              <span style={{ color: 'var(--ink-3)' }}> / 68 pilihan</span>
            </>
          ) : (
            <span style={{ color: 'var(--ink-3)' }}>Belum ada pilihan</span>
          )}
        </div>
      </div>
      {champion ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏆</span>
          <Flag team={champion} w={28} h={20} round={3} />
          <div style={{ textAlign: 'right' }}>
            <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 1 }}>JUARAMU</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--pickem-orange)' }}>{TEAMS[champion].short}</div>
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          PILIH SAMPAI JUARA →
        </div>
      )}
    </div>
  );
}

// ----- Lock confirmation modal ---------------------------------------

function BracketLockConfirm({ champion, onCancel, onConfirm }) {
  return (
    <div data-theme="dark" style={{
      position: 'absolute', inset: 0,
      background: 'rgba(6, 16, 29, 0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 22, fontFamily: 'var(--font-ui-pickem)',
    }}>
      <div role="dialog" aria-modal="true" style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--line-1)', borderRadius: 18,
        padding: '22px 22px 18px', maxWidth: 340, width: '100%',
        textAlign: 'center', color: 'var(--ink-1)',
      }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>🔒</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, lineHeight: 1.15, marginBottom: 8, letterSpacing: '-0.015em' }}>
          Kunci bracket?
        </div>
        <div className="p-bodysm" style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
          Setelah dikunci, bracket nggak bisa diubah lagi sampai final WC 2026 selesai. Kamu masih bisa main mode lain (matchday, jagoan, survivor).
        </div>
        {champion && (
          <div style={{
            padding: '12px 14px', background: 'var(--bg-base)',
            border: '1px solid var(--line-1)', borderRadius: 10,
            marginBottom: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <Flag team={champion} w={32} h={22} round={3} />
            <div style={{ textAlign: 'left' }}>
              <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 1 }}>JUARAMU</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--pickem-orange)' }}>{TEAMS[champion].name}</div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PickemBtn full size="lg" variant="primary" onClick={onConfirm}>🔒 Kunci bracket</PickemBtn>
          <PickemBtn full size="md" variant="ghost" onClick={onCancel}>Nanti aja</PickemBtn>
        </div>
      </div>
    </div>
  );
}

// ----- Desktop bracket (full tree, visual only) ----------------------

function DesktopBracketView() {
  return (
    <div data-theme="dark" style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: 'var(--bg-base)',
      display: 'grid', gridTemplateColumns: '220px 1fr',
      fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)',
    }}>
      <SideNav active="bracket" onChange={() => {}} />
      <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '24px 32px 18px', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
          <div className="p-eyebrow" style={{ marginBottom: 6 }}>BRACKET · WC 2026</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 32, margin: 0, letterSpacing: '-0.02em' }}>
              Bangun bracket kamu
            </h1>
            <div style={{ display: 'flex', gap: 10 }}>
              <PickemBtn variant="secondary">⚡ Pilih semua favorit</PickemBtn>
              <PickemBtn variant="primary">🔒 Kunci bracket</PickemBtn>
            </div>
          </div>
        </header>

        <div style={{
          flex: 1, overflow: 'auto', padding: 32,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto repeat(4, 1fr)', gap: 12, alignItems: 'center',
        }}>
          <BracketColumn label="R16" matches={SAMPLE_R16_DEFAULT.slice(0, 4).map(m => ({ ...m, pick: m.home }))} />
          <BracketColumn label="QF" matches={[
            { id: 'qf1', home: 'ARG', away: 'FRA', pick: 'ARG' },
            { id: 'qf2', home: 'BRA', away: 'JPN', pick: 'BRA' },
          ]} compact />
          <BracketColumn label="SF" matches={[{ id: 'sf1', home: 'ARG', away: 'BRA', pick: 'ARG' }]} compact />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="p-eyebrow" style={{ marginBottom: 8 }}>FINAL</div>
            <DesktopFinalCard home="ARG" away="ESP" pick="ARG" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
            <div style={{ fontSize: 36 }}>🏆</div>
            <div className="p-eyebrow" style={{ marginTop: 4, color: 'var(--pickem-orange)' }}>JUARA</div>
            <Flag team="ARG" w={48} h={34} round={4} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginTop: 6 }}>Argentina</div>
          </div>
          <BracketColumn label="SF" matches={[{ id: 'sf2', home: 'ESP', away: 'ENG', pick: 'ESP' }]} compact />
          <BracketColumn label="QF" matches={[
            { id: 'qf3', home: 'ESP', away: 'NED', pick: 'ESP' },
            { id: 'qf4', home: 'ENG', away: 'GER', pick: 'ENG' },
          ]} compact />
          <BracketColumn label="R16" matches={SAMPLE_R16_DEFAULT.slice(4).map(m => ({ ...m, pick: m.home }))} />
        </div>
      </main>
    </div>
  );
}

function BracketColumn({ label, matches, compact }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 14 : 10 }}>
      <div className="p-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      {matches.map((m) => (
        <BracketMatchCompact key={m.id} match={m} />
      ))}
    </div>
  );
}

function BracketMatchCompact({ match }) {
  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: '1px solid var(--line-1)',
      borderRadius: 8, overflow: 'hidden', minWidth: 110,
    }}>
      {[match.home, match.away].map((t, i) => {
        const sel = match.pick === t;
        return (
          <div key={t} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 8px',
            borderBottom: i === 0 ? '1px solid var(--line-1)' : 'none',
            background: sel ? 'var(--pickem-orange-wash)' : 'transparent',
            borderLeft: sel ? '2px solid var(--pickem-orange)' : '2px solid transparent',
          }}>
            <Flag team={t} w={18} h={13} round={2} />
            <span style={{ fontSize: 11, fontWeight: sel ? 700 : 500, color: sel ? 'var(--pickem-orange)' : 'var(--ink-2)' }}>{TEAMS[t].short}</span>
          </div>
        );
      })}
    </div>
  );
}

function DesktopFinalCard({ home, away, pick }) {
  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: '1px solid var(--pickem-orange-soft)',
      borderRadius: 10, overflow: 'hidden', minWidth: 160,
      boxShadow: '0 0 0 4px rgba(245,158,11,0.08)',
    }}>
      {[home, away].map((t, i) => {
        const sel = pick === t;
        return (
          <div key={t} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px',
            borderBottom: i === 0 ? '1px solid var(--line-1)' : 'none',
            background: sel ? 'var(--pickem-orange-wash)' : 'transparent',
            borderLeft: sel ? '3px solid var(--pickem-orange)' : '3px solid transparent',
          }}>
            <Flag team={t} w={24} h={17} round={3} />
            <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? 'var(--pickem-orange)' : 'var(--ink-2)' }}>{TEAMS[t].name}</span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  ScreenBracket, BracketGroupStage, BracketKnockoutStage, BracketFinalStage,
  BracketChampion, BracketLockConfirm, BracketMiniStrip,
  DesktopBracketView,
});
