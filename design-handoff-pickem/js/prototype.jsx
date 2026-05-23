// =====================================================================
// Gibol Pick'em — Interactive Prototype
// =====================================================================
// Routes between screens with state. Sits inside an IOSDevice frame.
// Demonstrates the four critical flows:
//   1. First-prediction-as-guest → claim
//   2. Create grup → invite → join
//   3. Build & lock the bracket
//   4. Matchday result → recap → share
// =====================================================================

function PickemPrototype() {
  const [route, setRoute] = React.useState({ name: 'predict' });
  const [showFirstRun, setShowFirstRun] = React.useState(false);
  const [showInvite, setShowInvite] = React.useState(false);
  const [showShare, setShowShare] = React.useState(false);
  const [showToast, setShowToast] = React.useState(null);

  // Show first-run nudge briefly after landing
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (route.name === 'fixture') setShowFirstRun(true);
    }, 2000);
    return () => clearTimeout(t);
  }, [route.name]);

  const go = (name, payload = {}) => setRoute({ name, ...payload });

  const handleNav = (k) => {
    if (k === 'predict') return go('predict');
    if (k === 'board')   return go('leaderboard');
    if (k === 'grup')    return go('grupList');
    if (k === 'profile') return go('profile');
  };

  let body = null;
  if (route.name === 'predict') {
    body = <ScreenPredictingHub onOpenFixture={(f) => go('fixture', { fixture: f })} onNav={handleNav} />;
  } else if (route.name === 'fixture') {
    body = <ScreenFixtureDetail fixture={route.fixture || SAMPLE_FIXTURES[0]} onBack={() => go('predict')} onShare={() => setShowShare(true)} />;
  } else if (route.name === 'leaderboard') {
    body = <ScreenLeaderboard onNav={handleNav} />;
  } else if (route.name === 'grupList') {
    body = <ScreenGrupList
      onOpenGrup={(g) => go(g.id === 'g3' ? 'grupEmpty' : 'grupHome', { grup: g })}
      onCreate={() => go('grupCreate')}
      onJoin={() => setShowToast({ tone: 'info', text: 'Masukkan kode grup…' })}
      onNav={handleNav}
    />;
  } else if (route.name === 'grupHome') {
    body = <ScreenGrupHome grup={route.grup || GRUPS[0]} onBack={() => go('grupList')} onInvite={() => setShowInvite(true)} />;
  } else if (route.name === 'grupEmpty') {
    body = <ScreenGrupEmpty onBack={() => go('grupList')} onInvite={() => setShowInvite(true)} />;
  } else if (route.name === 'grupCreate') {
    body = <ScreenGrupCreate onBack={() => go('grupList')} onCreated={() => { setShowInvite(true); go('grupList'); }} />;
  } else if (route.name === 'bracket') {
    body = <ScreenBracket onNav={handleNav} onLocked={() => { setShowToast({ tone: 'success', text: 'Bracket dikunci!' }); go('predict'); }} />;
  } else if (route.name === 'survivor') {
    body = <ScreenSurvivor onNav={handleNav} />;
  } else if (route.name === 'profile') {
    body = <ScreenProfile onNav={handleNav} />;
  } else if (route.name === 'magiclink') {
    body = <ScreenMagicLinkSent onBack={() => go('predict')} />;
  } else if (route.name === 'offline') {
    body = <ScreenOffline onRetry={() => go('predict')} onNav={handleNav} />;
  }

  // auto-dismiss toast
  React.useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(null), 2400);
    return () => clearTimeout(t);
  }, [showToast]);

  return (
    <div data-theme="dark" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-base)', fontFamily: 'var(--font-ui-pickem)' }}>
      {body}

      {/* Overlays */}
      {showInvite && <ScreenInviteSheet onClose={() => setShowInvite(false)} />}
      {showShare && <ScreenShareSheet onClose={() => setShowShare(false)} />}
      {showFirstRun && (
        <ScreenFirstRunNudge
          onLater={() => setShowFirstRun(false)}
          onClaim={() => { setShowFirstRun(false); go('magiclink'); }}
        />
      )}

      {/* Toast */}
      {showToast && (
        <div style={{
          position: 'absolute', top: 64, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          zIndex: 200, pointerEvents: 'none',
        }}>
          <Toast tone={showToast.tone} visible icon={<CheckIcon size={14} />}>
            {showToast.text}
          </Toast>
        </div>
      )}

      {/* Floating nav helper: jump between flows */}
      <FlowJumper route={route.name} onJump={go} />
    </div>
  );
}

// Pinned strip outside the phone, but inside the prototype container,
// that lets you jump to any screen for demo purposes.
function FlowJumper({ route, onJump }) {
  const flows = [
    { k: 'predict',     l: 'Prediksi' },
    { k: 'fixture',     l: 'Match' },
    { k: 'leaderboard', l: 'Papan' },
    { k: 'grupList',    l: 'Grups' },
    { k: 'grupHome',    l: 'Grup' },
    { k: 'grupEmpty',   l: 'Empty' },
    { k: 'grupCreate',  l: 'Create' },
    { k: 'bracket',     l: 'Bracket' },
    { k: 'survivor',    l: 'Surv' },
    { k: 'profile',     l: 'Profile' },
    { k: 'magiclink',   l: 'Auth' },
    { k: 'offline',     l: 'Offline' },
  ];
  return (
    <div style={{
      position: 'absolute', top: 0, right: -174, width: 160,
      padding: 10, background: 'transparent',
      display: 'flex', flexDirection: 'column', gap: 4,
      fontFamily: 'var(--font-mono)', fontSize: 11,
    }}>
      <div style={{ color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>JUMP TO</div>
      {flows.map((f) => {
        const sel = route === f.k;
        return (
          <button key={f.k} onClick={() => onJump(f.k)} style={{
            appearance: 'none', cursor: 'pointer',
            textAlign: 'left', padding: '6px 10px', borderRadius: 6,
            background: sel ? 'var(--pickem-orange)' : 'var(--bg-raised)',
            color: sel ? '#0A1628' : 'var(--ink-2)',
            border: '1px solid ' + (sel ? 'var(--pickem-orange)' : 'var(--line-1)'),
            fontFamily: 'var(--font-ui-pickem)', fontWeight: 600, fontSize: 12,
          }}>{f.l}</button>
        );
      })}
    </div>
  );
}

Object.assign(window, { PickemPrototype, FlowJumper });
