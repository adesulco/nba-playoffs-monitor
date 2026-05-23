// =====================================================================
// Pass 4 documentation — Flows, Copy deck, Accessibility
// =====================================================================

// ----- 1. Flow diagrams ---------------------------------------------

function FlowsCard() {
  const flows = [
    {
      title: 'A · First prediction as guest → claim',
      sub: '≤2 taps, no login required',
      steps: [
        { l: 'Open hub (no account)', s: 'Today\u2019s fixtures load. Anon device ID assigned.' },
        { l: 'Tap fixture card', s: 'FixtureDetail expands. State: open.', cta: 'TAP' },
        { l: 'Pick outcome', s: 'Outcome button fills amber. ScoreStepper defaults 2-1.', cta: 'TAP' },
        { l: 'Kunci prediksi', s: 'Stored locally + on device-ID record. Toast: "Tersimpan ✓".' },
        { l: 'First-run sheet appears', s: 'After 2s delay. "Mau ikut peringkat? Login 5 detik."', branch: true },
        { l: '→ Login dengan Google', s: 'OAuth flow.' },
        { l: 'Predictions auto-merged', s: 'Server walks device-ID → user-ID. Toast: "1 prediksi dipindah."' },
      ],
    },
    {
      title: 'B · Create grup → invite → friend joins',
      sub: 'WhatsApp deep-link is the spine',
      steps: [
        { l: 'Tap Bikin grup', s: 'GrupCreate form. Default name from device contact name.', cta: 'TAP' },
        { l: 'Fill name + theme + modes', s: 'Modes default to Match + Jagoan + Upset.' },
        { l: 'Tap Bikin', s: 'POST /grups → server returns code (e.g. ANKK-2026).' },
        { l: 'Invite sheet auto-opens', s: 'Pre-filled WA message in Bahasa: "Gabung grup pick\u2019em-ku: gibol.co/g/ANKK-2026"', cta: 'TAP' },
        { l: 'Friend clicks link', s: 'Universal Link → app or web. Skip auth → preview grup standings.' },
        { l: 'Friend joins', s: 'CTA "Gabung grup". Auth-gated. Becomes member.' },
        { l: 'Push to owner', s: '"Faiz baru gabung ke Anak Kantor."' },
      ],
    },
    {
      title: 'C · Build & lock the bracket',
      sub: 'Phone-friendly: stage-by-stage paging',
      steps: [
        { l: 'Open Bracket tab', s: 'Stage stepper sticky-top. Default: Group stage.' },
        { l: 'Pilih semua favorit', s: 'One-tap auto-fill from odds. Marks user as having a starter bracket.', cta: 'OPTIONAL' },
        { l: 'Per group: tap 1/2/3', s: 'Swipe between groups A-L. Best-thirds computed automatically.' },
        { l: 'Lanjut ke R32', s: 'List of 16 matchups. Tap winner per row.' },
        { l: '... through R16, QF, SF, Final', s: 'Same list pattern. Stepper shows progress.' },
        { l: 'Champion screen', s: 'Big celebration. Flag + name + "Kunci" CTA.' },
        { l: 'Kunci bracket', s: 'Locked until tournament end. Confirmation modal. Toast.' },
      ],
    },
    {
      title: 'D · Matchday result → recap → share',
      sub: 'The shareable moment',
      steps: [
        { l: 'Final whistle → server scores', s: 'Backend computes points using engine.' },
        { l: 'Push notification', s: '"+42 poin di pekan ini. Lihat recap?"' },
        { l: 'Tap notif → opens recap modal', s: 'Recap-reveal motion (600ms). Card slides up, points count-up.' },
        { l: 'Swap variant', s: 'SegmentedPicker: Pekan / Upset / Grup. Recap card re-renders.', cta: 'OPTIONAL' },
        { l: 'Bagikan ke WhatsApp', s: 'Native share intent → WA. 4:5 PNG generated server-side from same data.', cta: 'TAP' },
        { l: 'Toast confirmation', s: '"Link disalin · siap dibagikan." (UX-008 fix.)' },
      ],
    },
  ];
  return (
    <div data-theme="dark" className="g-root" style={{ padding: 28, height: '100%', background: 'var(--bg-base)', boxSizing: 'border-box', fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)', overflow: 'auto' }}>
      <PCaption tag="Pass 4" title="Critical user flows"
        subtitle="Four journeys, step by step. Each step lists what the system does and what the user sees." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {flows.map((f) => (
          <div key={f.title} style={{ padding: 18, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 14, borderLeft: '3px solid var(--pickem-orange)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 2 }}>{f.title}</div>
            <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 14, fontStyle: 'italic' }}>{f.sub}</div>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {f.steps.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 10 }}>
                  <span style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                    background: s.cta === 'TAP' ? 'var(--pickem-orange)' : 'var(--bg-base)',
                    color: s.cta === 'TAP' ? '#0A1628' : 'var(--ink-3)',
                    border: '1px solid var(--line-2)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  }}>{i + 1}</span>
                  <div style={{ flex: 1, paddingTop: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>
                      {s.l}
                      {s.cta && <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: s.cta === 'TAP' ? 'var(--pickem-orange-wash)' : 'var(--bg-deep)', color: s.cta === 'TAP' ? 'var(--pickem-orange)' : 'var(--ink-3)', letterSpacing: '0.06em' }}>{s.cta}</span>}
                    </div>
                    <div className="p-bodysm" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{s.s}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- 2. Copy deck ---------------------------------------------------

function CopyDeckCard() {
  const groups = [
    {
      head: 'Predicting hub',
      rows: [
        ['Headline', '5 laga malam ini'],
        ['Progress', '3 dari 5 diprediksi'],
        ['Lock urgency', '🔒 02:14:08'],
        ['Empty state', 'Belum ada laga hari ini. Cek besok.'],
        ['First-run nudge', 'Tebak dulu, login belakangan.'],
      ],
    },
    {
      head: 'Fixture card',
      rows: [
        ['CTA primary', 'Kunci prediksi'],
        ['Jagoan toggle', 'Jadikan jagoan · Poin ×2'],
        ['Saved toast', 'Prediksi tersimpan ✓ — +6 poin kalau skornya pas.'],
        ['Lock toast', 'Prediksi dikunci.'],
        ['Live "on track"', 'Skor pas masih mungkin.'],
        ['Scored — win', 'Hasil kena.'],
        ['Scored — loss', 'Belum kena. Masih ada match besok.'],
        ['Upset chip', 'Berani tebak yang ini? Poin dobel.'],
        ['Missed', 'Kamu nggak prediksi laga ini.'],
      ],
    },
    {
      head: 'Leaderboard',
      rows: [
        ['Headline', 'Posisi kamu'],
        ['Tabs', 'Global · Grup · Pekan ini'],
        ['Empty state', 'Papan belum jalan. Mulai pekan depan.'],
        ['Tie-break hint', '5 skor pas · 12 → 11 (tie-break: jumlah skor pas)'],
        ['Refresh', 'Diperbarui 2 menit lalu'],
      ],
    },
    {
      head: 'Grups',
      rows: [
        ['Create CTA', 'Bikin grup'],
        ['Join CTA',   'Gabung pakai kode'],
        ['Empty grup', 'Grup masih sepi. Ajak teman, baru seru.'],
        ['Invite WA',  'Gabung grup pick\'em-ku: gibol.co/g/{KODE}'],
        ['Toast joined', 'Kamu masuk {NAMA}.'],
        ['Mode owner-only badge', 'Cuma owner yang ubah'],
      ],
    },
    {
      head: 'Bracket',
      rows: [
        ['Header', 'Bangun bracket kamu'],
        ['Auto-fill CTA', 'Pilih semua favorit'],
        ['Reset', 'Reset bracket'],
        ['Stage progress', '{N} / 8 dipilih'],
        ['Champion screen', 'Juara Dunia 2026 — menurut kamu'],
        ['Lock CTA', '🔒 Kunci bracket'],
        ['Lock confirm', 'Bracket nggak bisa diubah lagi sampai turnamen selesai. Yakin?'],
      ],
    },
    {
      head: 'Survivor',
      rows: [
        ['Header', 'Pekan ke-{N} · kamu masih hidup.'],
        ['Pick CTA', 'Pilih {TIM} · 🔒 {COUNTDOWN}'],
        ['Used teams hint', 'Tim yang udah dipakai, nggak bisa dipakai lagi.'],
        ['Out',  'Kamu kalah pekan ini. Tunggu turnamen berikutnya.'],
        ['Win',  'Kamu fan terakhir — selamat.'],
      ],
    },
    {
      head: 'Auth / claim',
      rows: [
        ['First-run sheet', 'Mau simpan permanen + ikut leaderboard?'],
        ['Login CTA', 'Login dengan Google'],
        ['Skip', 'Nanti aja'],
        ['Link sent', 'Link udah dikirim ke {EMAIL}. Klik linknya, langsung balik.'],
        ['Link expired', 'Linknya udah lewat 10 menit. Kirim ulang?'],
        ['Claim merge', '1 prediksi dipindah ke akunmu.'],
      ],
    },
    {
      head: 'System',
      rows: [
        ['Offline', 'Lagi nggak online. Prediksi tersimpan offline, auto-sync pas online.'],
        ['Error',   'Wah, lagi error. Coba lagi sebentar.'],
        ['Notif prompt', 'Mau notif sebelum match-day mulai? Kami cuma kirim yang penting.'],
        ['Streak break', 'Streak {N} hari putus. Mulai lagi besok?'],
        ['Coming soon', 'Segera hadir — ditandai {BULAN}.'],
      ],
    },
  ];
  return (
    <div data-theme="dark" className="g-root" style={{ padding: 28, height: '100%', background: 'var(--bg-base)', boxSizing: 'border-box', fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)', overflow: 'auto' }}>
      <PCaption tag="Pass 4" title="Copy deck — Bahasa Indonesia"
        subtitle="Casual register. Gue/lo only in editorial surfaces; kamu in chrome. Banned: taruhan, judi, jackpot, pasang. Odds shown as &lsquo;peluang&rsquo; only." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {groups.map((g) => (
          <div key={g.head} style={{ padding: 16, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12 }}>
            <div className="p-eyebrow" style={{ color: 'var(--pickem-orange)', marginBottom: 10 }}>{g.head}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {g.rows.map(([role, copy]) => (
                <div key={role} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line-1)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{role.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-1)', lineHeight: 1.4 }}>{copy}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- 3. Accessibility ---------------------------------------------

function A11yCard() {
  return (
    <div data-theme="dark" className="g-root" style={{ padding: 28, height: '100%', background: 'var(--bg-base)', boxSizing: 'border-box', fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)', overflow: 'auto' }}>
      <PCaption tag="Pass 4" title="Accessibility — WCAG 2.2 AA"
        subtitle="The floor, baked in. Verified contrast pairs, focus, keyboard-completable flows, screen-reader semantics." />

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
        <div style={{ padding: 18, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12 }}>
          <div className="p-eyebrow" style={{ marginBottom: 10 }}>CROSS-CUTTING RULES</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65 }}>
            <li><strong>Outcome &amp; result never colour-alone.</strong> Win = green + ▲ + "Naik". Loss = red + ▼ + "Turun". Live = amber + pulse + "LIVE" text.</li>
            <li><strong>Focus.</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>:focus-visible</span> never <span style={{ fontFamily: 'var(--font-mono)' }}>:focus</span>. 3px outer ring at <span style={{ fontFamily: 'var(--font-mono)' }}>--info</span> (#60A5FA). On amber CTAs, white inner + amber outer.</li>
            <li><strong>Touch.</strong> Min 44×44 everywhere. Primary CTAs 52px. Flag chips are decorative — the whole row is the tap target.</li>
            <li><strong>Keyboard.</strong> Bracket builder is fully keyboard-completable. Tab → group, Arrow → team, Space → cycle 1/2/3/–. Knockout rows: Tab/Space.</li>
            <li><strong>aria-current.</strong> Active nav, sport, tab. Visual style derives from attribute, never a separate class.</li>
            <li><strong>Live regions.</strong> Loading/partial/stale → polite. Errors → assertive. Toasts → polite. Score updates during live → polite, throttled to 5s.</li>
            <li><strong>Reduced motion.</strong> Pulse dot freezes. Recap-reveal skips slide, fades only. Points-tally shows final value instantly.</li>
            <li><strong>Validation.</strong> Login form uses <span style={{ fontFamily: 'var(--font-mono)' }}>aria-invalid</span> + <span style={{ fontFamily: 'var(--font-mono)' }}>aria-describedby</span>; errors in Indonesian. Browser-native English tooltips disabled.</li>
          </ul>
        </div>

        <div style={{ padding: 18, background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12 }}>
          <div className="p-eyebrow" style={{ marginBottom: 10 }}>CONTRAST PAIRS (verified)</div>
          {[
            ['ink-1 on bg-base',     '#E6EEF9 / #0A1628', '17:1', 'AAA'],
            ['ink-2 on bg-base',     '#B6C4D8 / #0A1628', '10:1', 'AAA'],
            ['ink-3 on bg-base',     '#9FB4CC / #0A1628', '7:1',  'AA'],
            ['amber on bg-base',     '#F59E0B / #0A1628', '10.4:1', 'AAA'],
            ['ink-1 on amber CTA',   '#0A1628 / #F59E0B', '10.4:1', 'AAA'],
            ['p-up on bg-base',      '#34D399 / #0A1628', '8.9:1', 'AAA'],
            ['p-down on bg-base',    '#F87171 / #0A1628', '5.8:1', 'AA'],
            ['p-live on p-live-wash','#FBBF24 / wash',    '11:1',  'AAA'],
          ].map(([n, h, r, lvl]) => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, fontSize: 11, padding: '5px 0', borderBottom: '1px solid var(--line-1)' }}>
              <span style={{ color: 'var(--ink-2)' }}>{n}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>{h}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: lvl === 'AAA' ? 'var(--p-up)' : 'var(--p-info)', fontWeight: 700, minWidth: 50, textAlign: 'right' }}>{r} {lvl}</span>
            </div>
          ))}
          <div className="p-bodysm" style={{ color: 'var(--ink-3)', fontSize: 11, marginTop: 10, fontStyle: 'italic' }}>
            Paper-theme amber drops to 2:1 — fixed by swapping CTAs to orange #9A3412 (7.4:1) on paper. Documented in tokens.css.
          </div>
        </div>

        <div style={{ padding: 18, gridColumn: '1 / -1', background: 'var(--bg-raised)', border: '1px solid var(--line-1)', borderRadius: 12 }}>
          <div className="p-eyebrow" style={{ marginBottom: 10 }}>SCREEN-READER LABELS (Bahasa)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              ['Flag', 'Bendera {Negara}'],
              ['LIVE pill', 'Sedang berlangsung, menit ke-75'],
              ['Lock countdown', 'Terkunci dalam 2 jam 14 menit'],
              ['Outcome picker', 'Pilih hasil pertandingan. Pilihan: Menang, Seri, Kalah.'],
              ['ScoreStepper', 'Skor {Tim}, saat ini {N}. Tambah / kurangi.'],
              ['Jagoan toggle', 'Tandai sebagai jagoan matchday. Poin dari laga ini akan dikalikan dua.'],
              ['LeaderboardRow', '{Nama}, peringkat {N}, {Poin} poin, naik {M} peringkat.'],
              ['GrupCard', 'Buka grup {Nama}, {N} anggota, peringkatmu {R}.'],
              ['BracketMatch', 'Pertandingan R16 nomor {N}: {Home} melawan {Away}. {Pilihan}.'],
              ['RecapCard', 'Recap pekan {N}: {Poin} poin, posisi global naik {M}.'],
              ['Bottom nav', 'Navigasi utama. Aktif: {Halaman}.'],
              ['Star/jagoan badge', 'Jagoan aktif, poin dikalikan dua.'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 10px', background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--line-1)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em', marginBottom: 2 }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-1)' }}>"{v}"</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FlowsCard, CopyDeckCard, A11yCard });
