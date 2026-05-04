// v3/shared.jsx — shared primitives for v3: unified TopBar, NewsroomChip, ArticleCard, etc.
// All artboards in v3 use these so home → editorial → sport dashboards feel like one system.

// Unified top bar — same chrome on every screen. Sport context is implicit via active prop.
function V3TopBar({ active = 'home', sportLabel = null, sectionLabel = null, lang = 'EN', theme = 'dark', onToggleTheme }) {
  const items = [
    { id: 'home',   lbl: 'Home' },
    { id: 'nba',    lbl: 'NBA' },
    { id: 'pl',     lbl: 'Premier League' },
    { id: 'f1',     lbl: 'Formula 1' },
    { id: 'tennis', lbl: 'Tennis' },
    { id: 'news',   lbl: 'Newsroom' },
    { id: 'wc',     lbl: 'World Cup', soon: true },
  ];
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 18px',
      borderBottom: '1px solid var(--line)',
      background: 'var(--bg)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <Logo size={16} />
      <nav style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
        {items.map(it => (
          <button key={it.id} style={{
            background: active === it.id ? 'var(--bg-3)' : 'transparent',
            border: 0,
            color: active === it.id ? 'var(--ink)' : (it.soon ? 'var(--ink-4)' : 'var(--ink-3)'),
            font: '600 12px "Inter Tight"',
            padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            {it.lbl}
            {it.soon && <span className="pill amber" style={{ fontSize: 8, padding: '1px 4px' }}>SOON</span>}
          </button>
        ))}
      </nav>
      {sectionLabel && (
        <div className="row" style={{ gap: 6, paddingLeft: 10, marginLeft: 6, borderLeft: '1px solid var(--line)' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.12em' }}>
            {sportLabel ? sportLabel.toUpperCase() + ' · ' : ''}{sectionLabel.toUpperCase()}
          </span>
        </div>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-3)', border: '1px solid var(--line)',
          borderRadius: 6, padding: '5px 10px', width: 200,
          color: 'var(--ink-3)', fontSize: 11,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          Search teams, matches, articles · ⌘K
        </div>
        <button className="btn ghost" onClick={onToggleTheme} title="Theme" style={{ padding: '5px 7px' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            {theme === 'dark'
              ? <path d="M13 9.5A5 5 0 016.5 3 5 5 0 1013 9.5z"/>
              : <><circle cx="8" cy="8" r="3"/><path d="M8 1v2 M8 13v2 M1 8h2 M13 8h2 M3 3l1.5 1.5 M11.5 11.5L13 13 M3 13l1.5-1.5 M11.5 4.5L13 3"/></>}
          </svg>
        </button>
        <button className="btn ghost" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em' }}>{lang}</button>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue), var(--amber))' }} />
      </div>
    </header>
  );
}

// Unified screen header — sits below TopBar on every page. Title left, meta right.
function ScreenHeader({ kicker, title, sub, right }) {
  return (
    <div style={{ padding: '14px 18px 0 18px' }}>
      <div className="spread" style={{ alignItems: 'flex-end' }}>
        <div style={{ minWidth: 0 }}>
          {kicker && (
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.16em', marginBottom: 4 }}>
              {kicker.toUpperCase()}
            </div>
          )}
          <div style={{ font: '800 22px "Inter Tight"', letterSpacing: '-.02em', lineHeight: 1.1 }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}

// Section header — small caps rule used INSIDE pages to introduce blocks.
function SectionRule({ title, count, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 8px 0' }}>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.16em' }}>
        {title.toUpperCase()}{count != null ? ' · ' + count : ''}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
      {right}
    </div>
  );
}

// Article card — magazine variant
function ArticleCardMag({ kicker, title, dek, image, byline, time, tag, size = 'm', onAccent }) {
  const heights = { s: 120, m: 160, l: 220, xl: 300 };
  const titleSizes = { s: '15px', m: '17px', l: '22px', xl: '28px' };
  return (
    <article className="card" style={{ overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-2)' }}>
      <PlaceholderImg height={heights[size]} label={image} accent={onAccent} />
      <div style={{ padding: 12 }}>
        {(kicker || tag) && (
          <div className="row" style={{ gap: 6, marginBottom: 6 }}>
            {kicker && <span className="mono" style={{ fontSize: 9, color: 'var(--amber)', letterSpacing: '.16em', fontWeight: 700 }}>{kicker.toUpperCase()}</span>}
            {tag && <span className="pill muted" style={{ fontSize: 8, padding: '2px 5px' }}>{tag}</span>}
          </div>
        )}
        <h3 style={{ font: `700 ${titleSizes[size]} "Inter Tight"`, letterSpacing: '-.015em', lineHeight: 1.2, margin: 0, textWrap: 'pretty' }}>
          {title}
        </h3>
        {dek && <p style={{ font: '500 12.5px "Inter Tight"', color: 'var(--ink-2)', lineHeight: 1.45, margin: '8px 0 0 0', textWrap: 'pretty' }}>{dek}</p>}
        <div className="row" style={{ gap: 8, marginTop: 10, fontSize: 10.5, color: 'var(--ink-3)' }}>
          {byline && <span>{byline}</span>}
          {byline && time && <span style={{ color: 'var(--ink-4)' }}>·</span>}
          {time && <span className="mono">{time}</span>}
        </div>
      </div>
    </article>
  );
}

// Article row — wire/list variant
function ArticleRow({ kicker, title, dek, time, byline, tag, hot }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }}>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.1em', paddingTop: 2 }}>{time}</span>
      <div style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 6, marginBottom: 3 }}>
          {kicker && <span className="mono" style={{ fontSize: 9, color: 'var(--amber)', letterSpacing: '.16em', fontWeight: 700 }}>{kicker.toUpperCase()}</span>}
          {hot && <span className="pill amber" style={{ fontSize: 8, padding: '1px 4px' }}>HOT</span>}
          {tag && <span className="pill muted" style={{ fontSize: 8, padding: '1px 5px' }}>{tag}</span>}
        </div>
        <div style={{ font: '600 13px "Inter Tight"', letterSpacing: '-.005em', lineHeight: 1.3, textWrap: 'pretty' }}>{title}</div>
        {dek && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.4, textWrap: 'pretty' }}>{dek}</div>}
        {byline && <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-4)', marginTop: 4 }}>{byline}</div>}
      </div>
      <span style={{ alignSelf: 'center', color: 'var(--ink-4)', fontSize: 14 }}>↗</span>
    </div>
  );
}

// Striped placeholder image with monospace caption — per default aesthetic guide.
function PlaceholderImg({ height = 160, label = 'image', accent }) {
  const stripeColor = accent || 'rgba(115, 136, 165, .14)';
  return (
    <div style={{
      height, width: '100%',
      background: `repeating-linear-gradient(135deg, ${stripeColor} 0 8px, transparent 8px 16px), var(--bg-3)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderBottom: '1px solid var(--line-soft)',
    }}>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '.12em' }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

// Mini score chip — for use inline in article cards / next to bylines.
function ScoreChip({ a, b, sa, sb, status }) {
  return (
    <span className="row mono" style={{ gap: 4, fontSize: 10, background: 'var(--bg-3)', padding: '3px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>
      <span style={{ color: 'var(--ink-2)' }}>{a}</span>
      <span className="tab" style={{ fontWeight: 800, color: 'var(--ink)' }}>{sa}</span>
      <span style={{ color: 'var(--ink-4)' }}>·</span>
      <span style={{ color: 'var(--ink-2)' }}>{b}</span>
      <span className="tab" style={{ fontWeight: 800, color: 'var(--ink)' }}>{sb}</span>
      {status && <span style={{ color: 'var(--ink-3)', marginLeft: 4 }}>{status}</span>}
    </span>
  );
}

// Tag chip — for taxonomies (free-form, topic series, region).
function TagChip({ children, type = 'tag', active }) {
  const c = type === 'series' ? 'var(--amber)' : type === 'region' ? 'var(--blue-2)' : 'var(--ink-2)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 4,
      fontSize: 10.5, fontWeight: 600,
      border: '1px solid var(--line)',
      background: active ? 'var(--bg-3)' : 'transparent',
      color: c, letterSpacing: type === 'tag' ? 0 : '.04em',
      cursor: 'pointer',
    }}>
      {type === 'series' && <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--amber)' }} />}
      {type === 'region' && <span className="mono" style={{ fontSize: 9 }}>·</span>}
      {children}
    </span>
  );
}

// Series ribbon — used for "Topic series" continuity at top of articles.
function SeriesRibbon({ name, episode, total }) {
  return (
    <div className="row" style={{
      gap: 8, padding: '6px 10px', borderRadius: 6,
      background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.18)',
      width: 'fit-content',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--amber)' }} />
      <span className="mono" style={{ fontSize: 9.5, color: 'var(--amber)', letterSpacing: '.14em', fontWeight: 700 }}>SERIES</span>
      <span style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600 }}>{name}</span>
      <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>{episode}/{total}</span>
    </div>
  );
}

// Byline w/ optional AI marker
function Byline({ name, role, ai, time, readTime }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: ai ? 'linear-gradient(135deg, var(--amber), var(--blue))' : 'linear-gradient(135deg, var(--blue), var(--blue-2))',
        flexShrink: 0,
      }}/>
      <div style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{name}</span>
          {ai && <span className="pill amber" style={{ fontSize: 8, padding: '1px 5px' }}>AI-ASSISTED</span>}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>
          {role && <span>{role}</span>}
          {role && time && <span> · </span>}
          {time && <span>{time}</span>}
          {readTime && <span> · {readTime} read</span>}
        </div>
      </div>
    </div>
  );
}

// Live strip — used at bottom of editorial pages so live context is always 1 click away.
function LiveStrip({ items = [] }) {
  return (
    <div style={{
      borderTop: '1px solid var(--line)', background: 'var(--bg-2)',
      display: 'flex', overflowX: 'auto',
    }}>
      <div className="row" style={{ gap: 6, padding: '8px 14px', borderRight: '1px solid var(--line-soft)', flexShrink: 0 }}>
        <span className="dot live"/>
        <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: 'var(--live)' }}>LIVE</span>
      </div>
      {items.map((it, i) => (
        <div key={i} className="row" style={{
          gap: 8, padding: '8px 14px',
          borderRight: i < items.length - 1 ? '1px solid var(--line-soft)' : 0,
          flexShrink: 0,
        }}>
          <SportIcon sport={it.sport} size={11} color="var(--ink-3)" />
          <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{it.a} <span className="tab mono" style={{ fontWeight: 800, color: 'var(--ink)' }}>{it.sa}</span></span>
          <span style={{ color: 'var(--ink-4)', fontSize: 10 }}>—</span>
          <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{it.b} <span className="tab mono" style={{ fontWeight: 800, color: 'var(--ink)' }}>{it.sb}</span></span>
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', marginLeft: 4 }}>{it.tag}</span>
        </div>
      ))}
    </div>
  );
}

// Unified card head w/ optional rail accent (e.g., amber for AI, blue for live). Used everywhere.
function CardHead({ title, count, right, accent }) {
  return (
    <div className="card-head" style={accent ? { borderLeft: `2px solid ${accent}` } : undefined}>
      <div className="row" style={{ gap: 8 }}>
        <span className="card-title">{title}</span>
        {count != null && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{count}</span>}
      </div>
      {right}
    </div>
  );
}

Object.assign(window, {
  V3TopBar, ScreenHeader, SectionRule, ArticleCardMag, ArticleRow,
  PlaceholderImg, ScoreChip, TagChip, SeriesRibbon, Byline, LiveStrip, CardHead,
});
