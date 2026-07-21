// =====================================================================
// Flagship — the 90-second teach, interactive (the spine of this pass)
// Invite link → first confirmed pick in ≤3 taps. Tap counter included.
// Copy: English first, Indonesian second (CLAUDE.md rule).
// =====================================================================

const TEACH_BEATS = [
  { k: 'invite', t: '0–5 s',  l: 'Tap the WA link',      d: 'Group name + real friends on a live board. No signup wall.' },
  { k: 'pick',   t: '5–15 s', l: 'One tap = one pick',   d: 'Tonight\u2019s matches first — not the bracket, not 12 groups.' },
  { k: 'reveal', t: '15–45 s', l: 'Consensus reveals',   d: 'Variable reward after commitment — keeps picks independent.' },
  { k: 'lock',   t: '45–90 s', l: 'Lock → magic link',   d: 'Login is only asked here. Guest picks merge into the account.' },
];

function TeachRail({ stage, taps, firstPickAt, onReset }) {
  const stageIdx = { invite: 0, pick: 1, reveal: 2, lock: 3, done: 3 }[stage] ?? 0;
  return (
    <div style={{
      width: 252, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
      fontFamily: 'var(--font-ui-pickem)', color: 'var(--ink-1)',
    }}>
      <div className="p-eyebrow" style={{ fontSize: 10 }}>The 90-second teach · 03 §A</div>
      {TEACH_BEATS.map((b, i) => {
        const on = i === stageIdx, past = i < stageIdx;
        return (
          <div key={b.k} style={{
            padding: '10px 12px', borderRadius: 11,
            background: on ? 'var(--pickem-orange-wash)' : 'var(--bg-raised)',
            border: '1px solid ' + (on ? 'var(--pickem-orange)' : 'var(--line-1)'),
            opacity: past ? 0.55 : 1, transition: 'all 200ms var(--ease-out)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{past ? '✓ ' : ''}{b.l}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, color: on ? 'var(--pickem-orange)' : 'var(--ink-3)', letterSpacing: '0.05em' }}>{b.t}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.45 }}>{b.d}</div>
          </div>
        );
      })}
      <div style={{
        padding: '12px 14px', borderRadius: 11, background: 'var(--ink-1)', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 30, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{taps}</span>
        <span style={{ fontSize: 11.5, lineHeight: 1.4, opacity: 0.85 }}>
          taps since landing
          {firstPickAt
            ? <strong style={{ display: 'block', color: '#7CDBA8' }}>first pick at tap {firstPickAt} ✓ (target ≤3)</strong>
            : <span style={{ display: 'block', opacity: 0.7 }}>target: first pick in ≤3 taps</span>}
        </span>
      </div>
      <button onClick={onReset} style={{
        appearance: 'none', cursor: 'pointer', border: '1px solid var(--line-2)',
        background: 'transparent', color: 'var(--ink-2)', borderRadius: 999,
        padding: '9px 14px', fontFamily: 'var(--font-ui-pickem)', fontSize: 12.5, fontWeight: 700,
      }}>↺ Replay from the WA link</button>
    </div>
  );
}

// Pick stage screen — Tonight wired for the teach
function TeachPickScreen({ picks, onPick, onLock, toast }) {
  const n = Object.values(picks).filter(Boolean).length;
  return (
    <FShell navActive="tebak"
      topbar={<FTopBar right={<FNavChip active>Tongkrongan FC ▾</FNavChip>} border={false} />}
      cta={<FStickyCTA label={`Lock Picks (${n})`} sub="Login (magic link) is only asked here" onClick={onLock} disabled={n === 0} />}
    >
      <FPlayTabs active="malam" />
      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 16px 0', position: 'relative' }}>
        {toast && (
          <div className="f-reveal" role="status" style={{
            position: 'absolute', top: 6, left: 16, right: 16, zIndex: 10,
            background: 'var(--p-up)', color: '#fff', borderRadius: 999,
            padding: '9px 16px', fontSize: 12.5, fontWeight: 700, textAlign: 'center',
            boxShadow: 'var(--shadow-pop)', fontFamily: 'var(--font-ui-pickem)',
          }}>{toast}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 600, margin: 0, letterSpacing: '-0.015em' }}>
            {n === 0 ? 'Tonight\u2019s matches' : `${3 - n > 0 ? `${3 - n} more tonight` : 'All picked for tonight'}`}
          </h2>
          <span className="p-eyebrow" style={{ fontSize: 10 }}>Thu · Jun 11</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TONIGHT.map((fx) => (
            <FixtureTapCard key={fx.id} fx={fx} value={picks[fx.id] || null} onPick={(v) => onPick(fx.id, v)} />
          ))}
        </div>
      </div>
    </FShell>
  );
}

// Magic-link sheet + done state
function TeachLockScreen({ stage, onSend, onBack }) {
  return (
    <FShell navActive="tebak" topbar={<FTopBar right={<FNavChip active>Tongkrongan FC ▾</FNavChip>} border={false} />}>
      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 16px 0', filter: stage === 'lock' ? 'blur(1px)' : 'none', opacity: stage === 'lock' ? 0.5 : 1 }}>
        {stage === 'done' ? (
          <div className="f-reveal">
            <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
              <span style={{
                width: 56, height: 56, borderRadius: 999, background: 'var(--p-up)', color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}><CheckIcon size={26} /></span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: '12px 0 4px' }}>3 picks locked</h2>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>You&rsquo;re officially on the Tongkrongan FC board.</p>
            </div>
            <FSectionHead>Your spot right now</FSectionHead>
            <FCard pad={0}>
              {[
                { rank: 7, name: 'Tono', points: 51, movement: 0 },
                { rank: 8, name: 'You', points: 47, movement: 0, you: true },
                { rank: 9, name: 'Joko', points: 30, movement: 0 },
              ].map((r) => <FBoardRow key={r.rank} row={r} dense />)}
            </FCard>
            <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '12px 4px 0', lineHeight: 1.55 }}>
              You start from the <strong>group&rsquo;s median score</strong> — joining late doesn&rsquo;t mean losing. Your first match counts tonight. 🔥
            </p>
          </div>
        ) : (
          <div style={{ paddingTop: 8 }}>
            <FSectionHead>Your picks (3)</FSectionHead>
            <FCard pad={0}>
              {TONIGHT.map((fx, i) => (
                <div key={fx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < 2 ? '1px solid var(--line-1)' : 'none' }}>
                  <Flag team={fx.home} w={24} h={17} round={3} />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{TEAMS[fx.home].name} vs {TEAMS[fx.away].name}</span>
                  <FPill tone="up">{TEAMS[fx.home].short} win</FPill>
                </div>
              ))}
            </FCard>
          </div>
        )}
      </div>
      {stage === 'lock' && (
        <FSheet onClose={onBack} title="Lock with your email">
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '2px 0 14px', lineHeight: 1.5 }}>
            One link, no password. The picks saved on your phone merge into your account automatically.
          </p>
          <FField label="Email" value="putri@gmail.com" mono />
          <div style={{ height: 12 }} />
          <FBtn variant="primary" size="lg" full onClick={onSend}>Send Magic Link</FBtn>
          <div style={{ height: 8 }} />
          <FBtn variant="ghost" full onClick={onBack}>Go back — still editing</FBtn>
        </FSheet>
      )}
    </FShell>
  );
}

function TeachProto() {
  const [stage, setStage] = React.useState('invite');   // invite → pick → reveal → lock → done
  const [picks, setPicks] = React.useState({});
  const [taps, setTaps] = React.useState(0);
  const [firstPickAt, setFirstPickAt] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const toastTimer = React.useRef(null);

  const reset = () => {
    setStage('invite'); setPicks({}); setTaps(0); setFirstPickAt(null); setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  };

  const start = () => { setTaps((t) => t + 1); setStage('pick'); };

  const pick = (id, v) => {
    const t = taps + 1;
    setTaps(t);
    setPicks((p) => ({ ...p, [id]: v }));
    if (v && firstPickAt === null) {
      setFirstPickAt(t);
      setStage('reveal');
      setToast('Pick saved on your phone ✓');
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2400);
    }
  };

  const lock = () => { setTaps((t) => t + 1); setStage('lock'); };
  const send = () => { setTaps((t) => t + 1); setStage('done'); };
  const backToPick = () => setStage('reveal');

  return (
    <div style={{ display: 'flex', gap: 22, width: '100%', height: '100%', alignItems: 'flex-start' }}>
      <div style={{ width: 390, height: 844, flexShrink: 0 }}>
        <IOSDevice width={390} height={844}>
          {stage === 'invite' && <ScreenInviteLanding onStart={start} />}
          {(stage === 'pick' || stage === 'reveal') && (
            <TeachPickScreen picks={picks} onPick={pick} onLock={lock} toast={toast} />
          )}
          {(stage === 'lock' || stage === 'done') && (
            <TeachLockScreen stage={stage} onSend={send} onBack={backToPick} />
          )}
        </IOSDevice>
      </div>
      <TeachRail stage={stage} taps={taps} firstPickAt={firstPickAt} onReset={reset} />
    </div>
  );
}

Object.assign(window, { TeachProto });
