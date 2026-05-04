// V3 Primitives — refined token set + shared chrome
// Differences from v2: tighter type scale, refined chip system, unified hero pattern,
// editorial-grade type styles (serif display + mono captions), section-rule pattern.

const GBV3_TOKENS = `
  .gb3 {
    /* dark — primary */
    --bg: #0A1628; --bg-2: #0F1E36; --bg-3: #16273F; --bg-4: #1B2E4A;
    --line: #223552; --line-soft: #1A2A44; --line-loud: #2E4569;
    --ink: #E6EEF9; --ink-2: #B6C4D8; --ink-3: #7388A5; --ink-4: #4A5D7A; --ink-5: #2E4061;
    --blue: #3B82F6; --blue-2: #60A5FA; --blue-soft: rgba(59,130,246,.14);
    --amber: #F59E0B; --amber-2: #FBBF24; --amber-soft: rgba(245,158,11,.14);
    --live: #EF4444; --live-soft: rgba(239,68,68,.14);
    --up: #10B981; --down: #EF4444;
    --paper: #F5F1EA;

    /* sport accents — used SPARINGLY for routing chips, not floods */
    --nba: #F97316;
    --pl:  #22C55E;
    --f1:  #DC2626;
    --tennis: #EAB308;

    font-family: 'Inter Tight', -apple-system, Helvetica, Arial, sans-serif;
    background: var(--bg); color: var(--ink);
    -webkit-font-smoothing: antialiased; font-feature-settings: "ss01";
    width: 100%; height: 100%; overflow: hidden;
    font-size: 13px;
  }
  .gb3.light {
    --bg:#F5F1EA; --bg-2:#FFFFFF; --bg-3:#FAF7F2; --bg-4:#F0EAD9;
    --line:#E3DCCF; --line-soft:#EDE7DB; --line-loud:#CFC4AF;
    --ink:#0A0A0A; --ink-2:#333; --ink-3:#5C5C5C; --ink-4:#9A9A9A; --ink-5:#C9BFA9;
    --blue:#1E40AF; --amber:#C2410C;
    --blue-soft: rgba(30,64,175,.10); --amber-soft: rgba(194,65,12,.10); --live-soft: rgba(239,68,68,.10);
  }
  .gb3 *, .gb3 *::before, .gb3 *::after { box-sizing: border-box; }
  .gb3 .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
  .gb3 .serif { font-family: 'Newsreader', 'Source Serif 4', Georgia, serif; }
  .gb3 .tab  { font-variant-numeric: tabular-nums; }
  .gb3 .num { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }

  /* Live dot — same pulse */
  .gb3 .dot { width:6px; height:6px; border-radius:50%; display:inline-block; }
  .gb3 .dot.live { background: var(--live); box-shadow: 0 0 0 0 rgba(239,68,68,.6); animation: gb3pulse 1.6s infinite; }
  @keyframes gb3pulse { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.6)} 70%{box-shadow:0 0 0 7px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }

  /* Pills */
  .gb3 .pill { display:inline-flex; align-items:center; gap:5px; font:700 9.5px 'JetBrains Mono',monospace; padding:3px 7px; border-radius:999px; letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; }
  .gb3 .pill.live  { background: var(--live-soft);  color: var(--live); }
  .gb3 .pill.amber { background: var(--amber-soft); color: var(--amber); }
  .gb3 .pill.blue  { background: var(--blue-soft);  color: var(--blue-2); }
  .gb3 .pill.up    { background: rgba(16,185,129,.14); color: var(--up); }
  .gb3 .pill.muted { background: var(--bg-3); color: var(--ink-3); }
  .gb3 .pill.outline { background: transparent; border:1px solid var(--line); color: var(--ink-3); }

  /* Card */
  .gb3 .card { background: var(--bg-2); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .gb3 .card-head { display:flex; align-items:center; justify-content:space-between; padding: 11px 13px; border-bottom: 1px solid var(--line-soft); }
  .gb3 .card-title { font: 700 10px 'Inter Tight'; letter-spacing:.14em; text-transform:uppercase; color: var(--ink-3); }
  .gb3 .card-pad { padding: 13px; }

  /* Buttons */
  .gb3 .btn { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:6px; background: var(--bg-3); color: var(--ink-2); border:1px solid var(--line); font:600 11px 'Inter Tight'; cursor:pointer; }
  .gb3 .btn:hover { border-color: var(--line-loud); }
  .gb3 .btn.primary { background: var(--blue); color:#fff; border-color: var(--blue); }
  .gb3 .btn.amber { background: var(--amber); color:#0A1628; border-color: var(--amber); }
  .gb3 .btn.ghost { background: transparent; border-color: transparent; color: var(--ink-3); }
  .gb3 .btn.sm { padding:4px 8px; font-size:10.5px; }

  /* Layout helpers */
  .gb3 .row { display:flex; align-items:center; gap:8px; }
  .gb3 .spread { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .gb3 .col { display:flex; flex-direction:column; gap:8px; }
  .gb3 hr.soft { border:0; border-top: 1px solid var(--line-soft); margin: 8px 0; }
  .gb3 hr.loud { border:0; border-top: 1px solid var(--line); margin: 12px 0; }

  /* Section rule — for editorial structure */
  .gb3 .rule { display:flex; align-items:center; gap:10px; margin: 0 0 12px; }
  .gb3 .rule .lbl { font:800 10px 'JetBrains Mono'; letter-spacing:.18em; text-transform:uppercase; color: var(--ink-3); }
  .gb3 .rule .ln { flex:1; height:1px; background: var(--line); }
  .gb3 .rule.amber .lbl { color: var(--amber); }
  .gb3 .rule.amber .ln  { background: linear-gradient(90deg, var(--amber) 0, var(--line) 60px); }

  /* Headlines */
  .gb3 h1.disp { font: 800 32px/1.04 'Inter Tight'; letter-spacing:-.035em; margin:0; }
  .gb3 h2.disp { font: 800 22px/1.1 'Inter Tight'; letter-spacing:-.025em; margin:0; }
  .gb3 .kicker { font: 700 9.5px 'JetBrains Mono'; letter-spacing:.22em; text-transform:uppercase; color: var(--amber); }
  .gb3 .meta   { font: 600 9.5px 'JetBrains Mono'; letter-spacing:.1em; text-transform:uppercase; color: var(--ink-3); }
  .gb3 .deck { font: 500 13px/1.45 'Inter Tight'; color: var(--ink-2); }

  /* Sport tag — uniform routing chip */
  .gb3 .sport-tag { display:inline-flex; align-items:center; gap:6px; padding:3px 8px 3px 6px; border-radius:4px; background:var(--bg-3); border:1px solid var(--line); font:700 10px 'JetBrains Mono'; letter-spacing:.08em; }
  .gb3 .sport-tag .sw { width:6px; height:6px; border-radius:1px; }

  /* Article card */
  .gb3 .art { display:flex; flex-direction:column; gap:6px; cursor:pointer; }
  .gb3 .art .img { background:var(--bg-3); border:1px solid var(--line-soft); border-radius:8px; aspect-ratio: 16/9; display:flex; align-items:center; justify-content:center; color:var(--ink-4); font:600 10px 'JetBrains Mono'; letter-spacing:.1em; overflow:hidden; position:relative; }
  .gb3 .art:hover .head { color: var(--blue-2); }

  /* Scrollbar */
  .gb3::-webkit-scrollbar { width:8px; height:8px; } .gb3::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; } .gb3::-webkit-scrollbar-track { background: transparent; }

  /* Inputs */
  .gb3 input.gbi { background:var(--bg-3); border:1px solid var(--line); border-radius:6px; padding:6px 10px; color:var(--ink); font:500 12px 'Inter Tight'; outline:none; }
  .gb3 input.gbi::placeholder { color:var(--ink-3); }
  .gb3 input.gbi:focus { border-color: var(--blue); }

  /* Image placeholder hatching — used when there is no real photo */
  .gb3 .ph {
    background:
      linear-gradient(135deg, var(--bg-3) 0%, var(--bg-4) 100%);
    position:relative;
  }
  .gb3 .ph::after {
    content:''; position:absolute; inset:0;
    background-image: linear-gradient(45deg, rgba(255,255,255,.018) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.018) 50%, rgba(255,255,255,.018) 75%, transparent 75%, transparent);
    background-size: 8px 8px;
    pointer-events:none;
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('gb3-tokens')) {
  const s = document.createElement('style');
  s.id = 'gb3-tokens';
  s.textContent = GBV3_TOKENS;
  document.head.appendChild(s);
}

// Logo (matches v2)
function V3Logo({ size = 16, compact = false }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap: size*0.35, color:'var(--ink)', lineHeight:1 }}>
      <svg width={size*1.05} height={size*1.05} viewBox="0 0 24 24" fill="none" style={{ display:'block' }}>
        <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="12" cy="12" r="2.2" fill="currentColor"/>
        <path d="M12 0.5V4 M12 20V23.5 M0.5 12H4 M20 12H23.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      {!compact && (
        <span style={{ fontFamily:"'Inter Tight',sans-serif", fontWeight:900, fontSize:size*1.05, letterSpacing:'-0.055em' }}>
          gibol<span style={{ color:'var(--amber)' }}>.</span>
        </span>
      )}
    </div>
  );
}

// Crest
function V3Crest({ short, color, size = 22 }) {
  const lum = (() => {
    const h = color.replace('#','');
    const r = parseInt(h.slice(0,2),16)/255, g = parseInt(h.slice(2,4),16)/255, b = parseInt(h.slice(4,6),16)/255;
    return 0.2126*r + 0.7152*g + 0.0722*b;
  })();
  const fg = lum > 0.55 ? '#0A0A0A' : '#FFFFFF';
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background: color, color:fg,
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'Inter Tight',sans-serif", fontWeight:800, fontSize:size*0.4,
      flexShrink:0, boxShadow:'inset 0 -2px 0 rgba(0,0,0,.18)',
    }}>{short}</div>
  );
}

// Sport icons — monoline SVGs, no emoji
const SPORT_COLORS = {
  NBA: 'var(--nba)', PL: 'var(--pl)', Football: 'var(--pl)',
  F1: 'var(--f1)', Tennis: 'var(--tennis)',
  WC: 'var(--blue-2)', Liga1:'var(--pl)',
};
function V3SportIcon({ sport, size = 14 }) {
  const s = size, c = 'currentColor';
  const props = { width:s, height:s, viewBox:'0 0 24 24', fill:'none', stroke:c, strokeWidth:1.6, strokeLinecap:'round', strokeLinejoin:'round', style:{ display:'block', flexShrink:0 } };
  switch (sport) {
    case 'NBA': return (
      <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18 M12 3v18 M5.6 5.6c3 4.5 3 8.3 0 12.8 M18.4 5.6c-3 4.5-3 8.3 0 12.8"/></svg>
    );
    case 'PL': case 'Football': case 'Liga1': return (
      <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.7H9.5L8 10z M12 3v4 M21 12h-4 M3 12h4 M12 21v-4"/></svg>
    );
    case 'F1': return (
      <svg {...props}><path d="M3 18h12 M3 14h18 M3 10h18 M3 6h12"/><circle cx="18" cy="18" r="2"/></svg>
    );
    case 'Tennis': return (
      <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3.5 9c4 1 9 1 13-2 M3.5 15c4-1 9-1 13 2"/></svg>
    );
    case 'WC': return (
      <svg {...props}><path d="M7 4h10v6a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v2a3 3 0 0 0 3 3 M17 6h3v2a3 3 0 0 1-3 3 M9 20h6 M12 15v5"/></svg>
    );
    default: return <span style={{ width:size, height:size, borderRadius:'50%', background:'var(--ink-4)', display:'inline-block' }}/>;
  }
}

function V3SportTag({ sport, label }) {
  return (
    <span className="sport-tag" style={{ color: 'var(--ink-2)' }}>
      <span className="sw" style={{ background: SPORT_COLORS[sport] }}/>
      {label || sport}
    </span>
  );
}

// Sparkline
function V3Spark({ data, w = 100, h = 28, color = 'var(--blue)', fill = true }) {
  const min = Math.min(...data), max = Math.max(...data), span = max-min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v,i) => [i*step, h - ((v-min)/span)*(h-4) - 2]);
  const d = pts.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display:'block' }}>
      {fill && <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity=".12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function V3Momentum({ value, home, away, h = 5 }) {
  const v = Math.max(0.04, Math.min(0.96, value));
  return (
    <div style={{ width:'100%', height:h, background: away, borderRadius:h, overflow:'hidden', position:'relative' }}>
      <div style={{ width: (v*100)+'%', height:'100%', background: home, transition:'width .4s' }} />
    </div>
  );
}

function V3Board({ children, theme = 'dark', style = {}, padding = 0, scroll = true }) {
  return (
    <div className={`gb3 ${theme === 'light' ? 'light' : ''}`} style={{
      overflow: scroll ? 'auto' : 'hidden',
      padding,
      ...style,
    }}>
      {children}
    </div>
  );
}

// Section rule — used everywhere editorial
function V3Rule({ label, action, amber=false }) {
  return (
    <div className={`rule${amber?' amber':''}`}>
      <span className="lbl">{label}</span>
      <span className="ln"/>
      {action}
    </div>
  );
}

// Image placeholder — visual filler with a label and gradient based on sport
function V3Imagery({ sport='NBA', label='', ratio='16/9', tint, style={} }) {
  const c = tint || SPORT_COLORS[sport] || 'var(--ink-4)';
  return (
    <div className="ph" style={{
      aspectRatio: ratio, borderRadius:8, border:'1px solid var(--line-soft)',
      backgroundImage: `linear-gradient(135deg, ${c}22 0%, var(--bg-3) 60%, var(--bg-4) 100%)`,
      display:'flex', alignItems:'flex-end', justifyContent:'flex-start',
      padding:10, position:'relative', overflow:'hidden', ...style,
    }}>
      <span className="mono" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'.18em', textTransform:'uppercase', position:'relative', zIndex:1 }}>
        {label || `[ ${sport} IMAGERY ]`}
      </span>
    </div>
  );
}

Object.assign(window, {
  V3Logo, V3Crest, V3SportIcon, V3SportTag,
  V3Spark, V3Momentum, V3Board, V3Rule, V3Imagery,
  SPORT_COLORS,
});
