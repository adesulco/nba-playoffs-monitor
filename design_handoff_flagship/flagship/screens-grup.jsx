// =====================================================================
// Flagship — group home + commissioner (Step 5), upgrade sheet, pricing
// Copy: English first, Indonesian second (CLAUDE.md rule).
// =====================================================================

// ---- 1. Group home + commissioner panel -----------------------------------

function ScreenGrupHome() {
  return (
    <FShell navActive="grup" topbar={<FTopBar right={<FNavChip>⚙️ Manage</FNavChip>} border={false} />}>
      <div style={{ flex: 1, overflow: 'hidden', padding: '10px 16px 0' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.015em' }}>Tongkrongan FC</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>WC 2026</span>
          <div style={{ flex: 1 }}><FCapMeter n={9} cap={10} /></div>
        </div>

        <FCard pad={0} style={{ overflow: 'hidden' }}>
          {TKRG_MEMBERS.slice(0, 5).map((r) => <FBoardRow key={r.rank} row={r} dense />)}
          <FBoardRow row={TKRG_MEMBERS[8]} dense />
        </FCard>

        <FSectionHead right={<FPill tone="prem">Commissioner</FPill>}>Commissioner panel</FSectionHead>
        <FCard pad={0}>
          {[
            { l: 'Scoring rules', s: 'Gibol Standard · editable until the first lock', r: <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pickem-orange)' }}>Edit ›</span> },
            { l: 'WA standings card', s: 'Matchday PNG — auto-generated every night', r: <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pickem-orange)' }}>Share ›</span> },
            { l: 'Manual entry (offline)', s: 'Pick on behalf of offline members', r: <FPill tone="prem">Pass</FPill> },
            { l: 'Multi-entry per person', s: 'Max. 3 entries per member', r: <FPill tone="prem">Pass</FPill> },
          ].map((it, i, arr) => (
            <div key={it.l} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--line-1)' : 'none',
            }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{it.l}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{it.s}</span>
              </span>
              {it.r}
            </div>
          ))}
        </FCard>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <FBtn variant="wa" size="sm" icon={<WhatsAppIcon size={14} />} style={{ flex: 1 }}>Nudge Joko on WA</FBtn>
          <FBtn variant="secondary" size="sm" style={{ flex: 1 }}>Invite — 1 slot left</FBtn>
        </div>
      </div>
    </FShell>
  );
}

// ---- 2. Pending-member upgrade sheet — the social-pressure paywall ----------------

function ScreenUpgradeSheet() {
  return (
    <FShell navActive="grup" topbar={<FTopBar right={<FNavChip>⚙️ Manage</FNavChip>} border={false} />}>
      {/* dimmed group home behind */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '10px 16px 0', filter: 'blur(1px)', opacity: 0.55 }} aria-hidden="true">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: '0 0 6px' }}>Tongkrongan FC</h2>
        <div style={{ marginBottom: 12 }}><FCapMeter n={10} cap={10} /></div>
        <FCard pad={0}>
          {TKRG_MEMBERS.slice(0, 6).map((r) => <FBoardRow key={r.rank} row={r} dense />)}
        </FCard>
      </div>

      <FSheet>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{
            width: 46, height: 46, borderRadius: 999, flexShrink: 0,
            background: 'var(--p-info-wash)', color: 'var(--p-info)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 18, fontFamily: 'var(--font-ui-pickem)',
          }}>R</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, lineHeight: 1.15 }}>Rina wants to join 🎉</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>She&rsquo;s waiting at the door — your free slots are full.</div>
          </div>
        </div>

        <FCard pad={12} style={{ background: 'var(--bg-base)', marginBottom: 14 }}>
          <FCapMeter n={10} cap={10} />
        </FCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {[
            'Unlimited members — Rina gets in right away',
            'Unlimited groups + multi-entry (max. 3/person)',
            'Manual entries for offline friends',
            'One payment, valid all WC 2026 season',
          ].map((b) => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', fontFamily: 'var(--font-ui-pickem)' }}>
              <span style={{ color: 'var(--p-up)', display: 'inline-flex' }}><CheckIcon size={15} /></span>{b}
            </div>
          ))}
        </div>

        <FBtn variant="primary" size="lg" full>
          Season Pass — Rp 79k
          <span style={{ fontWeight: 500, fontSize: 12, opacity: 0.85 }}>· QRIS / GoPay / OVO</span>
        </FBtn>
        <div style={{ height: 8 }} />
        <FBtn variant="ghost" full>Not now — Rina keeps waiting</FBtn>
        <div style={{ marginTop: 12 }}><FLegalNote /></div>
      </FSheet>
    </FShell>
  );
}

// ---- 3. Pricing (wireframe 7) -------------------------------------------------------

function ScreenHarga() {
  return (
    <FShell withNav={false} topbar={
      <FTopBar right={
        <span style={{ display: 'inline-flex', background: 'var(--bg-deep)', borderRadius: 999, padding: 2 }}>
          <FNavChip active>IDR</FNavChip><FNavChip>USD</FNavChip>
        </span>
      } />
    }>
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 18px 0' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600, margin: '0 0 14px', letterSpacing: '-0.015em', lineHeight: 1.15 }}>
          Start free, upgrade when your group gets big
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <FCard pad={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>Free</span><FPill tone="up">Forever</FPill>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>1 group · 10 members · 1 entry · every format</div>
          </FCard>

          <FCard pad={14} style={{ border: '2px solid var(--pickem-orange)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>Season Pass <span style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--ink-3)' }}>commissioner</span></span>
              <FPill tone="prem">Most popular</FPill>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, margin: '7px 0 3px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em' }}>Rp 79k</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>/season · one payment</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 11 }}>Unlimited members · unlimited groups · multi-entry · manual entries</div>
            <FBtn variant="primary" full size="md">Pay with QRIS / GoPay</FBtn>
          </FCard>

          <FCard pad={14}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>Lifetime</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18 }}>Rp 249k</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>One payment, every competition — WC, EPL, Liga 1, NBA</div>
          </FCard>

          <FCard pad={14}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>Gibol+ <span style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--ink-3)' }}>players</span></span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18 }}>Rp 19k<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)' }}>/mo</span></span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>Consensus + win-prob + form <em>before</em> you pick · ad-free</div>
          </FCard>
        </div>
        <div style={{ marginTop: 12 }}><FLegalNote /></div>
      </div>
    </FShell>
  );
}

Object.assign(window, { ScreenGrupHome, ScreenUpgradeSheet, ScreenHarga });
