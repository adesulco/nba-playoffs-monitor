// =====================================================================
// Flagship — acquisition screens (Step 6 root home, Step 2 wizard + invite)
// Copy: English first, Indonesian second (CLAUDE.md rule).
// =====================================================================

// ---- 1. Root home (gibol.co/) — mobile -------------------------------

function ScreenRootHome() {
  return (
    <FShell withNav={false}>
      <FTopBar right={<React.Fragment>
        <FNavChip>Pricing</FNavChip>
        <FNavChip>Scores &amp; News ↗</FNavChip>
        <FNavChip>ID</FNavChip>
      </React.Fragment>} />
      <div style={{ flex: 1, overflow: 'hidden', padding: '20px 18px 0' }}>
        <FPill tone="live" dot>World Cup 2026 is on</FPill>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 40,
          lineHeight: 1.04, letterSpacing: '-0.02em', margin: '14px 0 0', color: 'var(--ink-1)',
        }}>
          Your WA group&rsquo;s<br />pick&rsquo;em pool.
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink-2)', margin: '12px 0 20px', maxWidth: 320 }}>
          Predict with your crew, office, or family. Auto scoring, real-time standings — just share one link.
        </p>
        <FBtn variant="primary" size="lg" full>⚽ Create a Group — Free</FBtn>
        <div style={{ height: 8 }} />
        <FBtn variant="secondary" size="md" full>Join Gibol&rsquo;s Public Pool</FBtn>

        <FSectionHead>Competitions</FSectionHead>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { n: 'World Cup 2026', s: <FPill tone="live" dot>Live</FPill> },
            { n: 'NBA Playoffs',   s: <FPill tone="up">Finished</FPill> },
            { n: 'EPL 26/27',      s: <FPill>August</FPill> },
            { n: 'Liga 1',         s: <FPill>Soon</FPill> },
          ].map((c) => (
            <FCard key={c.n} pad={12} style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{c.n}</span>
              {c.s}
            </FCard>
          ))}
        </div>

        <div style={{
          marginTop: 16, padding: '13px 14px', borderRadius: 12,
          background: 'var(--bg-deep)', display: 'flex', justifyContent: 'center', gap: 18,
        }}>
          {[['17k+', 'picks made'], ['900+', 'groups'], ['100%', 'auto-scored']].map(([n, l]) => (
            <span key={l} style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16 }}>{n}</span>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>{l}</span>
            </span>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', margin: '14px 0 0' }}>
          Joining late? You can still win. · Free for 10 members per group
        </p>
      </div>
    </FShell>
  );
}

// ---- 2. Root home — desktop 1280 (the only desktop adaptation this pass) ----

function DesktopRootHome() {
  return (
    <div className="g-root" style={{
      width: '100%', height: '100%', background: 'var(--bg-base)',
      fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 48px', borderBottom: '1px solid var(--line-1)',
      }}>
        <FLogo size={22} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <FNavChip>How it works</FNavChip>
          <FNavChip>Pricing</FNavChip>
          <FNavChip>Scores &amp; News ↗</FNavChip>
          <FNavChip>ID</FNavChip>
          <FBtn size="sm" variant="ink">Sign in</FBtn>
        </div>
      </header>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 460px', gap: 56, padding: '56px 48px 0', maxWidth: 1180, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div>
          <FPill tone="live" dot>World Cup 2026 is on · 4 matches tonight</FPill>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 64, lineHeight: 1.02, letterSpacing: '-0.022em', margin: '20px 0 0' }}>
            Your WA group&rsquo;s<br />pick&rsquo;em pool.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--ink-2)', margin: '18px 0 28px', maxWidth: 440 }}>
            Predict with your crew, office, or family. Auto scoring from live data, real-time standings — just share one link on WhatsApp.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <FBtn variant="primary" size="lg">⚽ Create a Group — Free</FBtn>
            <FBtn variant="secondary" size="lg">Join the Public Pool</FBtn>
          </div>
          <div style={{ display: 'flex', gap: 28, marginTop: 36 }}>
            {[['17k+', 'picks made'], ['900+', 'groups running'], ['4', 'competitions']].map(([n, l]) => (
              <span key={l}>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24 }}>{n}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{l}</span>
              </span>
            ))}
          </div>
        </div>
        {/* Right: live grup board preview — the product IS the leaderboard */}
        <div style={{ alignSelf: 'start' }}>
          <FCard pad={0} style={{ overflow: 'hidden', boxShadow: 'var(--shadow-3)' }}>
            <div style={{ padding: '14px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line-1)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>Tongkrongan FC</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>WC 2026 · 9 members</div>
              </div>
              <FPill tone="live" dot>JPN 1–0 SWE · 63&prime;</FPill>
            </div>
            {TKRG_MEMBERS.slice(0, 5).map((r) => (
              <FBoardRow key={r.rank} row={{ ...r, prov: r.rank === 2 ? 10 : r.rank === 1 ? 0 : undefined }} live={r.rank === 2} dense />
            ))}
            <div style={{ padding: '10px 16px', fontSize: 11.5, color: 'var(--ink-3)', background: 'var(--bg-deep)' }}>
              Provisional points update every 30 seconds while a match is live.
            </div>
          </FCard>
          <p style={{ fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center', marginTop: 10 }}>
            A real group board — yours will look like this tonight.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- 3. Wizard — step 1: group name + competition ------------------------------

function ScreenWizard1() {
  return (
    <FShell withNav={false}>
      <FTopBar right={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>Step 1/3</span>} />
      <div style={{ flex: 1, padding: '14px 18px 0', overflow: 'hidden' }}>
        <FSteps step={1} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: '-0.015em' }}>Your group, your rules</h2>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: '6px 0 18px' }}>Name it first — members join through a WA link, no one signs up one by one.</p>
        <FCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FField label="Group name" value="Tongkrongan FC" hint="Shows on the invite link + the WA standings card." />
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>Competition</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <FOptionCard selected title="World Cup 2026" sub="Running now · group stage, matchday 2" badge={<FPill tone="live" dot>Live</FPill>} />
                <FOptionCard title="EPL 2026/27" sub="Starts August — your group carries over" badge={<FPill>Soon</FPill>} />
              </div>
            </div>
          </div>
        </FCard>
        <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '12px 2px 0' }}>
          2 matchdays late? No problem — new members start from the group&rsquo;s median score.
        </p>
      </div>
      <div style={{ padding: '0 16px 24px' }}>
        <FBtn variant="primary" size="lg" full>Next → Game &amp; Scoring</FBtn>
      </div>
    </FShell>
  );
}

// ---- 4. Wizard — step 2: game type + scoring rules -------------------------------

function ScreenWizard2() {
  return (
    <FShell withNav={false}>
      <FTopBar right={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>Step 2/3</span>} />
      <div style={{ flex: 1, padding: '14px 18px 0', overflow: 'hidden' }}>
        <FSteps step={2} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: '-0.015em' }}>How does your group play?</h2>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: '6px 0 14px' }}>Two ways to play — you can run both side by side. Editable until the first lock.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <FOptionCard selected title="Match by match" sub="Pick each match as it opens — tonight first. Daily rhythm, easiest for newcomers." badge={<FPill tone="up">Default</FPill>} />
          <FOptionCard title="Bracket lock" sub="Lock group standings 1–4 up front, then the knockout bracket. Classic pool style — one big call." />
        </div>

        <FSectionHead>Scoring template</FSectionHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <FOptionCard selected title="Gibol Standard" sub="Match 2–5 pts · Tebak Skor exact +5 · knockouts climb to 30" badge={<FPill tone="up">Recommended</FPill>} />
          <FOptionCard title="Tebak Skor only" sub="Like your WA group plays now: exact 5 · margin 3 · result 2" />
          <FOptionCard title="Custom" sub="Set points per round yourself" />
        </div>

        <FCard pad={14} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <FField label="Match result" value="2" suffix="pts" mono />
            <FField label="Exact score" value="+5" suffix="pts" mono />
            <FField label="Final" value="30" suffix="pts" mono />
          </div>
          <div style={{ borderTop: '1px dashed var(--line-2)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Underdog bonus', 'Correct pick that <30% of the group chose → points ×1.5', true],
              ['Streak +3', '3 correct in a row = small bonus, clean reset', true],
              ['Late join = median score', 'New members never start from zero', true],
            ].map(([t, s, on]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{t}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>{s}</span>
                </span>
                <span aria-label={on ? 'on' : 'off'} style={{
                  width: 40, height: 24, borderRadius: 999, flexShrink: 0, position: 'relative',
                  background: on ? 'var(--p-up)' : 'var(--line-3)', transition: 'background 150ms',
                }}>
                  <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 18, height: 18, borderRadius: 999, background: '#fff', boxShadow: 'var(--shadow-1)' }} />
                </span>
              </div>
            ))}
          </div>
        </FCard>
      </div>
      <div style={{ padding: '0 16px 24px' }}>
        <FBtn variant="primary" size="lg" full>Next → Share</FBtn>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--ink-3)' }}>Free: 1 group · 10 members. Need more? Season Pass Rp 79k.</div>
      </div>
    </FShell>
  );
}

// ---- 5. Wizard — step 3: share ---------------------------------------------------

function ScreenWizard3() {
  return (
    <FShell withNav={false}>
      <FTopBar right={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>Step 3/3</span>} />
      <div style={{ flex: 1, padding: '14px 18px 0', overflow: 'hidden' }}>
        <FSteps step={3} />
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: '10px 0 0', letterSpacing: '-0.015em' }}>&ldquo;Tongkrongan FC&rdquo; is live!</h2>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: '6px auto 16px', maxWidth: 290 }}>
            Share this link — friends can start picking right away, <strong>no account needed first</strong>.
          </p>
        </div>
        <FCard pad={14} style={{ textAlign: 'center', borderStyle: 'dashed', borderColor: 'var(--line-3)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, letterSpacing: '0.02em' }}>gibol.co/g/TKRG26</span>
        </FCard>
        <div style={{ height: 10 }} />
        <FBtn variant="wa" size="lg" full icon={<WhatsAppIcon size={17} />}>Share to WhatsApp</FBtn>
        <div style={{ height: 8 }} />
        <FBtn variant="secondary" full>Copy Link</FBtn>

        <FSectionHead right={<FCapMeter n={1} cap={10} compact />}>Members</FSectionHead>
        <FCard pad={0}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line-1)' }}>
            <span style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--pickem-orange-wash)', color: 'var(--pickem-orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>Y</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>You 👑 <span style={{ fontWeight: 500, color: 'var(--ink-3)', fontSize: 12 }}>commissioner</span></span>
            <FPill tone="up">Picked</FPill>
          </div>
          <button style={{
            appearance: 'none', border: 'none', cursor: 'pointer', width: '100%',
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
            background: 'transparent', fontFamily: 'var(--font-ui-pickem)', textAlign: 'left',
          }}>
            <span style={{ width: 34, height: 34, borderRadius: 999, border: '1.5px dashed var(--line-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}><PlusIcon size={15} /></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)' }}>Add a manual entry</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)' }}>for offline friends — you pick on their behalf</span>
            </span>
            <FPill tone="prem">Pass</FPill>
          </button>
        </FCard>
      </div>
      <div style={{ padding: '0 16px 24px' }}>
        <FBtn variant="ghost" full>Later → go to my group</FBtn>
      </div>
    </FShell>
  );
}

// ---- 6. Invite landing (gibol.co/g/TKRG26 — guest, no signup wall) -----------------

function ScreenInviteLanding({ onStart }) {
  return (
    <FShell withNav={false}>
      <FTopBar right={<FNavChip>Sign in</FNavChip>} />
      <div style={{ flex: 1, padding: '18px 18px 0', overflow: 'hidden' }}>
        <FCard style={{ textAlign: 'center', padding: '20px 16px' }}>
          <FPill tone="up">Group invite</FPill>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '10px 0 0', letterSpacing: '-0.015em' }}>Tongkrongan FC</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 0' }}>World Cup 2026 · 7 members · created by @ade</p>
        </FCard>

        <FSectionHead right={<FPill tone="live" dot>3 matches tonight</FPill>}>Current standings</FSectionHead>
        <FCard pad={0}>
          {TKRG_MEMBERS.slice(0, 4).map((r) => (
            <FBoardRow key={r.rank} row={{ ...r, you: false, belum: false, name: r.name === 'You' ? 'Putri' : r.name }} dense />
          ))}
          <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink-3)' }}>+ 3 more — your name could sit above theirs tonight.</div>
        </FCard>

        <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--p-info-wash)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
          No login — picks are saved on your phone. An account (magic link) is only asked for when you <strong>lock</strong> picks to join the standings.
        </div>
      </div>
      <div style={{ padding: '0 16px 24px' }}>
        <FBtn variant="primary" size="lg" full onClick={onStart}>Start Picking Now</FBtn>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--ink-3)' }}>Free · starts with tonight&rsquo;s matches</div>
      </div>
    </FShell>
  );
}

Object.assign(window, {
  ScreenRootHome, DesktopRootHome, ScreenWizard1, ScreenWizard2, ScreenWizard3, ScreenInviteLanding,
});
