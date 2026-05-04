// v3/articles.jsx — editorial fixture data + the 3 article-page layouts.

const ARTICLES = {
  nbaLead: {
    id: 'nba-001',
    sport: 'NBA',
    kicker: 'Playoff Watch',
    title: 'Why the Celtics keep winning ugly — and why Denver should be worried',
    dek: 'Boston has flipped the series with defense, not offense. The numbers behind a third-quarter pattern that Mike Malone hasn\'t solved.',
    image: 'celtics defensive setup',
    byline: 'Rian Pratama',
    role: 'Senior NBA Writer',
    time: '2h ago',
    read: '6 min',
    tag: 'ANALYSIS',
    series: { name: 'Playoff Watch', ep: 14, total: 22 },
    tags: ['celtics', 'nuggets', 'tatum', 'jokic', 'defense'],
    region: 'EN',
  },
  nba2: {
    sport: 'NBA', kicker: 'News', title: 'Jokić named MVP for the third time in four seasons',
    dek: 'Denver center edges Gilgeous-Alexander in the closest race since 2014.',
    image: 'jokic mvp trophy', byline: 'Newsroom', time: '5h ago', tag: 'NEWS',
  },
  nba3: {
    sport: 'NBA', kicker: 'Power Ranking', title: "Conference power rankings — Week 28",
    dek: 'Boston still on top, but the Pacers have quietly become the East\'s best fourth seed.',
    image: 'team logos array', byline: 'Dimas Wibowo', time: '8h ago', tag: 'RANKINGS',
  },
  nba4: {
    sport: 'NBA', kicker: 'Feature', title: "Inside Tatum's third-quarter pattern: 12 games of film",
    dek: '',
    image: '', byline: 'Rian Pratama', time: 'Yesterday', tag: 'LONG READ',
  },
  nba5: {
    sport: 'NBA', kicker: 'Opinion', title: "Stop overrating bench scoring — possessions don't tell you who wins",
    image: '', byline: 'Eka Saputra', time: 'Yesterday', tag: 'OPINION',
  },
  plLead: {
    sport: 'PL', kicker: 'Match Preview', title: 'Arsenal vs Liverpool — the title race is now a 90-minute math problem',
    dek: 'A draw probably ends it. Three scenarios from Anfield that decide May.',
    image: 'arsenal liverpool tunnel', byline: 'Adi Nugroho', time: '1h ago', tag: 'PREVIEW',
  },
  pl2: {
    sport: 'PL', kicker: 'Tactics', title: 'How Arteta is using inverted full-backs to break low blocks',
    dek: '', image: '', byline: 'Ben Carter', time: '4h ago', tag: 'TACTICS',
  },
  pl3: {
    sport: 'PL', kicker: 'News', title: "City confirm Rodri's surgery; Guardiola weighs January loan",
    image: '', byline: 'Newsroom', time: '6h ago', tag: 'NEWS',
  },
  f1Lead: {
    sport: 'F1', kicker: 'Race Weekend', title: 'Imola, three weeks in: McLaren\'s upgrade is real but its weakness is still there',
    dek: 'Sector 2 telemetry shows the car is fastest in the corners that matter — and slowest in the one that decides Sundays.',
    image: 'mclaren imola pit', byline: 'Tom Ridley', time: '3h ago', tag: 'ANALYSIS',
  },
  f12: {
    sport: 'F1', kicker: 'News', title: 'Sainz to Williams confirmed for 2025 — three-year deal',
    image: '', byline: 'Newsroom', time: '7h ago', tag: 'NEWS',
  },
  tennisLead: {
    sport: 'Tennis', kicker: 'Madrid Open', title: 'Alcaraz survives Sinner in 4 hours — the rivalry that\'s carrying tennis',
    dek: 'Two final-set tiebreaks, a 23-minute service game, and the strangest stat of the year.',
    image: 'alcaraz sinner net', byline: 'Lukas Werner', time: '30m ago', tag: 'RECAP',
  },
  tennis2: {
    sport: 'Tennis', kicker: 'Rankings', title: 'How the Madrid result reshapes the Race to Turin',
    image: '', byline: 'Newsroom', time: '5h ago', tag: 'NEWS',
  },
};

// ---- ARTICLE PAGE: Magazine reading view ----
// The canonical article layout. Used regardless of where the article is published.
function ArticlePage({ a = ARTICLES.nbaLead }) {
  return (
    <Board>
      <V3TopBar active={a.sport === 'NBA' ? 'nba' : a.sport === 'PL' ? 'pl' : a.sport === 'F1' ? 'f1' : a.sport === 'Tennis' ? 'tennis' : 'news'}
                sportLabel={a.sport === 'PL' ? 'Premier League' : a.sport} sectionLabel="Newsroom" />

      {/* Hero */}
      <div style={{ position: 'relative' }}>
        <PlaceholderImg height={300} label={a.image} accent="rgba(245,158,11,.18)" />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 0%, transparent 50%, var(--bg) 100%)',
          pointerEvents: 'none',
        }}/>
      </div>

      {/* Headline block */}
      <div style={{ maxWidth: 760, margin: '-60px auto 0 auto', padding: '0 24px', position: 'relative' }}>
        <div className="card" style={{ padding: '24px 24px 20px 24px', borderTop: '2px solid var(--amber)' }}>
          {a.series && <div style={{ marginBottom: 12 }}><SeriesRibbon name={a.series.name} episode={a.series.ep} total={a.series.total} /></div>}
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <SportIcon sport={a.sport} size={12} color="var(--amber)" />
            <span className="mono" style={{ fontSize: 10, color: 'var(--amber)', letterSpacing: '.16em', fontWeight: 700 }}>
              {a.sport === 'PL' ? 'PREMIER LEAGUE' : a.sport.toUpperCase()} · {a.kicker.toUpperCase()}
            </span>
          </div>
          <h1 style={{ font: '900 32px "Inter Tight"', letterSpacing: '-.025em', lineHeight: 1.1, margin: 0, textWrap: 'pretty' }}>
            {a.title}
          </h1>
          <p style={{ font: '500 16px "Inter Tight"', color: 'var(--ink-2)', lineHeight: 1.45, margin: '14px 0 0 0', textWrap: 'pretty' }}>
            {a.dek}
          </p>
          <div className="spread" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
            <Byline name={a.byline} role={a.role} time={a.time} readTime={a.read} />
            <div className="row" style={{ gap: 6 }}>
              <button className="btn ghost" style={{ padding: '6px 8px' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10v9H3z M5 5V3h6v2"/></svg>
              </button>
              <button className="btn ghost" style={{ padding: '6px 8px' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="4" cy="8" r="1.5"/><circle cx="11" cy="4" r="1.5"/><circle cx="11" cy="12" r="1.5"/><path d="M5.5 7l4-2 M5.5 9l4 2"/></svg>
              </button>
              <button className="btn">EN · BI</button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 760, margin: '32px auto 0 auto', padding: '0 24px 60px 24px' }}>
        <p style={{ font: '500 15px/1.65 "Inter Tight"', color: 'var(--ink)', textWrap: 'pretty' }}>
          <span style={{ font: '900 56px "Inter Tight"', float: 'left', lineHeight: 0.85, margin: '6px 8px 0 0', color: 'var(--amber)' }}>B</span>
          oston went into the third quarter of Game 4 trailing by seven and outscored Denver 32–14 the rest of the way. Twelve nights later in Game 5, the same pattern: 28–11 in the third. The Celtics aren't winning these games on offense — they're winning them on a defensive switch that Mike Malone hasn't found a counter for.
        </p>
        <p style={{ font: '500 15px/1.65 "Inter Tight"', color: 'var(--ink)', marginTop: 18, textWrap: 'pretty' }}>
          Watch the film and one thing becomes obvious: every Denver third-quarter possession that ends in a Jokić touch is now contested before he catches the ball. Boston is doubling on the catch, not the dribble — and the rotations behind it are the cleanest in the playoffs.
        </p>

        {/* Embedded score reference card */}
        <div className="card" style={{ marginTop: 24, padding: 14, background: 'var(--bg-3)' }}>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '.14em', marginBottom: 8 }}>SERIES · BOS LEADS 3-1</div>
          <div className="spread">
            <div className="row" style={{ gap: 10 }}>
              <Crest short="DEN" color="#0E2240" size={26}/>
              <span style={{ font: '700 14px "Inter Tight"' }}>Denver Nuggets</span>
            </div>
            <span className="mono tab" style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink-3)' }}>1</span>
          </div>
          <div className="spread" style={{ marginTop: 6 }}>
            <div className="row" style={{ gap: 10 }}>
              <Crest short="BOS" color="#007A33" size={26}/>
              <span style={{ font: '700 14px "Inter Tight"' }}>Boston Celtics</span>
            </div>
            <span className="mono tab" style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>3</span>
          </div>
        </div>

        <h2 style={{ font: '800 22px "Inter Tight"', letterSpacing: '-.02em', marginTop: 32, marginBottom: 8 }}>The third-quarter switch</h2>
        <p style={{ font: '500 15px/1.65 "Inter Tight"', color: 'var(--ink)', textWrap: 'pretty' }}>
          Through the first 18 minutes of every game, Boston plays drop coverage on Jokić — Horford sags, lets him operate from the elbow, dares him to score 1-on-1. He does. Through halftime he's averaging 18 points on 14 shots in this series. Then the third quarter starts and the entire team rotates two steps higher.
        </p>

        {/* Pull quote */}
        <blockquote style={{
          margin: '28px 0', padding: '14px 18px',
          borderLeft: '3px solid var(--amber)',
          font: '600 19px/1.4 "Inter Tight"', color: 'var(--ink)',
          letterSpacing: '-.005em',
        }}>
          "It's not that they're playing harder in the third. They're playing a different defense — and Denver hasn't adjusted."
          <div style={{ font: '500 12px "Inter Tight"', color: 'var(--ink-3)', marginTop: 8 }}>— Anonymous Eastern Conference assistant coach</div>
        </blockquote>

        <p style={{ font: '500 15px/1.65 "Inter Tight"', color: 'var(--ink)', textWrap: 'pretty' }}>
          The numbers say the same thing. In the third quarters of Games 3, 4, and 5, Jokić is shooting 4-of-17 with as many turnovers as assists. His usage is up. His efficiency has cratered. And the Celtics are doing it without ever sending a help defender from the corners, which means Murray and Porter Jr. aren't getting open looks either.
        </p>

        {/* Tags + share */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.14em', marginRight: 6 }}>FILED UNDER</span>
            {a.tags.map(tg => <TagChip key={tg}>{tg}</TagChip>)}
            <TagChip type="series">Playoff Watch</TagChip>
            <TagChip type="region">EN · BI</TagChip>
          </div>
        </div>

        {/* Continue reading */}
        <div style={{ marginTop: 36 }}>
          <SectionRule title="More from this series" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ArticleCardMag {...ARTICLES.nba3} size="s" />
            <ArticleCardMag {...ARTICLES.nba4} size="s" />
          </div>
        </div>
      </div>

      <LiveStrip items={[
        { sport: 'NBA', a: 'DEN', sa: 78, b: 'BOS', sb: 82, tag: 'Q3 4:12' },
        { sport: 'PL', a: 'ARS', sa: 2, b: 'MCI', sb: 1, tag: "67'" },
        { sport: 'F1', a: 'VER', sa: 'P1', b: 'NOR', sb: '+2.1', tag: 'L34' },
      ]}/>
    </Board>
  );
}

Object.assign(window, { ARTICLES, ArticlePage });
