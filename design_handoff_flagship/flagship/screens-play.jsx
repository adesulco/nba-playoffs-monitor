// =====================================================================
// Flagship — play surfaces (Step 1 Tonight · Step 4 Tebak Skor + live board)
// + the second game type: Bracket Lock (standings → knockout).
// Copy: English first, Indonesian second (CLAUDE.md rule).
// =====================================================================

// ---- 1. Tonight — the first-touch surface (Step 1) -------------------
// Default tab for every member. Bracket & 12-group ranking live behind tabs.

function FPlayTabs({ active = 'malam' }) {
  const tabs = [
    { k: 'malam', l: 'Tonight', badge: 3 },
    { k: 'fase',  l: 'Bracket' },
    { k: 'sur',   l: 'Survivor' },
    { k: 'rules', l: 'Rules' },
  ];
  return (
    <div role="tablist" style={{ display: 'flex', gap: 18, padding: '0 18px', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
      {tabs.map((t) => {
        const sel = active === t.k;
        return (
          <button key={t.k} role="tab" aria-selected={sel} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative',
            padding: '11px 0 12px', fontFamily: 'var(--font-ui-pickem)', fontSize: 14,
            fontWeight: sel ? 800 : 500, color: sel ? 'var(--ink-1)' : 'var(--ink-3)', whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            {t.l}
            {t.badge && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, background: 'var(--pickem-orange)', color: '#fff', borderRadius: 999, padding: '1.5px 6px' }}>{t.badge}</span>}
            {sel && <span style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2.5, background: 'var(--pickem-orange)', borderRadius: 2 }} />}
          </button>
        );
      })}
    </div>
  );
}

function ScreenMalamIni({ picks: picksProp, onPick, interactive, cta }) {
  const [picks, setPicks] = React.useState(picksProp || { m1: '1' });
  const set = (id, v) => { setPicks((p) => ({ ...p, [id]: v })); onPick?.(id, v); };
  const n = Object.values(picks).filter(Boolean).length;

  return (
    <FShell navActive="tebak"
      topbar={<FTopBar right={<FNavChip active>Tongkrongan FC ▾</FNavChip>} border={false} />}
      cta={<FStickyCTA label={`Lock Picks (${n})`} sub="Locks per match at kickoff — edit anytime before that" />}
    >
      <FPlayTabs active="malam" />
      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, padding: '0 2px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: '-0.015em' }}>
            3 matches tonight
          </h2>
          <span className="p-eyebrow" style={{ fontSize: 10 }}>Thu · Jun 11</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TONIGHT.map((fx) => (
            <FixtureTapCard key={fx.id} fx={fx} value={picks[fx.id] || null} onPick={(v) => set(fx.id, v)} />
          ))}
        </div>
      </div>
    </FShell>
  );
}

// ---- 2. Tebak Skor variant (Step 4) — THE Indonesian mechanic ----------------

function ScreenTebakSkor() {
  const [picks, setPicks] = React.useState({ m1: '1', m2: '1' });
  const [skors, setSkors] = React.useState({ m1: { h: 2, a: 1 }, m2: { h: 1, a: 0 } });
  const n = Object.values(picks).filter(Boolean).length;
  return (
    <FShell navActive="tebak"
      topbar={<FTopBar right={<FNavChip active>Tongkrongan FC ▾</FNavChip>} border={false} />}
      cta={<FStickyCTA label={`Lock Picks (${n})`} sub="Exact score +5 · right margin +3 · right result +2" />}
    >
      <FPlayTabs active="malam" />
      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 2px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: '-0.015em', flex: 1 }}>
            3 matches tonight
          </h2>
          <FPill tone="info">Format: Tebak Skor</FPill>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FixtureTapCard fx={TONIGHT[0]} value={picks.m1} onPick={(v) => setPicks((p) => ({ ...p, m1: v }))}
            skorMode skor={skors.m1} onSkor={(s) => setSkors((x) => ({ ...x, m1: s }))} />
          <FixtureTapCard fx={TONIGHT[1]} value={picks.m2} onPick={(v) => setPicks((p) => ({ ...p, m2: v }))}
            skorMode skor={skors.m2} onSkor={(s) => setSkors((x) => ({ ...x, m2: s }))} />
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '12px 4px 0', lineHeight: 1.5 }}>
          Your commissioner chose the <strong>Tebak Skor</strong> (exact score) format — the same game your WA group already plays, scored automatically.
        </p>
      </div>
    </FShell>
  );
}

// ---- 3. Bracket Lock — the second game type (PlayoffPickems-style) ---------------
// Lock group standings 1–4 up front; the knockout bracket derives from them.

function StandingsRow({ team, pos, qualifies, onTap }) {
  const t = TEAMS[team];
  return (
    <button onClick={onTap} style={{
      appearance: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '6px 10px',
      borderRadius: 10, boxSizing: 'border-box', border: '1px solid var(--line-1)',
      background: 'var(--bg-raised)', fontFamily: 'var(--font-ui-pickem)',
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
        background: qualifies ? 'var(--p-up-wash)' : 'var(--bg-deep)',
        color: qualifies ? 'var(--p-up)' : 'var(--ink-3)',
      }}>{pos}</span>
      <Flag team={team} w={28} h={20} round={4} />
      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: 'var(--ink-1)' }}>{t.name}</span>
      <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 2, color: 'var(--ink-4)' }}>
        <svg width="12" height="7" viewBox="0 0 12 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 6l5-5 5 5" /></svg>
        <svg width="12" height="7" viewBox="0 0 12 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l5 5 5-5" /></svg>
      </span>
    </button>
  );
}

function ScreenBracketLock() {
  const [order, setOrder] = React.useState(['BRA', 'MAR', 'SCO', 'HAI']);
  const bump = (i) => {
    if (i === 0) return;
    setOrder((o) => { const n = [...o]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; });
  };
  return (
    <FShell navActive="tebak"
      topbar={<FTopBar right={<FNavChip active>Tongkrongan FC ▾</FNavChip>} border={false} />}
      cta={<FStickyCTA label="Lock Group C (4 pts)" sub="Perfect group order = +8 bonus · locks when the stage starts" />}
    >
      <FPlayTabs active="fase" />
      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, padding: '0 2px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: '-0.015em', flex: 1 }}>
            Lock your standings
          </h2>
          <FPill tone="info">Bracket Lock</FPill>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '0 2px 12px', lineHeight: 1.5 }}>
          Order each group 1–4 before the stage starts — your knockout bracket fills itself from these calls.
        </p>

        {/* Group switcher */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflow: 'hidden' }}>
          {['A', 'B', 'C', 'D', 'E', 'F'].map((g) => (
            <span key={g} style={{
              width: 34, height: 34, borderRadius: 999, flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700,
              background: g === 'C' ? 'var(--ink-1)' : 'var(--bg-raised)',
              color: g === 'C' ? '#fff' : (g < 'C' ? 'var(--p-up)' : 'var(--ink-3)'),
              border: '1px solid ' + (g === 'C' ? 'var(--ink-1)' : 'var(--line-2)'),
            }}>{g < 'C' ? '✓' : g}</span>
          ))}
          <span style={{ alignSelf: 'center', marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)' }}>2/12 locked</span>
        </div>

        <FCard pad={12}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span className="p-eyebrow" style={{ fontSize: 10 }}>Group C · tap arrows to reorder</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--p-up)' }}>top 2 advance</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {order.map((team, i) => (
              <StandingsRow key={team} team={team} pos={i + 1} qualifies={i < 2} onTap={() => bump(i)} />
            ))}
          </div>
        </FCard>

        <FCard pad={12} style={{ marginTop: 10, background: 'var(--bg-deep)', border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Knockout fills from these</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>R32 10 → R16 12 → QF 15 → SF 20 → Final 30 pts</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pickem-orange)', whiteSpace: 'nowrap' }}>Preview ›</span>
          </div>
        </FCard>
      </div>
    </FShell>
  );
}

// ---- 4. Live provisional leaderboard (Step 4) — the moat ---------------------

function ScreenLiveBoard() {
  const rows = [
    { rank: 1, name: 'Budi',  points: 84, streak: 3, movement: 0,  prov: 0 },
    { rank: 2, name: 'You',   points: 78, movement: 1, you: true,  prov: 10 },
    { rank: 3, name: 'Sari',  points: 71, movement: -1,            prov: 10 },
    { rank: 4, name: 'Ade',   points: 69, movement: 0, crown: true, prov: 2 },
    { rank: 5, name: 'Dewi',  points: 64, movement: 2,             prov: 0 },
    { rank: 6, name: 'Rizky', points: 58, movement: 0,             prov: 10 },
    { rank: 7, name: 'Tono',  points: 51, movement: -2 },
    { rank: 8, name: 'Maya',  points: 47, movement: 0,             prov: 2 },
    { rank: 9, name: 'Joko',  points: 30, movement: 0, belum: true },
  ];
  return (
    <FShell navActive="klasemen" topbar={<FTopBar right={<FNavChip active>Tongkrongan FC ▾</FNavChip>} border={false} />}>
      <div style={{ flex: 1, overflow: 'hidden', padding: '10px 16px 0' }}>
        {/* Live match strip */}
        <FCard pad={12} style={{ borderColor: 'color-mix(in oklab, var(--p-live) 35%, transparent)', background: 'var(--p-live-wash)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flag team="JPN" w={28} h={20} round={4} />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em' }}>1 : 0</span>
            <Flag team="SWE" w={28} h={20} round={4} />
            <span style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--p-live)' }}>
              <span className="p-live-dot" />63&prime;
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>
            Your pick: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-1)' }}>JPN 2–1</span>
            <span style={{ color: 'var(--p-live)', fontWeight: 700 }}> · +10 if it stays like this</span>
          </div>
        </FCard>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '16px 2px 8px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: '-0.015em' }}>Standings</h2>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--p-live)', letterSpacing: '0.07em' }}>
            <span className="p-live-dot" style={{ width: 6, height: 6 }} />PROVISIONAL POINTS
          </span>
        </div>
        <FCard pad={0} style={{ overflow: 'hidden' }}>
          {rows.map((r) => <FBoardRow key={r.rank} row={r} live dense />)}
        </FCard>
        <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '10px 4px 0', lineHeight: 1.5 }}>
          Amber numbers = points if the score holds. Finals are written when the match ends — nothing is saved before that.
        </p>
      </div>
    </FShell>
  );
}

Object.assign(window, { FPlayTabs, ScreenMalamIni, ScreenTebakSkor, ScreenBracketLock, ScreenLiveBoard });
