// =====================================================================
// Flagship — canvas assembler
// Copy: English first, Indonesian second (CLAUDE.md rule).
// =====================================================================

const FM_W = 390, FM_H = 844;

function FPhone({ children }) {
  return <IOSDevice width={FM_W} height={FM_H}>{children}</IOSDevice>;
}

function PassBrief() {
  const rows = [
    ['Language', 'English first, Indonesian second (project rule). Named mechanics keep their Indonesian names — Tebak Skor, WA colek.'],
    ['Theme', 'Paper, lightened: near-white base (#F7F9FB), white cards, cool-grey rail. Same type stack: Newsreader + Inter Tight + JetBrains Mono, --pickem-orange accent.'],
    ['Two game types', 'Match by match (default — tonight first, daily habit) and Bracket Lock (lock group standings 1–4 up front, knockout derives — classic pool style). Commissioner picks in the wizard; both can run side by side.'],
    ['First touch', 'Tonight = the default surface. One tap on a team row = one pick. Bracket & 12-group ranking are power-user tabs.'],
    ['Consensus', 'Reveals AFTER you pick (free) — variable reward post-commitment. Pre-pick = Gibol+.'],
    ['Moat', 'Provisional points (amber, live feed) on the standings while matches run — PlayoffPickems has no live layer.'],
    ['Paywall', 'The 10-member cap reads warm (9/10 · 1 slot left). Member #11 waits at the door → commissioner upgrade sheet.'],
    ['Teach', 'The 90-second teach is the spine — interactive prototype in section 04, first pick in ≤3 taps (measured).'],
  ];
  return (
    <div className="g-root" style={{
      width: '100%', height: '100%', background: 'var(--bg-base)', boxSizing: 'border-box',
      padding: 28, fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)', overflow: 'hidden',
    }}>
      <div className="p-eyebrow" style={{ marginBottom: 8 }}>Flagship pass · Jun 11 2026 · companions: 03-game-mechanics.md + 04-design-prompt.md</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.018em', lineHeight: 1.1, marginBottom: 18 }}>
        Pick&rsquo;em becomes the product at gibol.co —<br />six steps, one daily loop.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '128px 1fr', rowGap: 11, columnGap: 16, maxWidth: 760 }}>
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pickem-orange)', paddingTop: 1 }}>{k}</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{v}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function FlagshipApp() {
  return (
    <DesignCanvas>
      <DCSection id="brief" title="00 · Pass brief"
        subtitle="What this pass ships and the decisions behind it. Wireframes 02 → hi-fi, mechanics from 03.">
        <DCArtboard id="brief-card" label="Pass decisions" width={880} height={560}>
          <PassBrief />
        </DCArtboard>
      </DCSection>

      <DCSection id="akuisisi" title="01 · Acquisition — root home → group → invite"
        subtitle="Step 6 (root swap) + Step 2 (3-step wizard + invite landing). The hero sells to commissioners; the invite landing sells to players — public standings as social proof.">
        <DCArtboard id="root-home" label="gibol.co/ · new root home" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenRootHome /></FPhone>
        </DCArtboard>
        <DCArtboard id="wizard-1" label="/buat-grup · 1 — name + competition" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenWizard1 /></FPhone>
        </DCArtboard>
        <DCArtboard id="wizard-2" label="/buat-grup · 2 — game type + scoring (scoring_config)" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenWizard2 /></FPhone>
        </DCArtboard>
        <DCArtboard id="wizard-3" label="/buat-grup · 3 — share to WA" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenWizard3 /></FPhone>
        </DCArtboard>
        <DCArtboard id="invite" label="/g/TKRG26 · invite landing (guest)" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenInviteLanding /></FPhone>
        </DCArtboard>
        <DCArtboard id="root-desktop" label="Root home · desktop 1280 (only desktop adaptation)" width={1280} height={760}>
          <DesktopRootHome />
        </DCArtboard>
      </DCSection>

      <DCSection id="main" title="02 · Play — two game types, Tebak Skor, provisional points"
        subtitle="Step 1 (first touch = tonight's matches, one tap) + Step 4 (Tebak Skor variant + live standings) + the second game type: Bracket Lock, where group standings are locked up front and the knockout derives from them. Consensus reveals post-pick; the JPN row on the first card is pre-selected as the example.">
        <DCArtboard id="malam-ini" label="Tonight tab · default for every member (interactive — try tapping)" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenMalamIni /></FPhone>
        </DCArtboard>
        <DCArtboard id="tebak-skor" label="Tebak Skor variant · exact 5 / margin 3 / result 2 (interactive)" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenTebakSkor /></FPhone>
        </DCArtboard>
        <DCArtboard id="bracket-lock" label="Bracket Lock · game type 2 — standings 1–4 → knockout (interactive)" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenBracketLock /></FPhone>
        </DCArtboard>
        <DCArtboard id="live-board" label="Live standings · amber provisional points" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenLiveBoard /></FPhone>
        </DCArtboard>
      </DCSection>

      <DCSection id="grup" title="03 · Group & monetization"
        subtitle="Step 5: group home + commissioner panel + WA nudge, then the social-pressure paywall (Rina waiting at the door), the pricing ladder, and the WA matchday standings card — the share artifact that turns WhatsApp into the table. The legal note sticks to every payment moment.">
        <DCArtboard id="grup-home" label="/grup/tkrg26 · group home + commissioner panel" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenGrupHome /></FPhone>
        </DCArtboard>
        <DCArtboard id="upgrade" label="Upgrade sheet · member #11 pending" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenUpgradeSheet /></FPhone>
        </DCArtboard>
        <DCArtboard id="harga" label="/harga · 4 tiers, 2 personas" width={FM_W + 30} height={FM_H + 60}>
          <FPhone><ScreenHarga /></FPhone>
        </DCArtboard>
        <DCArtboard id="wa-card" label="WA standings card · 4:5 PNG (1080×1350), shown at 1/3" width={360} height={450}>
          <WAStandingsCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="teach" title="04 · The 90-second teach — interactive"
        subtitle="Click inside the phone: WA link → Start Picking → tap a team → consensus reveals → Lock → magic link. The right rail counts taps; target is first pick ≤3 taps from landing.">
        <DCArtboard id="teach-proto" label="Prototype · run it yourself" width={FM_W + 300} height={FM_H + 60}>
          <TeachProto />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<FlagshipApp />);
