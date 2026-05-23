// =====================================================================
// Pass 2 documentation — Design System anatomy + Motion spec
// =====================================================================

function CommitCard() {
  return (
    <div data-theme="dark" className="g-root" style={{ padding: 36, height: '100%', background: 'var(--bg-base)', boxSizing: 'border-box', fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)' }}>
      <div className="p-eyebrow" style={{ color: 'var(--pickem-orange)', marginBottom: 12 }}>STADIUM NIGHT · COMMITTED</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0, marginBottom: 16 }}>
        One direction, three reasons.
      </h1>
      <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink-3)', maxWidth: 640, margin: '0 0 24px' }}>
        Dark substrate, amber sole accent, mono numerals as heroes. C-grammar reserved for the share moment.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          ['Score is the centre of gravity', 'Pick\u2019em is a numbers game. Mono numerals at 36-44px own every card body.'],
          ['One amber, one job', 'Amber CTA on dark hits 10.4:1. No fallback orange. No accent contortions.'],
          ['Watching at 2am', 'Mid-range Android, OLED, cellular. Dark wins by physics and battery.'],
        ].map(([t, s]) => (
          <div key={t} style={{ padding: 16, background: 'var(--bg-raised)', borderRadius: 12, border: '1px solid var(--line-1)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t}</div>
            <div className="p-bodysm" style={{ color: 'var(--ink-2)', fontSize: 13 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{
        padding: 18, background: 'var(--pickem-orange-wash)', borderRadius: 12,
        border: '1px solid var(--pickem-orange-soft)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ flex: 1 }}>
          <div className="p-eyebrow" style={{ color: 'var(--pickem-orange)', marginBottom: 4 }}>KARTU BOLA &middot; RESERVED FOR ONE THING</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
            The Recap card uses C-grammar at 4:5 for WhatsApp.
          </div>
          <div className="p-bodysm" style={{ color: 'var(--ink-2)', fontSize: 13, maxWidth: 580 }}>
            Bold poster, flag-color rail, oversized mono numerals. Tested at thumbnail. Everywhere else: the calm Stadium grammar.
          </div>
        </div>
        <div style={{ fontSize: 48 }}>📤</div>
      </div>
    </div>
  );
}

// ----- Tokens reference card -----------------------------------------

function TokensCard() {
  return (
    <div data-theme="dark" className="g-root" style={{ padding: 28, height: '100%', background: 'var(--bg-base)', boxSizing: 'border-box', fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)', overflow: 'auto' }}>
      <PCaption tag="System · A1" title="Tokens — Stadium Night"
        subtitle="Every component reads from these. Light theme (paper) is identical structure, different values." />

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Surfaces */}
        <div style={{ padding: 18, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12 }}>
          <div className="p-eyebrow" style={{ marginBottom: 10 }}>SURFACES (dark stack)</div>
          {[
            ['--bg-deep',   '#06101D', 'recessed'],
            ['--bg-base',   '#0A1628', 'page'],
            ['--bg-raised', '#0F1E36', 'cards'],
            ['--bg-elev',   '#16273F', 'popovers'],
          ].map(([t, h, u]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: h, border: '1px solid var(--line-1)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-1)' }}>{t}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>{h} · {u}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ink */}
        <div style={{ padding: 18, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12 }}>
          <div className="p-eyebrow" style={{ marginBottom: 10 }}>INK</div>
          {[
            ['--ink-1', '#E6EEF9', '17:1'],
            ['--ink-2', '#B6C4D8', '10:1'],
            ['--ink-3', '#9FB4CC', '7:1'],
            ['--ink-4', '#6B7B92', '3.5:1 (UI only)'],
          ].map(([t, h, r]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: h }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-1)' }}>{t}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>{h} · {r}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Accent + semantic */}
        <div style={{ padding: 18, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12 }}>
          <div className="p-eyebrow" style={{ marginBottom: 10 }}>ACCENT + SEMANTIC</div>
          {[
            ['Amber CTA',  '#F59E0B', '10.4:1', 'var(--pickem-orange)'],
            ['Live pulse', '#FBBF24', '11:1',   'var(--p-live)'],
            ['Win',        '#34D399', '8.9:1',  'var(--p-up)'],
            ['Loss',       '#F87171', '5.8:1',  'var(--p-down)'],
            ['Info',       '#60A5FA', '6.4:1',  'var(--p-info)'],
          ].map(([n, h, r, c]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: c }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{n}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>{h} · {r}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ padding: 18, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12 }}>
          <div className="p-eyebrow" style={{ marginBottom: 10 }}>TYPE</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 34, lineHeight: 1.05, letterSpacing: '-0.02em' }}>5 laga malam ini.</div>
          <div style={{ fontFamily: 'var(--font-ui-pickem)', fontWeight: 700, fontSize: 18, marginTop: 6 }}>Argentina menang</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--p-live)', marginTop: 6 }}>2 : 1</div>
          <div className="p-bodysm" style={{ color: 'var(--ink-3)', marginTop: 10, fontSize: 12 }}>
            Newsreader (display) · Inter Tight (UI) · JetBrains Mono (numerals).
          </div>
        </div>

        <div style={{ padding: 18, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12 }}>
          <div className="p-eyebrow" style={{ marginBottom: 10 }}>RADIUS + SHADOW + SPACING</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {[8, 10, 12, 14, 16].map((r) => (
              <div key={r} style={{ width: 48, height: 48, borderRadius: r, background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>{r}</div>
            ))}
          </div>
          <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
            Cards r:14 · pills r:999 · buttons r:999 · sheets r:20.<br/>
            Padding: 16-18px card interior, 14-16px between cards, 8px gaps inside.<br/>
            Touch targets: min 44×44, primary CTAs 52.
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Component inventory card -------------------------------------

function ComponentInventoryCard() {
  const groups = [
    { name: 'Data display', items: [
      ['StatePill', 'open/locked/live/scored/missed/soon'],
      ['ProbabilityChip', 'mono % with optional label'],
      ['LockCountdown', 'mono hh:mm:ss, urgent flips live amber'],
      ['PointsPill', 'mono +N, tone up/down'],
      ['ScoreBreakdown', 'mono row of additive parts'],
      ['RankBadge', 'mono #N with movement arrow'],
      ['StreakFlame', 'mono 🔥 N days'],
      ['Badge', 'icon · label · sublabel · locked'],
    ]},
    { name: 'Input', items: [
      ['OutcomePicker (1X2)', 'radiogroup, mono codes lead'],
      ['ScoreStepper', '− / mono N / +, two sizes'],
      ['JagoanToggle', 'filled when active, compact ×2 chip variant'],
      ['SegmentedPicker', '2-4 short options'],
      ['Tabs', 'horizontal scroll, mono count chip'],
      ['Toggle', '44×26 amber pill switch'],
      ['Text input', 'inputStyle (48px tall)'],
    ]},
    { name: 'Surfaces', items: [
      ['FixtureCard', 'four states + missed, compact mode'],
      ['LeaderboardRow', 'rank / name / points · you variant'],
      ['GrupCard', 'avatar / name / movement'],
      ['EmptyState', 'icon · title · body · action · tone'],
      ['RecapShell + 3 variants', '4:5 paper, slim flag rail'],
      ['BracketMatch / BracketMatchCompact', 'pick row, sport-tinted'],
    ]},
    { name: 'Chrome', items: [
      ['BottomNav (mobile)', '4 items, 70px tall, safe-area padding'],
      ['SideNav (desktop)', '220px, items + count badges'],
      ['BackBar', 'sticky 52px, back button 44×44'],
      ['PageHeader', 'eyebrow + display headline'],
      ['Toast', 'success/info/error, polite live region'],
      ['ScreenInviteSheet', '20px-radius bottom sheet'],
    ]},
    { name: 'Atomic', items: [
      ['PickemBtn', 'primary/secondary/ghost/inverse · sm/md/lg'],
      ['Flag', 'emoji rendered in clipped rect, country fallback'],
      ['Icons', 'Home/Target/Users/User/Back/Share/Bell/Search/Check/Plus/WhatsApp'],
    ]},
  ];
  return (
    <div data-theme="dark" className="g-root" style={{ padding: 28, height: '100%', background: 'var(--bg-base)', boxSizing: 'border-box', fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)', overflow: 'auto' }}>
      <PCaption tag="System · A2" title="Component inventory"
        subtitle="Everything in the system, grouped by role. Each component documented in components.jsx with props + usage rules." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {groups.map((g) => (
          <div key={g.name} style={{ padding: 16, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12 }}>
            <div className="p-eyebrow" style={{ color: 'var(--pickem-orange)', marginBottom: 10 }}>{g.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {g.items.map(([n, d]) => (
                <div key={n} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink-1)' }}>{n}</span>
                  <span style={{ color: 'var(--ink-3)', fontSize: 11, textAlign: 'right' }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- Motion spec card ---------------------------------------------

function MotionSpecCard() {
  const moments = [
    {
      name: 'pick-confirm',
      dur: '180ms',
      ease: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      what: 'Outcome button fills amber, lightly scales 1.02 then 1.0. ScoreStepper digits flash mono-white briefly.',
      a11y: 'aria-checked flips. Optional haptic on iOS.',
    },
    {
      name: 'points-tally',
      dur: '900ms',
      ease: 'cubic-bezier(0.5, 0, 0.1, 1)',
      what: 'Count-up from 0 to +N on PointsPill, with green/red ink fade-in. ScoreBreakdown chips stagger 60ms each.',
      a11y: 'Final value announced once. Reduced motion: no count, just show value.',
    },
    {
      name: 'rank-change',
      dur: '320ms',
      ease: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      what: 'LeaderboardRow translateY ±row-height with FLIP. Your-row stays stuck to the screen edge during the animation.',
      a11y: 'aria-live="polite" on your-rank: "Naik 2 ke posisi 412."',
    },
    {
      name: 'lock',
      dur: '240ms',
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      what: 'FixtureCard\u2019s body section collapses; status pill flips from "TERBUKA" to lock icon + "TERKUNCI"; subtle inset shadow appears.',
      a11y: '"Prediksi dikunci" toast (polite). Card aria-disabled=true.',
    },
    {
      name: 'recap-reveal',
      dur: '600ms',
      ease: 'cubic-bezier(0, 0.6, 0.2, 1)',
      what: 'Backdrop fades in (200ms), card slides up + scales 0.96→1 (400ms after), points count-up runs once card is settled.',
      a11y: 'role="dialog", focus moves to close button. Reduced motion: instant fade.',
    },
    {
      name: 'live-pulse',
      dur: '1600ms loop',
      ease: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      what: 'Live amber dot + ring expand from 0 to 8px radius and fade. Pure CSS keyframes (low cost).',
      a11y: 'Decorative; aria-hidden. Reduced motion: dot static, no ring.',
    },
  ];
  return (
    <div data-theme="dark" className="g-root" style={{ padding: 28, height: '100%', background: 'var(--bg-base)', boxSizing: 'border-box', fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)', overflow: 'auto' }}>
      <PCaption tag="System · A3" title="Motion spec"
        subtitle="Six named moments. Each carries meaning; never decoration. All respect prefers-reduced-motion." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {moments.map((m) => (
          <div key={m.name} style={{ padding: 16, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12, borderLeft: '3px solid var(--pickem-orange)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--pickem-orange)' }}>{m.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>{m.dur}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', marginBottom: 8, wordBreak: 'break-all' }}>{m.ease}</div>
            <div className="p-bodysm" style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 8, lineHeight: 1.5 }}>{m.what}</div>
            <div className="p-bodysm" style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.5 }}>{m.a11y}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { CommitCard, TokensCard, ComponentInventoryCard, MotionSpecCard });
