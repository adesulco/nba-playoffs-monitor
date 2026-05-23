// =====================================================================
// Gibol Pick'em — Screens (Stadium Night)
// =====================================================================
// All mobile screen components. Each returns a full-bleed layout meant
// to live inside an IOSDevice or PhoneShell. Most also work standalone
// at 390×844 (the test viewport).
// =====================================================================

// ----- Sample data -----------------------------------------------------

const SAMPLE_FIXTURES = [
  { ...FIXTURE_DATA.open,   id: 'f1', kickoffTime: '21:00 WIB' },
  { ...FIXTURE_DATA.live,   id: 'f2' },
  { ...FIXTURE_DATA.locked, id: 'f3', kickoffTime: '02:00 WIB' },
  { ...FIXTURE_DATA.scored, id: 'f4' },
];

const LEADERBOARD_ROWS = [
  { rank: 1,  name: 'Bagas Kelana',   points: 1842, acc: 78, exact: 12, movement: 2 },
  { rank: 2,  name: 'Putu Wirayuda',  points: 1814, acc: 76, exact: 11, movement: 0 },
  { rank: 3,  name: 'Sari Indrawati', points: 1798, acc: 75, exact: 11, movement: -1 },
  { rank: 4,  name: 'Faiz Ramadhan',  points: 1762, acc: 74, exact: 10, movement: 3 },
  { rank: 5,  name: 'Dimas Aji',      points: 1755, acc: 73, exact: 10, movement: 1 },
  { rank: 6,  name: 'Lila Permata',   points: 1734, acc: 72, exact: 9,  movement: 0 },
  { rank: 7,  name: 'Andika Saputra', points: 1721, acc: 71, exact: 9,  movement: -2 },
];

const YOUR_GLOBAL = { rank: 412, name: 'Kamu', points: 1284, acc: 68, exact: 5, movement: 38 };

const GRUPS = [
  { id: 'g1', name: 'Anak Kantor', members: 12, rank: 3, movement: 24, initial: 'A', color: 'var(--pickem-orange-wash)', colorFg: 'var(--pickem-orange)' },
  { id: 'g2', name: 'Squad Futsal', members: 8,  rank: 1, movement: 48, initial: 'S', color: 'rgba(52,211,153,0.18)', colorFg: 'var(--p-up)' },
  { id: 'g3', name: 'Bocah Solo',   members: 6,  rank: 4, movement: -12, initial: 'B', color: 'rgba(96,165,250,0.18)', colorFg: 'var(--p-info)' },
];

const GRUP_MEMBERS = [
  { rank: 1, name: 'Faiz R.',     points: 142, acc: 78, exact: 3, movement: 0 },
  { rank: 2, name: 'Bagas K.',    points: 138, acc: 75, exact: 2, movement: 1 },
  { rank: 3, name: 'Kamu',        points: 124, acc: 68, exact: 2, movement: 2, you: true },
  { rank: 4, name: 'Lila P.',     points: 118, acc: 64, exact: 1, movement: -1 },
  { rank: 5, name: 'Sari I.',     points: 112, acc: 62, exact: 1, movement: 0 },
  { rank: 6, name: 'Dimas A.',    points: 98,  acc: 58, exact: 1, movement: -2 },
];

Object.assign(window, { SAMPLE_FIXTURES, LEADERBOARD_ROWS, YOUR_GLOBAL, GRUPS, GRUP_MEMBERS });

// ----- 1. Chrome — page header (mobile) -------------------------------

function MobileScreen({ children, withNav = true, navActive = 'predict', onNav }) {
  return (
    <div data-theme="dark" style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)',
      position: 'relative',
    }}>
      <div style={{ height: 52, flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>{children}</div>
      {withNav && <BottomNav active={navActive} onChange={onNav} />}
    </div>
  );
}

function PageHeader({ eyebrow, title, accent = 'var(--pickem-orange)' }) {
  return (
    <header style={{ padding: '8px 18px 16px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="p-eyebrow" style={{ color: accent }}>{eyebrow}</div>
        <span className="p-eyebrow" style={{ fontSize: 10 }}>JUM · 12 JUN</span>
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28,
        margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em',
      }}>{title}</h1>
    </header>
  );
}

function BackBar({ title, onBack, action }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 8px 8px 4px',
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--line-1)',
      minHeight: 52, flexShrink: 0, position: 'sticky', top: 0, zIndex: 5,
    }}>
      <button onClick={onBack} aria-label="Kembali" style={{
        appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
        color: 'var(--ink-1)', padding: 10, borderRadius: 999, minWidth: 44, minHeight: 44,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><BackIcon size={22} /></button>
      <div style={{ flex: 1, fontFamily: 'var(--font-ui-pickem)', fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', textAlign: 'center' }}>{title}</div>
      <div style={{ minWidth: 44, display: 'inline-flex', justifyContent: 'flex-end' }}>{action}</div>
    </header>
  );
}

// ----- 2. PredictingHub -----------------------------------------------

function ScreenPredictingHub({ onOpenFixture, onNav }) {
  return (
    <MobileScreen navActive="predict" onNav={onNav}>
      <PageHeader eyebrow="PREDIKSI · WC 2026" title={<>5 laga<br/><span style={{ color: 'var(--ink-3)' }}>malam ini</span></>} />
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="p-bodysm" style={{ color: 'var(--ink-2)', fontSize: 12, whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--pickem-orange)' }}>3</span>
            <span style={{ color: 'var(--ink-3)' }}> / 5 diprediksi</span>
          </span>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg-deep)', overflow: 'hidden' }}>
            <div style={{ width: '60%', height: '100%', background: 'var(--pickem-orange)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--p-live)', whiteSpace: 'nowrap' }}>
            🔒 02:14:08
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 14px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SAMPLE_FIXTURES.map((f) => (
          <FixtureCard key={f.id} data={f} onClick={() => onOpenFixture?.(f)} />
        ))}
        <button style={{
          appearance: 'none', cursor: 'pointer',
          padding: 14, marginTop: 4,
          background: 'transparent', color: 'var(--ink-3)',
          border: '1px dashed var(--line-2)', borderRadius: 12,
          fontFamily: 'var(--font-ui-pickem)', fontSize: 13, fontWeight: 600,
        }}>Lihat 1 laga lagi (Sabtu)</button>
      </div>
    </MobileScreen>
  );
}

// ----- 3. FixtureDetail (one match center) ----------------------------

function ScreenFixtureDetail({ fixture, onBack, onShare }) {
  const data = fixture || SAMPLE_FIXTURES[0];
  const home = TEAMS[data.home], away = TEAMS[data.away];
  const [tab, setTab] = React.useState('prediksi');

  return (
    <MobileScreen withNav={false}>
      <BackBar title="Pertandingan" onBack={onBack} action={
        <button onClick={onShare} aria-label="Bagikan" style={{
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--ink-1)', padding: 10, borderRadius: 999, minWidth: 44, minHeight: 44,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><ShareIcon size={20} /></button>
      } />

      {/* Hero */}
      <div style={{ padding: '20px 18px 16px', background: 'var(--bg-raised)', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div className="p-eyebrow">{data.group}</div>
          <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>{data.venue}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <Flag team={data.home} w={56} h={40} round={6} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginTop: 8 }}>{home.name}</div>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 52,
            color: data.state === 'live' ? 'var(--p-live)' : data.state === 'scored' ? 'var(--ink-1)' : 'var(--ink-4)',
            letterSpacing: '-0.02em', lineHeight: 1,
          }}>{(data.score || '– : –').replace('-', ' : ')}</div>
          <div style={{ textAlign: 'center' }}>
            <Flag team={data.away} w={56} h={40} round={6} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginTop: 8 }}>{away.name}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          {data.state === 'live' && <StatePill state="live" />}
          {data.state === 'open' && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--pickem-orange)', letterSpacing: '0.10em' }}>KICKOFF {data.kickoffTime || '21:00 WIB'}</span>}
          {data.state === 'scored' && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.10em' }}>SELESAI · FULL TIME</span>}
        </div>
      </div>

      <Tabs tabs={[
        { k: 'prediksi', l: 'Prediksi' },
        { k: 'peluang',  l: 'Peluang' },
        { k: 'h2h',      l: 'H2H' },
        { k: 'lineup',   l: 'Susunan' },
      ]} active={tab} onChange={setTab} />

      <div style={{ flex: 1, overflow: 'auto', padding: '18px' }}>
        {tab === 'prediksi' && <FixtureDetailPredict data={data} />}
        {tab === 'peluang' && (
          <div className="p-bodysm" style={{ color: 'var(--ink-3)', textAlign: 'center', padding: 32 }}>Peluang detail & xG di tab Peluang.</div>
        )}
        {tab === 'h2h' && (
          <div className="p-bodysm" style={{ color: 'var(--ink-3)', textAlign: 'center', padding: 32 }}>Riwayat pertemuan 5 laga terakhir.</div>
        )}
        {tab === 'lineup' && (
          <div className="p-bodysm" style={{ color: 'var(--ink-3)', textAlign: 'center', padding: 32 }}>Susunan keluar 1 jam sebelum kickoff.</div>
        )}
      </div>
    </MobileScreen>
  );
}

function FixtureDetailPredict({ data }) {
  const [pick, setPick] = React.useState(data.pick?.outcome || '1');
  const [h, setH] = React.useState(parseInt((data.pick?.score || '2-1').split('-')[0]));
  const [a, setA] = React.useState(parseInt((data.pick?.score || '2-1').split('-')[1]));
  const [jag, setJag] = React.useState(!!data.pick?.jagoan);

  return (
    <div>
      <div className="p-eyebrow" style={{ marginBottom: 10 }}>SIAPA MENANG?</div>
      <OutcomePicker odds={data.odds} value={pick} onChange={setPick} />

      <div style={{ marginTop: 24 }}>
        <div className="p-eyebrow" style={{ marginBottom: 10 }}>SKOR PAS · BONUS +3 POIN</div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: '14px 0',
          background: 'var(--bg-raised)', borderRadius: 12,
          border: '1px solid var(--line-1)',
        }}>
          <ScoreStepper value={h} onChange={setH} size="lg" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 28, color: 'var(--ink-3)' }}>:</span>
          <ScoreStepper value={a} onChange={setA} size="lg" />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 16px', background: 'var(--bg-raised)', borderRadius: 12, border: '1px solid var(--line-1)' }}>
          <div style={{ flex: 1 }}>
            <div className="p-eyebrow" style={{ color: 'var(--pickem-orange)', marginBottom: 2 }}>JAGOAN MATCHDAY</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Poin dari laga ini × 2</div>
            <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11 }}>Cuma satu per hari. Pilih dengan bijak.</div>
          </div>
          <JagoanToggle active={jag} onClick={() => setJag(!jag)} />
        </div>
      </div>

      <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--bg-raised)', borderRadius: 12, border: '1px solid var(--line-1)' }}>
        <div className="p-eyebrow" style={{ marginBottom: 8 }}>RINGKASAN</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
          {TEAMS[data.home].name} menang <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{h}–{a}</span>
        </div>
        <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
          Potensi poin: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--p-up)' }}>+{(jag ? 12 : 6)}</span>
          {jag && <span> · Jagoan ×2 aktif</span>}
        </div>
      </div>

      <div style={{
        position: 'sticky', bottom: 0, marginTop: 24, marginBottom: -18,
        padding: '14px 0 18px', background: 'linear-gradient(to top, var(--bg-base) 60%, transparent)',
      }}>
        <PickemBtn full size="lg" icon={<CheckIcon size={16} />}>Kunci prediksi · 🔒 02:14:08</PickemBtn>
      </div>
    </div>
  );
}

// ----- 4. Leaderboard -------------------------------------------------

function ScreenLeaderboard({ onNav }) {
  const [board, setBoard] = React.useState('global');

  return (
    <MobileScreen navActive="board" onNav={onNav}>
      <PageHeader eyebrow="PAPAN PERINGKAT" title={<>Posisi <span style={{ color: 'var(--ink-3)' }}>kamu</span></>} />

      <div style={{ padding: '0 18px 14px' }}>
        <SegmentedPicker
          items={[
            { k: 'global',    l: 'Global' },
            { k: 'grup',      l: 'Grup' },
            { k: 'matchday',  l: 'Pekan ini' },
          ]}
          active={board} onChange={setBoard}
        />
      </div>

      {/* Top 3 podium */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 10,
          alignItems: 'end',
        }}>
          <PodiumCard place={2} row={LEADERBOARD_ROWS[1]} />
          <PodiumCard place={1} row={LEADERBOARD_ROWS[0]} tall />
          <PodiumCard place={3} row={LEADERBOARD_ROWS[2]} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', borderTop: '1px solid var(--line-1)', background: 'var(--bg-raised)' }}>
        {LEADERBOARD_ROWS.slice(3).map((r) => (
          <LeaderboardRow key={r.rank} row={r} />
        ))}
      </div>

      {/* Sticky "your rank" */}
      <div style={{
        background: 'var(--bg-elev)',
        borderTop: '1px solid var(--line-2)',
        flexShrink: 0,
      }}>
        <LeaderboardRow row={YOUR_GLOBAL} you />
      </div>
    </MobileScreen>
  );
}

function PodiumCard({ place, row, tall }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const heights = { 1: 110, 2: 88, 3: 80 };
  const h = tall ? heights[1] : heights[place];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{medals[place]}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-1)', textAlign: 'center', whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {row.name}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--pickem-orange)', marginTop: 2 }}>
        {row.points.toLocaleString()}
      </div>
      <div style={{
        width: '100%', height: h, marginTop: 8, borderRadius: '8px 8px 0 0',
        background: place === 1
          ? 'linear-gradient(180deg, var(--pickem-orange) 0%, var(--pickem-orange-deep) 100%)'
          : 'var(--bg-raised)',
        border: '1px solid ' + (place === 1 ? 'transparent' : 'var(--line-1)'),
        borderBottom: 'none',
        color: place === 1 ? '#0A1628' : 'var(--ink-2)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '8px 0',
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14,
      }}>#{row.rank}</div>
    </div>
  );
}

// ----- 5. Grup screens -------------------------------------------------

function ScreenGrupList({ onOpenGrup, onCreate, onJoin, onNav }) {
  return (
    <MobileScreen navActive="grup" onNav={onNav}>
      <PageHeader eyebrow="GRUP KAMU" title={<>3 grup, <span style={{ color: 'var(--ink-3)' }}>1 sepi</span></>} />

      <div style={{ padding: '0 18px 14px', display: 'flex', gap: 8 }}>
        <PickemBtn variant="primary" size="md" icon={<PlusIcon size={14} />} onClick={onCreate}>Bikin grup</PickemBtn>
        <PickemBtn variant="secondary" size="md" onClick={onJoin}>Gabung pakai kode</PickemBtn>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 14px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {GRUPS.map((g) => <GrupCard key={g.id} grup={g} onClick={() => onOpenGrup?.(g)} />)}

        {/* Empty/dormant grup teaser */}
        <div style={{
          padding: 16, background: 'var(--bg-raised)',
          border: '1px dashed var(--line-2)', borderRadius: 12,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Bikin satu lagi?</div>
          <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 10 }}>Grup keluarga, kantor, tim futsal — pisah biar nggak rame.</div>
          <PickemBtn variant="ghost" size="sm" onClick={onCreate}>Mulai grup baru</PickemBtn>
        </div>
      </div>
    </MobileScreen>
  );
}

function ScreenGrupHome({ grup, onBack, onInvite }) {
  const g = grup || GRUPS[0];
  return (
    <MobileScreen withNav={false}>
      <BackBar title={g.name} onBack={onBack} action={
        <button onClick={onInvite} aria-label="Ajak teman" style={{
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--pickem-orange)', padding: 10, minWidth: 44, minHeight: 44,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><PlusIcon size={20} /></button>
      } />

      {/* Hero */}
      <div style={{ padding: '18px 18px 18px', background: 'var(--bg-raised)', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 14,
            background: g.color, color: g.colorFg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26,
          }}>{g.initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{g.name}</div>
            <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{g.members}</span> anggota · kode <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>ANKK-2026</strong>
            </div>
          </div>
        </div>

        {/* Your position chip */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: 'var(--bg-base)', borderRadius: 10,
        }}>
          <div>
            <div className="p-eyebrow" style={{ marginBottom: 2 }}>POSISI KAMU</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--ink-1)' }}>#{g.rank}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}> dari {g.members}</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: g.movement > 0 ? 'var(--p-up)' : 'var(--p-down)' }}>{g.movement > 0 ? '+' : ''}{g.movement}</div>
            <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11 }}>pekan ini</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '14px 18px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="p-eyebrow">PAPAN PERINGKAT GRUP</div>
          <span className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>Diperbarui 2 mnt lalu</span>
        </div>
        <div style={{ background: 'var(--bg-raised)' }}>
          {GRUP_MEMBERS.map((r) => <LeaderboardRow key={r.rank} row={r} you={r.you} />)}
        </div>
      </div>
    </MobileScreen>
  );
}

function ScreenGrupEmpty({ onBack, onInvite }) {
  return (
    <MobileScreen withNav={false}>
      <BackBar title="Bocah Solo" onBack={onBack} />
      <div style={{ padding: '18px 18px 18px', background: 'var(--bg-raised)', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: 'rgba(96,165,250,0.18)', color: 'var(--p-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26 }}>B</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>Bocah Solo</div>
            <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 2 }}>1 anggota · kode <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>BCSL-9421</strong></div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <EmptyState
          icon="🪑"
          title="Grup masih sepi."
          body="Cuma kamu di sini. Ajak temenmu — minimal 3 orang biar ada yang dikalahin."
          action={
            <div style={{ marginTop: 16 }}>
              <PickemBtn variant="primary" size="lg" icon={<WhatsAppIcon size={16} />} onClick={onInvite}>Ajak via WhatsApp</PickemBtn>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-3)' }}>
                atau bagikan kode <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-1)' }}>BCSL-9421</strong>
              </div>
            </div>
          }
        />
      </div>
    </MobileScreen>
  );
}

function ScreenInviteSheet({ onClose }) {
  return (
    <div data-theme="dark" style={{
      position: 'absolute', inset: 0,
      background: 'rgba(6, 16, 29, 0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end',
      fontFamily: 'var(--font-ui-pickem)',
    }}>
      <div style={{
        width: '100%', background: 'var(--bg-raised)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '18px 18px 36px',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--ink-4)', margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 6, color: 'var(--ink-1)' }}>Ajak ke Anak Kantor</div>
        <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 18 }}>
          Mereka tinggal klik link — udah otomatis masuk grup.
        </div>

        <div style={{ padding: '14px 16px', background: 'var(--bg-base)', borderRadius: 12, border: '1px dashed var(--line-2)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="p-eyebrow" style={{ marginBottom: 2 }}>KODE GRUP</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--pickem-orange)', letterSpacing: '0.05em' }}>ANKK-2026</div>
          </div>
          <PickemBtn variant="secondary" size="sm">Salin</PickemBtn>
        </div>

        <PickemBtn full size="lg" variant="primary" icon={<WhatsAppIcon size={18} />}>Bagikan di WhatsApp</PickemBtn>
        <button onClick={onClose} style={{
          width: '100%', marginTop: 10, padding: 12,
          appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--ink-3)', fontFamily: 'var(--font-ui-pickem)', fontWeight: 600, fontSize: 14,
        }}>Tutup</button>
      </div>
    </div>
  );
}

function ScreenGrupCreate({ onBack, onCreated }) {
  return (
    <MobileScreen withNav={false}>
      <BackBar title="Grup baru" onBack={onBack} />
      <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
        <div style={{ marginBottom: 18 }}>
          <label className="p-eyebrow" style={{ display: 'block', marginBottom: 8 }}>NAMA GRUP</label>
          <input defaultValue="Anak Kantor" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label className="p-eyebrow" style={{ display: 'block', marginBottom: 8 }}>WARNA TEMA</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['var(--pickem-orange)', 'var(--p-up)', 'var(--p-info)', 'var(--p-down)', '#A78BFA'].map((c, i) => (
              <button key={i} style={{
                width: 40, height: 40, borderRadius: 10,
                background: c, border: i === 0 ? '2px solid var(--ink-1)' : '2px solid transparent',
                boxShadow: i === 0 ? '0 0 0 2px var(--pickem-orange)' : 'none',
                cursor: 'pointer',
              }} />
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label className="p-eyebrow" style={{ display: 'block', marginBottom: 8 }}>MODE YANG DIHITUNG</label>
          {[
            ['Match Predictor', 'Tebak hasil + skor pas', true],
            ['Jagoan harian', 'Multiplier ×2 untuk 1 laga', true],
            ['Upset bonus', 'Bonus untuk tebakan tak terduga', true],
            ['Bracket', 'Skor tournament bracket', false],
            ['Survivor', 'Pertahanan tim per matchday', false],
          ].map(([n, d, def], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line-1)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{n}</div>
                <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11, marginTop: 2 }}>{d}</div>
              </div>
              <Toggle on={def} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 18px 22px', borderTop: '1px solid var(--line-1)', background: 'var(--bg-raised)' }}>
        <PickemBtn full size="lg" variant="primary" onClick={onCreated}>Bikin grup → ajak teman</PickemBtn>
      </div>
    </MobileScreen>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 14px', minHeight: 48,
  background: 'var(--bg-raised)', color: 'var(--ink-1)',
  border: '1px solid var(--line-2)', borderRadius: 10,
  fontFamily: 'var(--font-ui-pickem)', fontSize: 15, fontWeight: 500,
  outline: 'none',
};

function Toggle({ on }) {
  return (
    <div role="switch" aria-checked={on} style={{
      width: 44, height: 26, borderRadius: 999,
      background: on ? 'var(--pickem-orange)' : 'var(--bg-deep)',
      position: 'relative', cursor: 'pointer',
      transition: 'background 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 22 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff',
        transition: 'left 120ms cubic-bezier(0.2, 0.7, 0.3, 1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

// ----- 6. Survivor (Fan Terakhir) ------------------------------------

function ScreenSurvivor({ onNav }) {
  return (
    <MobileScreen navActive="predict" onNav={onNav}>
      <PageHeader eyebrow="SURVIVOR · FAN TERAKHIR" title={<>Pekan ke-3<br/><span style={{ color: 'var(--ink-3)' }}>kamu masih hidup.</span></>} />

      <div style={{ padding: '0 18px 14px' }}>
        <div style={{
          padding: '14px 16px', background: 'var(--bg-raised)',
          border: '1px solid var(--line-1)', borderLeft: '3px solid var(--p-up)',
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div className="p-eyebrow" style={{ color: 'var(--p-up)', marginBottom: 2 }}>STATUS</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Hidup · 2 minggu</div>
            <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-1)' }}>14</span> / 32 fan masih jalan
            </div>
          </div>
          <span style={{ fontSize: 32 }}>💀</span>
        </div>
      </div>

      <div style={{ padding: '0 18px 14px' }}>
        <div className="p-eyebrow" style={{ marginBottom: 10 }}>PILIH SATU TIM YANG MENANG PEKAN INI</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['BRA', 'Brasil', true],
            ['FRA', 'Prancis', false],
            ['ESP', 'Spanyol', false],
            ['NED', 'Belanda', false],
          ].map(([c, n, sel]) => (
            <button key={c} style={{
              appearance: 'none', cursor: 'pointer',
              padding: 14, borderRadius: 12,
              background: sel ? 'var(--pickem-orange)' : 'var(--bg-raised)',
              color: sel ? '#0A1628' : 'var(--ink-1)',
              border: '1px solid ' + (sel ? 'var(--pickem-orange)' : 'var(--line-1)'),
              display: 'flex', alignItems: 'center', gap: 10, minHeight: 64,
              fontFamily: 'var(--font-ui-pickem)',
            }}>
              <Flag team={c} w={36} h={26} round={4} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{n}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, opacity: 0.7 }}>vs {c === 'BRA' ? 'COL' : c === 'FRA' ? 'ENG' : c === 'ESP' ? 'GER' : 'POR'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 18px 14px' }}>
        <div className="p-eyebrow" style={{ marginBottom: 8 }}>SUDAH KAMU PAKAI</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['ARG', 'ITA'].map((c) => (
            <div key={c} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 10px 6px 6px',
              background: 'var(--bg-deep)', borderRadius: 999,
              opacity: 0.6,
            }}>
              <Flag team={c} w={20} h={14} round={2} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{TEAMS[c].name}</span>
            </div>
          ))}
        </div>
        <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>Tim yang udah dipakai, nggak bisa dipakai lagi.</div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: '14px 18px 0', borderTop: '1px solid var(--line-1)', background: 'var(--bg-raised)' }}>
        <PickemBtn full size="lg">Pilih Brasil · 🔒 02:14:08</PickemBtn>
      </div>
    </MobileScreen>
  );
}

// ----- 7. Profile -----------------------------------------------------

function ScreenProfile({ onNav }) {
  return (
    <MobileScreen navActive="profile" onNav={onNav}>
      <div style={{ padding: '8px 18px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button aria-label="Pengaturan" style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--ink-2)', padding: 10, minWidth: 44, minHeight: 44,
          }}>⚙</button>
        </div>
      </div>
      <div style={{ padding: '0 18px 18px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--pickem-orange-wash)', color: 'var(--pickem-orange)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32,
          marginBottom: 12,
        }}>K</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>Kamu, Hello</div>
        <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>
          @kamuhello · Gabung Mei 2026
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 10px', background: 'rgba(245,158,11,0.16)', borderRadius: 999 }}>
          <StreakFlame days={7} /> <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>streak 7 hari</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '0 14px 14px', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            ['POIN', '1,284', 'var(--pickem-orange)'],
            ['RANK', '#412', 'var(--ink-1)'],
            ['AKURASI', '68%', 'var(--ink-1)'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ padding: 14, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22, color: c }}>{v}</div>
              <div className="p-eyebrow" style={{ fontSize: 9, marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 14px 24px' }}>
        <div className="p-eyebrow" style={{ marginBottom: 10, padding: '0 4px' }}>BADGES · 4/12</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
          <Badge icon="🎯" label="First Strike" sublabel="Skor pas pertama" />
          <Badge icon="🔥" label="Streak 7" sublabel="7 hari beruntun" />
          <Badge icon="⚡" label="Upset" sublabel="Tebak yang kalah" />
          <Badge icon="🏟️" label="Pekan 1" sublabel="WC 2026 opening" />
          <Badge icon="👥" label="Grup 5+" sublabel="Buat 1 grup" locked />
          <Badge icon="🥇" label="Top 100" sublabel="Global top 100" locked />
          <Badge icon="🏆" label="Champion" sublabel="Tebak juara WC" locked />
          <Badge icon="💀" label="Survivor" sublabel="Bertahan 4 pekan" locked />
        </div>

        <div className="p-eyebrow" style={{ marginBottom: 10, padding: '0 4px' }}>RIWAYAT TERAKHIR</div>
        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { tt: 'NED 1–3 POR', sub: 'Prediksi 1–2 · +6 poin', tone: 'up' },
            { tt: 'ESP 2–1 GER', sub: 'Prediksi 2–1 · +12 poin (Jagoan)', tone: 'up' },
            { tt: 'FRA 0–0 ENG', sub: 'Prediksi 2–1 · 0 poin', tone: 'down' },
            { tt: 'ARG 2–1 BRA', sub: 'Prediksi 2–1 · +9 poin', tone: 'up' },
          ].map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: i < 3 ? '1px solid var(--line-1)' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{h.tt}</div>
                <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11, marginTop: 2 }}>{h.sub}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: h.tone === 'up' ? 'var(--p-up)' : 'var(--p-down)' }}>
                {h.tone === 'up' ? '+' : ''}{h.sub.match(/[+-]?\d+/)?.[0] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </MobileScreen>
  );
}

// ----- 8. AuthGate, FirstRun, Magic-link sent ------------------------

function ScreenFirstRunNudge({ onLater, onClaim }) {
  return (
    <div data-theme="dark" style={{
      position: 'absolute', inset: 0,
      background: 'rgba(6, 16, 29, 0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end',
      fontFamily: 'var(--font-ui-pickem)',
    }}>
      <div style={{
        width: '100%', background: 'var(--bg-raised)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '18px 18px 36px',
        textAlign: 'center', color: 'var(--ink-1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--ink-4)', margin: '0 auto 18px' }} />
        <div style={{ fontSize: 38, marginBottom: 8 }}>✓</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginBottom: 6 }}>
          Prediksi tersimpan.
        </div>
        <div className="p-bodysm" style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 18, padding: '0 12px' }}>
          Mau simpan permanen + ikut leaderboard? Login pakai Google — 5 detik, tanpa password.
        </div>
        <div style={{
          padding: 14, background: 'var(--bg-base)', borderRadius: 12, marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        }}>
          <div style={{ flex: 1 }}>
            <div className="p-eyebrow" style={{ marginBottom: 2 }}>YANG KAMU DAPETIN</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.65 }}>
              <li>Ikut papan peringkat global &amp; grup</li>
              <li>Streak harian + badges</li>
              <li>Notifikasi sebelum lock</li>
            </ul>
          </div>
        </div>
        <PickemBtn full size="lg" variant="primary" icon={<span>G</span>} onClick={onClaim}>Login dengan Google</PickemBtn>
        <button onClick={onLater} style={{
          width: '100%', marginTop: 10, padding: 12,
          appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--ink-3)', fontFamily: 'var(--font-ui-pickem)', fontWeight: 600, fontSize: 14,
        }}>Nanti aja</button>
      </div>
    </div>
  );
}

function ScreenMagicLinkSent({ onBack }) {
  return (
    <MobileScreen withNav={false}>
      <BackBar title="Login" onBack={onBack} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✉</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Link udah dikirim.</div>
          <div className="p-bodysm" style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 18 }}>
            Cek inbox di <strong style={{ color: 'var(--ink-1)' }}>kamu@email.com</strong>. Klik linknya, langsung balik ke sini.
          </div>
          <div style={{ padding: 12, background: 'var(--p-info-wash)', borderRadius: 10, marginBottom: 14, fontSize: 12, color: 'var(--ink-2)' }}>
            💡 Link berlaku 10 menit. Kalau nggak nyampe, cek folder spam.
          </div>
          <PickemBtn variant="ghost">Kirim ulang</PickemBtn>
        </div>
      </div>
    </MobileScreen>
  );
}

// ----- 9. System states ----------------------------------------------

function ScreenOffline({ onRetry, onNav }) {
  return (
    <MobileScreen navActive="predict" onNav={onNav}>
      <div style={{ padding: '8px 18px 14px' }}>
        <div className="p-eyebrow" style={{ color: 'var(--p-down)' }}>PREDIKSI · OFFLINE</div>
      </div>
      <div style={{ flex: 1, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          icon="📡"
          tone="error"
          title="Lagi nggak online."
          body="Prediksi yang udah kamu kunci tetep aman. Yang baru, simpan offline — auto-sync pas online lagi."
          action={<PickemBtn variant="primary" onClick={onRetry}>Coba lagi</PickemBtn>}
        />
      </div>
    </MobileScreen>
  );
}

Object.assign(window, {
  MobileScreen, PageHeader, BackBar, Toggle,
  ScreenPredictingHub, ScreenFixtureDetail, FixtureDetailPredict,
  ScreenLeaderboard, PodiumCard,
  ScreenGrupList, ScreenGrupHome, ScreenGrupEmpty, ScreenInviteSheet, ScreenGrupCreate,
  ScreenSurvivor, ScreenProfile,
  ScreenFirstRunNudge, ScreenMagicLinkSent, ScreenOffline,
});
