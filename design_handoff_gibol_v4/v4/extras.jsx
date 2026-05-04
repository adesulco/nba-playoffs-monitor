// V4 — extras layered on top of v3 primitives.
// - Tweaks state (broadcast via window event so any v3 component can react)
// - Light-mode + density + accent-intensity overrides
// - Better imagery: per-sport SVG illustrations (no photos, but committed)
// - AI byline strip + transparency footnote

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "lang": "en",
  "density": "comfy",
  "theme": "dark",
  "accent": "balanced"
}/*EDITMODE-END*/;

window.useV4Tweaks = function() {
  // useTweaks comes from tweaks-panel.jsx
  return useTweaks(TWEAK_DEFAULTS);
};

// Apply tweak side-effects (theme + density + accent) by writing CSS vars to root
function V4TweakSync({ tweaks }) {
  React.useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = tweaks.theme;
    html.dataset.density = tweaks.density;
    html.dataset.accent = tweaks.accent;
    // sync language across all v3 components that read localStorage
    if (localStorage.getItem('gibol_lang') !== tweaks.lang) {
      localStorage.setItem('gibol_lang', tweaks.lang);
      window.dispatchEvent(new StorageEvent('storage', { key:'gibol_lang' }));
    }
  }, [tweaks]);
  return null;
}

// One-time global stylesheet for v4 tweak responses
const V4_TWEAK_CSS = `
  /* light theme override */
  html[data-theme="light"] .gb3 {
    --bg:#F5F1EA; --bg-2:#FFFFFF; --bg-3:#FAF7F2; --bg-4:#F0EAD9;
    --line:#E3DCCF; --line-soft:#EDE7DB; --line-loud:#CFC4AF;
    --ink:#0A0A0A; --ink-2:#333; --ink-3:#5C5C5C; --ink-4:#9A9A9A; --ink-5:#C9BFA9;
    --blue:#1E40AF; --blue-2:#1E40AF;
    --amber:#B45309; --amber-2:#B45309;
    --blue-soft: rgba(30,64,175,.10); --amber-soft: rgba(180,83,9,.10); --live-soft: rgba(220,38,38,.10);
  }
  html[data-theme="light"] .gb3 .ph::after { background-image: linear-gradient(45deg, rgba(0,0,0,.025) 25%, transparent 25%, transparent 50%, rgba(0,0,0,.025) 50%, rgba(0,0,0,.025) 75%, transparent 75%, transparent); }
  html[data-theme="light"] .gb3 .pill.amber { color:#B45309 }
  html[data-theme="light"] .gb3 .pill.live { color:#DC2626 }

  /* density */
  html[data-density="compact"] .gb3 { font-size: 12px; }
  html[data-density="compact"] .gb3 .card-pad { padding:10px; }
  html[data-density="compact"] .gb3 .card-head { padding: 8px 11px; }
  html[data-density="compact"] .gb3 h1.disp { font-size: 26px !important; }
  html[data-density="comfy"] .gb3 { font-size: 13px; }

  /* accent intensity */
  html[data-accent="loud"] .gb3 .sport-tag { padding-left:5px; }
  html[data-accent="loud"] .gb3 .sport-tag .sw { width:10px; height:10px; }
  html[data-accent="loud"] .gb3 [data-sport-stripe] { border-left-width: 4px !important; }
  html[data-accent="quiet"] .gb3 .sport-tag .sw { display:none; }

  /* AI byline */
  .gb3 .ai-byline { display:inline-flex; align-items:center; gap:5px; padding:2px 7px; border-radius:4px;
    background: var(--amber-soft); color: var(--amber); font:700 9px 'JetBrains Mono'; letter-spacing:.12em; }
  .gb3 .ai-byline .dot-ai { width:5px; height:5px; border-radius:50%; background:var(--amber); }
`;
if (typeof document !== 'undefined' && !document.getElementById('v4-tweak-css')) {
  const s = document.createElement('style'); s.id = 'v4-tweak-css'; s.textContent = V4_TWEAK_CSS;
  document.head.appendChild(s);
}

// ----- Imagery: committed SVG illustrations -----
function V4Img({ kind='nba-game', tint, label, ratio='16/9', style={} }) {
  const Comp = ILLUSTRATIONS[kind] || ILLUSTRATIONS['fallback'];
  return (
    <div className="ph" style={{
      aspectRatio: ratio, borderRadius:8, border:'1px solid var(--line-soft)',
      background:'var(--bg-3)', position:'relative', overflow:'hidden',
      display:'flex', alignItems:'flex-end', padding:0, ...style,
    }}>
      <div style={{ position:'absolute', inset:0 }}><Comp tint={tint}/></div>
      {label && (
        <span className="mono" style={{ fontSize:9, color:'var(--ink-3)', letterSpacing:'.18em',
          textTransform:'uppercase', position:'absolute', left:10, bottom:8, zIndex:2,
          background:'rgba(10,22,40,.55)', padding:'2px 6px', borderRadius:3, backdropFilter:'blur(2px)' }}>
          {label}
        </span>
      )}
    </div>
  );
}

// each illustration is full-bleed SVG using preserveAspectRatio="xMidYMid slice"
const ILLUSTRATIONS = {
  // NBA — abstract court + ball arc
  'nba-game': ({ tint='#F97316' }) => (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id="nbaG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={tint} stopOpacity=".22"/>
          <stop offset="60%" stopColor="#0A1628" stopOpacity="0"/>
        </linearGradient>
        <radialGradient id="nbaR" cx="0.7" cy="0.3" r="0.5">
          <stop offset="0%" stopColor={tint} stopOpacity=".30"/>
          <stop offset="100%" stopColor="#0A1628" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="225" fill="#0F1E36"/>
      <rect width="400" height="225" fill="url(#nbaG)"/>
      <rect width="400" height="225" fill="url(#nbaR)"/>
      {/* court lines */}
      <g stroke={tint} strokeOpacity=".5" strokeWidth="1" fill="none">
        <path d="M0,180 L400,180"/>
        <path d="M200,180 L200,225"/>
        <circle cx="200" cy="180" r="40"/>
        <path d="M120,225 L120,200 Q200,170 280,200 L280,225"/>
      </g>
      {/* ball arc */}
      <g>
        <path d="M40,140 Q150,40 320,90" stroke={tint} strokeOpacity=".55" strokeWidth="1.4" strokeDasharray="3 4" fill="none"/>
        <circle cx="320" cy="90" r="8" fill={tint} opacity=".85"/>
        <circle cx="320" cy="90" r="8" fill="none" stroke="#0A1628" strokeWidth="1"/>
        <path d="M312,90 Q320,82 328,90 M320,82 Q320,90 320,98 M313,93 Q320,93 327,93" stroke="#0A1628" strokeWidth=".7" fill="none"/>
      </g>
      {/* hatching */}
      <g stroke="#FFFFFF" strokeOpacity=".03">
        {Array.from({length:30}, (_,i) => <line key={i} x1={i*15} y1="0" x2={i*15+50} y2="225"/>)}
      </g>
    </svg>
  ),
  // NBA — player silhouette mid-jumpshot
  'nba-player': ({ tint='#F97316' }) => (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <rect width="400" height="225" fill="#0F1E36"/>
      <defs>
        <radialGradient id="np" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0%" stopColor={tint} stopOpacity=".35"/>
          <stop offset="100%" stopColor="#0A1628" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="225" fill="url(#np)"/>
      {/* spotlight floor */}
      <ellipse cx="200" cy="220" rx="180" ry="10" fill={tint} opacity=".25"/>
      {/* silhouette */}
      <g fill="#0A1628">
        <circle cx="200" cy="80" r="14"/>
        <path d="M186,95 Q200,100 214,95 L228,140 L222,148 L210,118 L210,180 L195,180 L194,135 L186,148 L172,140 Z"/>
        <path d="M222,148 L246,118 L256,124 Q258,128 254,134 L232,162 Z"/>
      </g>
      {/* basketball above hand */}
      <circle cx="248" cy="96" r="9" fill={tint}/>
      <path d="M239,96 Q248,87 257,96 M248,87 Q248,96 248,105 M241,99 Q248,99 255,99" stroke="#0A1628" strokeWidth=".8" fill="none"/>
    </svg>
  ),
  // PL — stadium glow
  'pl-stadium': ({ tint='#22C55E' }) => (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <rect width="400" height="225" fill="#0F1E36"/>
      <defs>
        <linearGradient id="plg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={tint} stopOpacity=".30"/>
          <stop offset="80%" stopColor="#0A1628" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="url(#plg)"/>
      {/* pitch perspective */}
      <g fill="none" stroke={tint} strokeOpacity=".5" strokeWidth="1">
        <path d="M50,225 L160,140 L240,140 L350,225"/>
        <path d="M0,225 L100,140 L300,140 L400,225"/>
        <line x1="200" y1="140" x2="200" y2="225"/>
        <ellipse cx="200" cy="180" rx="40" ry="14"/>
      </g>
      {/* stadium roof lights */}
      {[60,140,260,340].map((x,i)=>(
        <g key={i}>
          <line x1={x} y1="20" x2={x} y2="60" stroke={tint} strokeOpacity=".4" strokeWidth="1"/>
          <circle cx={x} cy="20" r="3" fill={tint}/>
          <path d={`M${x-30},80 L${x},20 L${x+30},80`} fill={tint} opacity=".05"/>
        </g>
      ))}
    </svg>
  ),
  // PL — ball
  'pl-ball': ({ tint='#22C55E' }) => (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <rect width="400" height="225" fill="#0F1E36"/>
      <defs>
        <radialGradient id="plb" cx="0.7" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={tint} stopOpacity=".4"/>
          <stop offset="100%" stopColor="#0A1628" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="225" fill="url(#plb)"/>
      <ellipse cx="200" cy="220" rx="200" ry="10" fill={tint} opacity=".15"/>
      {/* ball */}
      <g transform="translate(280,110)">
        <circle r="40" fill="#F5F5F5"/>
        <path d="M0,-40 L12,-12 L-12,-12 Z M40,0 L12,12 L12,-12 Z M0,40 L-12,12 L12,12 Z M-40,0 L-12,-12 L-12,12 Z" fill="#0A0A0A"/>
        <circle r="40" fill="none" stroke="#0A0A0A" strokeWidth="1.5"/>
      </g>
      {/* motion lines */}
      <g stroke={tint} strokeOpacity=".5" strokeWidth="1.2" fill="none">
        <path d="M50,80 Q170,90 240,110"/>
        <path d="M30,120 Q150,130 230,140"/>
      </g>
    </svg>
  ),
  // F1 — track + car nose
  'f1-track': ({ tint='#DC2626' }) => (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <rect width="400" height="225" fill="#0F1E36"/>
      <defs>
        <linearGradient id="f1g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={tint} stopOpacity=".35"/>
          <stop offset="100%" stopColor="#0A1628" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="url(#f1g)"/>
      {/* track */}
      <path d="M-20,170 Q120,175 200,150 Q280,125 420,140" fill="none" stroke="#FFFFFF" strokeOpacity=".15" strokeWidth="36"/>
      <path d="M-20,170 Q120,175 200,150 Q280,125 420,140" fill="none" stroke={tint} strokeOpacity=".7" strokeWidth="1" strokeDasharray="6 6"/>
      {/* curbing */}
      {Array.from({length:18},(_,i)=>(
        <rect key={i} x={i*22} y={195} width="11" height="6" fill={i%2?tint:'#FFFFFF'} opacity=".6"/>
      ))}
      {/* car silhouette */}
      <g transform="translate(150,138)" fill={tint}>
        <path d="M0,0 L60,0 L70,-6 L100,-6 L110,-2 L130,0 L130,8 L0,8 Z"/>
        <rect x="20" y="-12" width="30" height="6"/>
        <circle cx="20" cy="10" r="6" fill="#0A0A0A"/>
        <circle cx="110" cy="10" r="6" fill="#0A0A0A"/>
      </g>
    </svg>
  ),
  // Tennis — court
  'tennis-court': ({ tint='#EAB308' }) => (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <rect width="400" height="225" fill="#0F1E36"/>
      <defs>
        <linearGradient id="tng" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={tint} stopOpacity=".25"/>
          <stop offset="80%" stopColor="#0A1628" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="url(#tng)"/>
      {/* court */}
      <g fill="none" stroke={tint} strokeOpacity=".55" strokeWidth="1.2">
        <path d="M80,210 L320,210 L260,80 L140,80 Z"/>
        <line x1="200" y1="80" x2="200" y2="210"/>
        <line x1="100" y1="180" x2="300" y2="180"/>
        <line x1="170" y1="130" x2="230" y2="130"/>
      </g>
      {/* net */}
      <g>
        <line x1="100" y1="150" x2="300" y2="150" stroke="#FFFFFF" strokeOpacity=".4" strokeWidth="1"/>
        <pattern id="netP" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0,0 L6,6 M6,0 L0,6" stroke="#FFFFFF" strokeOpacity=".15" strokeWidth=".5"/>
        </pattern>
        <rect x="100" y="142" width="200" height="10" fill="url(#netP)"/>
      </g>
      {/* ball */}
      <g>
        <circle cx="280" cy="100" r="7" fill={tint}/>
        <path d="M273,99 Q280,93 287,99" fill="none" stroke="#0A0A0A" strokeWidth=".6" opacity=".7"/>
        <path d="M280,93 Q286,100 280,107" fill="none" stroke="#0A1628" strokeWidth=".6"/>
      </g>
    </svg>
  ),
  // Hero photo-feel: dramatic two-tone with film grain
  'photo-hero': ({ tint='#F97316' }) => (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id="phh1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={tint} stopOpacity=".7"/>
          <stop offset="100%" stopColor="#0A1628" stopOpacity="1"/>
        </linearGradient>
        <radialGradient id="phh2" cx="0.3" cy="0.3" r="0.6">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".15"/>
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
        </radialGradient>
        <pattern id="grainP" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#000" opacity=".06"/>
          <circle cx="1" cy="1" r=".5" fill="#FFF" opacity=".1"/>
        </pattern>
      </defs>
      <rect width="400" height="225" fill="url(#phh1)"/>
      <rect width="400" height="225" fill="url(#phh2)"/>
      {/* big silhouette block */}
      <g fill="#0A1628" opacity=".75">
        <ellipse cx="120" cy="180" rx="80" ry="10"/>
        <circle cx="120" cy="80" r="22"/>
        <path d="M98,98 Q120,108 142,98 L160,170 Q145,180 120,180 Q95,180 80,170 Z"/>
      </g>
      <rect width="400" height="225" fill="url(#grainP)"/>
      {/* tiny crowd dots */}
      <g fill="#FFFFFF" opacity=".25">
        {Array.from({length:60}, (_,i)=>(
          <circle key={i} cx={200 + (i%15)*14 + (i%3)*2} cy={6 + Math.floor(i/15)*4} r=".8"/>
        ))}
      </g>
    </svg>
  ),
  fallback: ({ tint='#3B82F6' }) => (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <rect width="400" height="225" fill="#0F1E36"/>
      <rect width="400" height="225" fill={tint} opacity=".15"/>
    </svg>
  ),
};

// AI byline — used everywhere; clickable to /transparency
function V4AiByline({ link=true }) {
  return (
    <span className="ai-byline" title="AI-assisted, human edited" style={{ cursor: link?'pointer':'default' }}>
      <span className="dot-ai"/>AI · HUMAN EDITED {link && <span style={{ opacity:.7, marginLeft:2 }}>↗</span>}
    </span>
  );
}

// Section divider with kicker — for editorial pages
function V4Kicker({ children, color='var(--amber)' }) {
  return <div className="meta" style={{ color, letterSpacing:'.22em' }}>{children}</div>;
}

Object.assign(window, {
  V4Img, V4AiByline, V4Kicker, V4TweakSync, ILLUSTRATIONS,
});
