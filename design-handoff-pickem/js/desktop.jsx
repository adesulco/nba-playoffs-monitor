// =====================================================================
// Gibol Pick'em — Desktop reflow (1280 wide)
// =====================================================================
// Same components, reflowed. Side nav + content + right rail.
// =====================================================================

function DesktopPredicting() {
  const [tab, setTab] = React.useState('today');
  return (
    <div data-theme="dark" style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: 'var(--bg-base)', display: 'grid', gridTemplateColumns: '220px 1fr 320px',
      fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)',
    }}>
      <SideNav active="predict" onChange={() => {}} />

      <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '24px 32px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div className="p-eyebrow" style={{ marginBottom: 6 }}>JUMAT · 12 JUNI 2026 · PEKAN 1</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 36, margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                5 laga, <span style={{ color: 'var(--ink-3)' }}>2 jam buat ngunci</span>
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="p-eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>PROGRES</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--pickem-orange)' }}>3 / 5</div>
              </div>
              <div style={{ width: 100, height: 4, borderRadius: 2, background: 'var(--bg-deep)', overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '100%', background: 'var(--pickem-orange)' }} />
              </div>
              <LockCountdown value="02:14:08" urgent />
            </div>
          </div>
        </header>

        <Tabs tabs={[
          { k: 'today', l: 'Hari ini', count: 5 },
          { k: 'tomorrow', l: 'Besok', count: 3 },
          { k: 'week', l: 'Pekan ini', count: 12 },
          { k: 'all', l: 'Semua' },
        ]} active={tab} onChange={setTab} />

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 32px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {SAMPLE_FIXTURES.map((f) => (
              <FixtureCard key={f.id} data={f} />
            ))}
          </div>
        </div>
      </main>

      <aside style={{
        background: 'var(--bg-raised)', borderLeft: '1px solid var(--line-1)',
        padding: '24px 18px', overflow: 'auto',
      }}>
        <div className="p-eyebrow" style={{ marginBottom: 10 }}>POSISI KAMU</div>
        <div style={{
          padding: 16, background: 'var(--bg-elev)',
          border: '1px solid var(--line-1)', borderRadius: 12,
          marginBottom: 22,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>#412</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--p-up)' }}>▲ 38</span>
          </div>
          <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-1)' }}>1,284</span> poin · Global
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <StreakFlame days={7} />
            <span className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11 }}>Streak harian</span>
          </div>
        </div>

        <div className="p-eyebrow" style={{ marginBottom: 10 }}>GRUP KAMU</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          {GRUPS.slice(0, 2).map((g) => <GrupCard key={g.id} grup={g} />)}
        </div>

        <div className="p-eyebrow" style={{ marginBottom: 10 }}>JAGOAN HARI INI</div>
        <div style={{
          padding: 14, background: 'var(--pickem-orange-wash)',
          border: '1px solid var(--pickem-orange-soft)', borderRadius: 10,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--pickem-orange)' }}>
            Belum dipilih
          </div>
          <p className="p-bodysm" style={{ color: 'var(--ink-2)', fontSize: 12, marginTop: 4, marginBottom: 0 }}>
            1 jagoan / hari. Poin <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>×2</span>.
          </p>
        </div>
      </aside>
    </div>
  );
}

function DesktopLeaderboard() {
  const [board, setBoard] = React.useState('global');
  return (
    <div data-theme="dark" style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: 'var(--bg-base)', display: 'grid', gridTemplateColumns: '220px 1fr',
      fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)',
    }}>
      <SideNav active="board" onChange={() => {}} />
      <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '24px 32px 18px', flexShrink: 0 }}>
          <div className="p-eyebrow" style={{ marginBottom: 6 }}>PAPAN PERINGKAT</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 32, margin: 0, letterSpacing: '-0.02em' }}>
              Posisi <span style={{ color: 'var(--ink-3)' }}>kamu</span>
            </h1>
            <SegmentedPicker
              items={[
                { k: 'global',    l: 'Global · 38,402 fan' },
                { k: 'grup',      l: 'Grup' },
                { k: 'matchday',  l: 'Pekan ini' },
              ]}
              active={board} onChange={setBoard}
            />
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 32px 32px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 14,
            alignItems: 'end', marginBottom: 18,
          }}>
            <PodiumCard place={2} row={LEADERBOARD_ROWS[1]} />
            <PodiumCard place={1} row={LEADERBOARD_ROWS[0]} tall />
            <PodiumCard place={3} row={LEADERBOARD_ROWS[2]} />
          </div>

          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '52px 1fr auto', alignItems: 'center', borderBottom: '1px solid var(--line-1)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              <span>RANK</span><span>NAMA</span><span>POIN</span>
            </div>
            {LEADERBOARD_ROWS.slice(3).map((r) => <LeaderboardRow key={r.rank} row={r} />)}
            <LeaderboardRow row={YOUR_GLOBAL} you />
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { DesktopPredicting, DesktopLeaderboard });
