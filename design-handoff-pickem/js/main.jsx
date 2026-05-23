// =====================================================================
// Gibol Pick'em — Canvas assembler
// =====================================================================

const M_W = 390;
const M_H = 844;
const D_W = 1280;
const D_H = 880;

// Helper — wraps any screen content in an iOS device frame for a mobile artboard
function Phone({ children, dark = true }) {
  return (
    <IOSDevice width={M_W} height={M_H} dark={dark}>
      {children}
    </IOSDevice>
  );
}

function PickemApp() {
  return (
    <DesignCanvas>

      {/* ── 00 · Commit + system ─────────────────────────────────── */}
      <DCSection id="commit" title="00 · Stadium Night — committed"
        subtitle="What we ship: dark substrate, amber CTA, mono numerals, Newsreader on big moments only. C-grammar reserved for the share card.">
        <DCArtboard id="commit-card" label="Why this direction" width={840} height={600}>
          <CommitCard />
        </DCArtboard>
      </DCSection>

      {/* ── 01 · Design system reference ────────────────────────── */}
      <DCSection id="system" title="01 · Design system"
        subtitle="Tokens, components, motion. Everything below reads from these.">
        <DCArtboard id="tokens" label="Tokens · surfaces / ink / accent / type" width={1200} height={720}>
          <TokensCard />
        </DCArtboard>
        <DCArtboard id="inventory" label="Component inventory" width={1100} height={680}>
          <ComponentInventoryCard />
        </DCArtboard>
        <DCArtboard id="motion" label="Motion spec · 6 named moments" width={1100} height={620}>
          <MotionSpecCard />
        </DCArtboard>
      </DCSection>

      {/* ── 02 · Mobile screens ─────────────────────────────────── */}
      <DCSection id="mobile" title="02 · Mobile screens"
        subtitle="Every screen in §6 of the brief. Designed at 390×844; same components reflow to desktop.">

        <DCArtboard id="hub" label="Prediksi · today's matches (4 fixture states)" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenPredictingHub onOpenFixture={() => {}} onNav={() => {}} /></Phone>
        </DCArtboard>

        <DCArtboard id="fixture-detail" label="Fixture detail · open" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenFixtureDetail fixture={SAMPLE_FIXTURES[0]} onBack={() => {}} onShare={() => {}} /></Phone>
        </DCArtboard>

        <DCArtboard id="leaderboard" label="Leaderboard · podium + sticky your-rank" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenLeaderboard onNav={() => {}} /></Phone>
        </DCArtboard>

        <DCArtboard id="grups" label="Grups · list" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenGrupList onOpenGrup={() => {}} onCreate={() => {}} onJoin={() => {}} onNav={() => {}} /></Phone>
        </DCArtboard>

        <DCArtboard id="grup-home" label="Grup home · thriving" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenGrupHome onBack={() => {}} onInvite={() => {}} /></Phone>
        </DCArtboard>

        <DCArtboard id="grup-empty" label="Grup home · empty (the most important state)" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenGrupEmpty onBack={() => {}} onInvite={() => {}} /></Phone>
        </DCArtboard>

        <DCArtboard id="grup-create" label="Grup · create" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenGrupCreate onBack={() => {}} onCreated={() => {}} /></Phone>
        </DCArtboard>

        <DCArtboard id="survivor" label="Survivor · Fan Terakhir (alive)" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenSurvivor onNav={() => {}} /></Phone>
        </DCArtboard>

        <DCArtboard id="profile" label="Profile · stats + badges + history" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenProfile onNav={() => {}} /></Phone>
        </DCArtboard>

        <DCArtboard id="auth" label="Magic-link sent" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenMagicLinkSent onBack={() => {}} /></Phone>
        </DCArtboard>

        <DCArtboard id="offline" label="System · offline state" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenOffline onRetry={() => {}} onNav={() => {}} /></Phone>
        </DCArtboard>
      </DCSection>

      {/* ── 03 · The phone-bracket (the hardest problem) ────────── */}
      <DCSection id="bracket" title="03 · The phone bracket"
        subtitle="48 teams → 32 knockout on a 390-wide screen. Solution: stage-by-stage paging with a sticky stepper. Each stage uses the pattern best suited to it.">
        <DCArtboard id="bracket-r16" label="R16 — list of matchups, tap to pick" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenBracket onNav={() => {}} onLocked={() => {}} /></Phone>
        </DCArtboard>
        <DCArtboard id="bracket-group" label="Group stage — pick 1/2/3 with horizontal group switcher" width={840} height={680}>
          <BracketGroupStandalone />
        </DCArtboard>
        <DCArtboard id="bracket-champion" label="Champion celebration" width={420} height={520}>
          <div data-theme="dark" style={{ width: '100%', height: '100%', background: 'var(--bg-base)', padding: 24, boxSizing: 'border-box', color: 'var(--ink-1)', fontFamily: 'var(--font-ui-pickem)' }}>
            <BracketChampion team="ARG" />
          </div>
        </DCArtboard>
        <DCArtboard id="bracket-desktop" label="Desktop · full tree" width={D_W} height={780}>
          <DesktopBracketView />
        </DCArtboard>
      </DCSection>

      {/* ── 04 · Recap (Kartu Bola, 4:5) ────────────────────────── */}
      <DCSection id="recap" title="04 · Recap card · 3 variants"
        subtitle="The WhatsApp asset. Engineered at 4:5 (1080×1350). Kartu Bola grammar — flag rail, big mono numerals, paper substrate. Read legible at thumbnail.">
        <DCArtboard id="recap-big" label="Variant 1 · Big-win" width={340} height={420}>
          <RecapBigWin />
        </DCArtboard>
        <DCArtboard id="recap-upset" label="Variant 2 · Called-the-upset" width={340} height={420}>
          <RecapUpset />
        </DCArtboard>
        <DCArtboard id="recap-grup" label="Variant 3 · Grup rank-up" width={340} height={420}>
          <RecapGrupUp />
        </DCArtboard>
        <DCArtboard id="recap-share" label="In-app share sheet · live on a phone" width={M_W + 30} height={M_H + 60}>
          <Phone><ScreenShareSheet onClose={() => {}} /></Phone>
        </DCArtboard>
      </DCSection>

      {/* ── 05 · Desktop reflow ─────────────────────────────────── */}
      <DCSection id="desktop" title="05 · Desktop reflow"
        subtitle="Same components, side nav + content + right rail. Never a parallel design.">
        <DCArtboard id="desktop-predict" label="Predicting · 1280" width={D_W} height={D_H}>
          <DesktopPredicting />
        </DCArtboard>
        <DCArtboard id="desktop-board" label="Leaderboard · 1280" width={D_W} height={D_H}>
          <DesktopLeaderboard />
        </DCArtboard>
      </DCSection>

      {/* ── 06 · Interactive prototype ──────────────────────────── */}
      <DCSection id="proto" title="06 · Interactive prototype"
        subtitle="Tap inside the phone to navigate. Use the &lsquo;Jump to&rsquo; panel on the right to leap to any screen. First-run claim sheet auto-appears 2s after opening a fixture.">
        <DCArtboard id="prototype" label="Phone — full flow" width={M_W + 220} height={M_H + 60}>
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ width: M_W, height: M_H, position: 'absolute', left: 0, top: 0 }}>
              <IOSDevice width={M_W} height={M_H} dark>
                <PickemPrototype />
              </IOSDevice>
            </div>
          </div>
        </DCArtboard>
      </DCSection>

      {/* ── 07 · Flows ──────────────────────────────────────────── */}
      <DCSection id="flows" title="07 · Critical user flows"
        subtitle="Four journeys, step by step.">
        <DCArtboard id="flows" label="A · First prediction → claim · B · Create grup → invite · C · Build bracket · D · Recap → share" width={1180} height={740}>
          <FlowsCard />
        </DCArtboard>
      </DCSection>

      {/* ── 08 · Copy deck ─────────────────────────────────────── */}
      <DCSection id="copy" title="08 · Copy deck — Bahasa Indonesia"
        subtitle="Casual register, kamu in chrome, banned words enforced.">
        <DCArtboard id="copy" label="All surface strings" width={1180} height={900}>
          <CopyDeckCard />
        </DCArtboard>
      </DCSection>

      {/* ── 09 · Accessibility ─────────────────────────────────── */}
      <DCSection id="a11y" title="09 · Accessibility — WCAG 2.2 AA"
        subtitle="Verified pairs, focus, keyboard, SR labels.">
        <DCArtboard id="a11y" label="Cross-cutting rules + contrast pairs + SR labels" width={1180} height={760}>
          <A11yCard />
        </DCArtboard>
      </DCSection>

    </DesignCanvas>
  );
}

// Standalone wrapper for the group stage artboard (needs its own state)
function BracketGroupStandalone() {
  const b = useBracketState();
  return (
    <div data-theme="dark" style={{ width: '100%', height: '100%', background: 'var(--bg-base)', padding: 24, boxSizing: 'border-box', color: 'var(--ink-1)', fontFamily: 'var(--font-ui-pickem)', overflow: 'auto' }}>
      <BracketGroupStage groups={b.groups} setPick={b.setGroupPick} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<PickemApp />);
