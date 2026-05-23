// =====================================================================
// Gibol Pick'em — Recap / Share cards (Kartu Bola grammar)
// =====================================================================
// The share moment. Uses C-grammar from Pass 1: bold poster, slim
// flag-color rail, oversized mono score, soft drop-shadow. Built to
// read at WhatsApp thumbnail (64×64) and as a 4:5 IG/WA story.
//
// 3 variants per brief: big-win, called-the-upset, grup-rank-up.
// =====================================================================

// ----- Shared shell ---------------------------------------------------

function RecapShell({ children, primary, rail }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg-paper, #FFFFFF)',
      borderRadius: 8, overflow: 'hidden',
      fontFamily: 'var(--font-ui-pickem)', color: '#0F1E2E',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 8px 28px -8px rgba(15,30,46,0.15)',
      position: 'relative',
    }}>
      <div style={{ height: 8, background: rail || 'var(--pickem-orange)' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
      <RecapFooter />
    </div>
  );
}

function RecapFooter() {
  return (
    <div style={{
      padding: '10px 18px',
      borderTop: '1px solid rgba(15,30,46,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#F8FAFC',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: '#9A3412' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, color: '#0F1E2E', letterSpacing: '0.04em' }}>GIBOL.CO</span>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: '#6B7480', letterSpacing: '0.06em' }}>PICK&apos;EM · WC 2026</span>
    </div>
  );
}

// ----- Variant 1: Big-win recap ---------------------------------------

function RecapBigWin() {
  return (
    <RecapShell rail="#1F8A5B">
      <div style={{ padding: '20px 22px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#6B7480', letterSpacing: '0.10em', marginBottom: 8 }}>
          SABTU · MATCHDAY 3
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Empat dari lima.
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: '#6B7480', marginBottom: 14 }}>
          Pekan terbaik kamu sejauh ini.
        </div>

        <div style={{
          background: '#1F8A5B', color: '#FFFFFF',
          borderRadius: 14, padding: '20px 22px',
          textAlign: 'center', marginBottom: 14,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.8, marginBottom: 6 }}>POIN PEKAN INI</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 64, letterSpacing: '-0.02em', lineHeight: 1 }}>+42</div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, marginTop: 8, opacity: 0.95 }}>
            Argentina, Brasil, Spanyol, Belanda.
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#6B7480', letterSpacing: '0.10em' }}>POSISI GLOBAL</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24, color: '#0F1E2E' }}>#412 <span style={{ fontSize: 14, color: '#1F8A5B' }}>▲ 38</span></div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['ARG','BRA','ESP','NED'].map((c) => (
              <Flag key={c} team={c} w={26} h={18} round={3} />
            ))}
          </div>
        </div>
      </div>
    </RecapShell>
  );
}

// ----- Variant 2: Called-the-upset -----------------------------------

function RecapUpset() {
  return (
    <RecapShell rail="#F59E0B">
      <div style={{ padding: '20px 22px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#9A3412', letterSpacing: '0.10em', marginBottom: 8 }}>
          ⚡ UPSET TERBESAR PEKAN INI
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 14 }}>
          Kamu satu dari <span style={{ color: '#9A3412' }}>8%</span> yang nebak Jepang.
        </div>

        <div style={{
          background: '#FFFFFF', border: '2px solid #0F1E2E',
          borderRadius: 14, padding: '18px 20px', marginBottom: 16,
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center', gap: 12,
          }}>
            <div style={{ textAlign: 'center' }}>
              <Flag team="ESP" w={44} h={32} round={5} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginTop: 6, color: '#6B7480' }}>Spanyol</div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 36, letterSpacing: '-0.02em' }}>1 – 2</div>
            <div style={{ textAlign: 'center' }}>
              <Flag team="JPN" w={44} h={32} round={5} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, marginTop: 6 }}>Jepang</div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px',
          background: '#FCE9CD', borderRadius: 10,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#9A3412', letterSpacing: '0.10em' }}>POIN PRABEDA</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0F1E2E', marginTop: 2 }}>
              +6 dasar × 3 upset = <strong>+18</strong>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 32, color: '#9A3412' }}>+18</div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: '#6B7480', textAlign: 'center', marginTop: 12 }}>
          “Berani tebak yang ini? Poin dobel.”
        </div>
      </div>
    </RecapShell>
  );
}

// ----- Variant 3: Grup rank-up ---------------------------------------

function RecapGrupUp() {
  return (
    <RecapShell rail="#9A3412">
      <div style={{ padding: '20px 22px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#6B7480', letterSpacing: '0.10em', marginBottom: 8 }}>
          GRUP · ANAK KANTOR
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Naik 2 peringkat,
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: '#9A3412', marginBottom: 14 }}>
          masih ngintilin Faiz.
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid rgba(15,30,46,0.12)',
          borderRadius: 12, overflow: 'hidden', marginBottom: 14,
        }}>
          {[
            { r: 1, n: 'Faiz R.',  p: 142, you: false },
            { r: 2, n: 'Bagas K.', p: 138, you: false },
            { r: 3, n: 'Kamu',     p: 124, you: true, prev: 5 },
            { r: 4, n: 'Lila P.',  p: 118, you: false },
          ].map((row) => (
            <div key={row.r} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center',
              padding: '10px 14px',
              borderBottom: row.r < 4 ? '1px solid rgba(15,30,46,0.08)' : 'none',
              background: row.you ? '#F4D9CC' : 'transparent',
              borderLeft: row.you ? '3px solid #9A3412' : '3px solid transparent',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: '#0F1E2E' }}>#{row.r}</div>
              <div style={{ fontSize: 13, fontWeight: row.you ? 700 : 500, color: '#0F1E2E' }}>
                {row.n} {row.you && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#9A3412', marginLeft: 6 }}>▲ 2</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: '#0F1E2E' }}>{row.p}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: '#6B7480' }}>
            Selisih ke #1: <strong style={{ fontFamily: 'var(--font-mono)', fontStyle: 'normal', color: '#0F1E2E' }}>18 poin</strong>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#9A3412', letterSpacing: '0.08em' }}>
            2 PEKAN TERSISA
          </div>
        </div>
      </div>
    </RecapShell>
  );
}

// ----- ShareSheet (live-action share modal) --------------------------

function ScreenShareSheet({ onClose, fixture }) {
  const [variant, setVariant] = React.useState('big-win');
  return (
    <div data-theme="dark" style={{
      position: 'absolute', inset: 0,
      background: 'rgba(6, 16, 29, 0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-ui-pickem)',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 16px 14px', color: 'var(--ink-1)',
      }}>
        <button onClick={onClose} style={{
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--ink-1)', fontFamily: 'var(--font-ui-pickem)',
          fontSize: 15, fontWeight: 600, minHeight: 44,
        }}>Tutup</button>
        <div style={{ fontFamily: 'var(--font-ui-pickem)', fontSize: 15, fontWeight: 700 }}>Bagikan</div>
        <div style={{ minWidth: 60 }} />
      </header>

      {/* The card itself, framed */}
      <div style={{ flex: 1, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', aspectRatio: '4 / 5', maxHeight: '100%', maxWidth: 320 }}>
          {variant === 'big-win' && <RecapBigWin />}
          {variant === 'upset'   && <RecapUpset />}
          {variant === 'grup-up' && <RecapGrupUp />}
        </div>
      </div>

      <div style={{ padding: '14px 18px 12px', display: 'flex', justifyContent: 'center' }}>
        <SegmentedPicker
          items={[
            { k: 'big-win', l: 'Pekan' },
            { k: 'upset',   l: 'Upset' },
            { k: 'grup-up', l: 'Grup' },
          ]}
          active={variant} onChange={setVariant}
        />
      </div>

      <div style={{
        padding: '8px 18px 22px',
        display: 'flex', gap: 10,
      }}>
        <PickemBtn full size="lg" variant="primary" icon={<WhatsAppIcon size={18} />}>Bagikan ke WhatsApp</PickemBtn>
      </div>
    </div>
  );
}

Object.assign(window, {
  RecapShell, RecapBigWin, RecapUpset, RecapGrupUp, ScreenShareSheet,
});
