// v3/newsroom.jsx — three editorial placement directions A, B, C, plus per-sport newsroom.

// ===================== DIRECTION A =====================
// Per-sport newsroom: each sport dashboard has a "Newsroom" tab/strip; global /news is a thin index.
// Articles surface where the sport already lives. Best for context-bound readers.

function HomeRefinedA() {
  return (
    <Board>
      <V3TopBar active="home" />
      <ScreenHeader
        kicker="May 3 · Sun · Jakarta"
        title="Today's headlines"
        sub="Four sports live · 12 stories from the newsroom"
        right={
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost">Following</button>
            <button className="btn">All sports</button>
          </div>
        }
      />
      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        {/* MAIN — live first, then editorial digest */}
        <main className="col" style={{ gap: 18, minWidth: 0 }}>
          {/* Live hero — same chrome as before but tighter */}
          <div className="card" style={{ position: 'relative', padding: 16, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0,
              background: 'radial-gradient(500px 250px at 15% 0, #0E224038, transparent), radial-gradient(500px 250px at 100% 100%, #007A3338, transparent)',
            }}/>
            <div style={{ position: 'relative' }}>
              <div className="spread" style={{ marginBottom: 10 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span className="pill live"><span className="dot live"/>LIVE · Q3 4:12</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>NBA · GAME 5 · BOS LEADS 2-1</span>
                </div>
                <button className="btn amber">Open match ↗</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14 }}>
                <div className="row" style={{ gap: 10 }}>
                  <Crest short="DEN" color="#0E2240" size={32}/>
                  <div><div style={{ font: '700 15px "Inter Tight"' }}>Denver</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>HOME · 45% WIN ODDS</div></div>
                </div>
                <div className="tab mono" style={{ font: '900 48px "Inter Tight"', letterSpacing: '-.06em', lineHeight: 1 }}>
                  <span style={{ color: 'var(--ink-3)' }}>78</span>
                  <span style={{ color: 'var(--ink-4)', margin: '0 10px', fontWeight: 400 }}>—</span>
                  <span>82</span>
                </div>
                <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ font: '700 15px "Inter Tight"' }}>Boston</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>AWAY · 55% WIN ODDS</div>
                  </div>
                  <Crest short="BOS" color="#007A33" size={32}/>
                </div>
              </div>
              <div style={{
                marginTop: 12, padding: '8px 10px', borderRadius: 6,
                fontSize: 11.5, color: 'var(--ink-2)', background: 'rgba(245,158,11,.06)',
                borderLeft: '2px solid var(--amber)',
              }}>
                <span style={{ color: 'var(--amber)', fontWeight: 700, marginRight: 5 }}>AI ·</span>
                Boston on a 9–2 run. Tatum 28p. Denver bench struggling — Jokić has played 31 of 32 min.
              </div>
            </div>
          </div>

          {/* Live grid — 3 col tighter */}
          <div>
            <SectionRule title="Live now" count="6" right={<button className="btn ghost" style={{ fontSize: 10 }}>All →</button>} />
            <div className="card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                {[
                  { sp: 'PL', a: 'Arsenal', sa: 2, b: 'Man City', sb: 1, tag: "67'", c: '#EF0107', c2: '#6CADDF' },
                  { sp: 'F1', a: 'Verstappen', sa: 'P1', b: 'Norris', sb: '+2.1', tag: 'L34/63', c: '#1E5BC6', c2: '#FF8000' },
                  { sp: 'Tennis', a: 'Alcaraz', sa: '6 4 3', b: 'Sinner', sb: '3 6 4', tag: 'Set 3', c: '#FFCC00', c2: '#E30613' },
                ].map((m, i) => (
                  <div key={i} style={{ padding: 12, borderRight: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                    <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                      <SportIcon sport={m.sp} size={11} color="var(--ink-3)" />
                      <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{m.sp}</span>
                      <span className="pill live" style={{ padding: '2px 5px', fontSize: 9 }}><span className="dot live"/>{m.tag}</span>
                    </div>
                    <div className="spread"><span style={{ font: '600 12px "Inter Tight"' }}>{m.a}</span><span className="tab mono" style={{ fontWeight: 800, fontSize: 13 }}>{m.sa}</span></div>
                    <div className="spread" style={{ marginTop: 3 }}><span style={{ font: '600 12px "Inter Tight"' }}>{m.b}</span><span className="tab mono" style={{ fontWeight: 800, fontSize: 13 }}>{m.sb}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Editorial digest — by sport */}
          <div>
            <SectionRule title="From the newsroom" count="12 today"
              right={<a style={{ fontSize: 10.5, color: 'var(--blue-2)' }}>Open Newsroom →</a>} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ArticleCardMag {...ARTICLES.nbaLead} size="m" />
              <ArticleCardMag {...ARTICLES.plLead} size="m" />
              <ArticleCardMag {...ARTICLES.f1Lead} size="m" />
              <ArticleCardMag {...ARTICLES.tennisLead} size="m" />
            </div>
          </div>
        </main>

        {/* RIGHT — pulse + recap + series */}
        <aside className="col" style={{ gap: 12 }}>
          <div className="card">
            <CardHead title="Live pulse" right={<span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>6 feeds</span>} accent="var(--live)" />
            <div>
              {[
                { t: '2s', c: '#007A33', sh: 'BOS', txt: 'Tatum 3PT! +4 lead.' },
                { t: '14s', c: '#EF0107', sh: 'ARS', txt: 'Saka 2-1 from a cut-back.' },
                { t: '48s', c: '#1E5BC6', sh: 'VER', txt: 'Verstappen pits, hards on.' },
                { t: '1m', c: '#FFCC00', sh: 'ALC', txt: 'Alcaraz breaks. 3-2 decider.' },
              ].map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 20px 1fr', gap: 6, alignItems: 'start', padding: '8px 10px', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
                  <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{p.t}</span>
                  <Crest short={p.sh} color={p.c} size={16}/>
                  <span style={{ fontSize: 11, lineHeight: 1.3 }}>{p.txt}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <CardHead title="Catatan playoff" right={<span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>DAILY</span>} accent="var(--amber)" />
            <div style={{ padding: 12 }}>
              <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '.14em', marginBottom: 6 }}>MAY 3 · 2026</div>
              <div style={{ font: '700 14px "Inter Tight"', lineHeight: 1.3, textWrap: 'pretty' }}>
                Boston is one win away. Denver's bench can't keep up. Three takeaways from Game 5.
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 10 }}>3 MIN READ · AI + EDITOR</div>
            </div>
          </div>

          <div className="card">
            <CardHead title="Topic series" />
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { n: 'Playoff Watch', e: '14/22', s: 'Daily NBA series' },
                { n: 'Title Race', e: '8/—', s: 'PL run-in' },
                { n: 'Tyre Wars', e: '5/—', s: 'F1 strategy' },
                { n: 'Slam Diary', e: '3/14', s: 'Tennis tour life' },
              ].map(s => (
                <div key={s.n} className="spread" style={{ padding: '6px 4px', cursor: 'pointer' }}>
                  <div>
                    <div className="row" style={{ gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--amber)' }} />
                      <span style={{ font: '600 12px "Inter Tight"' }}>{s.n}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', marginLeft: 11, marginTop: 1 }}>{s.s}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>{s.e}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Board>
  );
}

// Per-sport newsroom — articles INSIDE the sport's dashboard. NBA shown.
function NBANewsroomA() {
  return (
    <Board>
      <V3TopBar active="nba" sportLabel="NBA" sectionLabel="Newsroom" />
      <div style={{ padding: '12px 18px 0 18px', borderBottom: '1px solid var(--line)' }}>
        <div className="row" style={{ gap: 18 }}>
          {['Overview', 'Scores', 'Standings', 'Newsroom', 'Stats', 'Teams', 'Players'].map(t => (
            <button key={t} style={{
              background: 'transparent', border: 0, padding: '8px 0',
              color: t === 'Newsroom' ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: t === 'Newsroom' ? '2px solid var(--amber)' : '2px solid transparent',
              font: '600 12px "Inter Tight"', cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <ScreenHeader
        kicker="NBA · Newsroom"
        title="Playoffs coverage, every day"
        sub="118 articles this season · 4 active series · written in EN + BI"
        right={
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost">Latest</button>
            <button className="btn">Series</button>
            <button className="btn">Long reads</button>
          </div>
        }
      />

      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        <main style={{ minWidth: 0 }}>
          {/* Lead story */}
          <ArticleCardMag {...ARTICLES.nbaLead} size="xl" />

          {/* 2x2 sub-stories */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <ArticleCardMag {...ARTICLES.nba2} size="m" />
            <ArticleCardMag {...ARTICLES.nba3} size="m" />
          </div>

          {/* Wire list */}
          <div style={{ marginTop: 22 }}>
            <SectionRule title="Latest" />
            <div>
              {[ARTICLES.nba4, ARTICLES.nba5, ARTICLES.nba2, ARTICLES.nba3].map((a, i) => (
                <ArticleRow key={i} {...a} hot={i === 0} />
              ))}
            </div>
          </div>
        </main>

        <aside className="col" style={{ gap: 12 }}>
          <div className="card">
            <CardHead title="Series in NBA" />
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { n: 'Playoff Watch', c: 14, t: 22 },
                { n: 'Tatum Tape', c: 6, t: '—' },
                { n: 'Bench Report', c: 4, t: '—' },
              ].map(s => (
                <div key={s.n} className="spread" style={{ padding: '4px 0' }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--amber)' }} />
                    <span style={{ font: '600 12px "Inter Tight"' }}>{s.n}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{s.c}/{s.t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <CardHead title="Filter by tag" />
            <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {['celtics', 'nuggets', 'tatum', 'jokic', 'curry', 'lebron', 'mvp', 'playoffs', 'rookies', 'trade-rumors'].map(t => (
                <TagChip key={t}>{t}</TagChip>
              ))}
            </div>
          </div>

          <div className="card">
            <CardHead title="Live tonight" />
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="spread"><span className="row" style={{ gap: 6 }}><Crest short="DEN" color="#0E2240" size={16}/> Denver</span><span className="tab mono" style={{ fontWeight: 800 }}>78</span></div>
              <div className="spread"><span className="row" style={{ gap: 6 }}><Crest short="BOS" color="#007A33" size={16}/> Boston</span><span className="tab mono" style={{ fontWeight: 800 }}>82</span></div>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>Q3 4:12 · BOS LEADS 2-1</div>
            </div>
          </div>
        </aside>
      </div>
    </Board>
  );
}

// ===================== DIRECTION B =====================
// Editorial-led: home is a newspaper front. Live scores compress to a top strip.
// Best for "destination" readers who come for stories first, scores second.

function HomeEditorialB() {
  return (
    <Board>
      <V3TopBar active="home" />
      {/* Top live ribbon — always present, never the main act */}
      <LiveStrip items={[
        { sport: 'NBA', a: 'DEN', sa: 78, b: 'BOS', sb: 82, tag: 'Q3 4:12' },
        { sport: 'PL', a: 'ARS', sa: 2, b: 'MCI', sb: 1, tag: "67'" },
        { sport: 'F1', a: 'VER', sa: 'P1', b: 'NOR', sb: '+2.1', tag: 'L34' },
        { sport: 'Tennis', a: 'ALC', sa: 2, b: 'SIN', sb: 1, tag: 'Set 3' },
      ]}/>

      <ScreenHeader
        kicker="Today · May 3, 2026 · Jakarta"
        title="The newsroom"
        sub="Coverage across NBA, Premier League, Formula 1, Tennis"
        right={
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost">All</button>
            <button className="btn ghost">NBA</button>
            <button className="btn ghost">PL</button>
            <button className="btn ghost">F1</button>
            <button className="btn ghost">Tennis</button>
          </div>
        }
      />

      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1.5fr 1fr 320px', gap: 14 }}>
        {/* LEAD column */}
        <div className="col" style={{ gap: 14, minWidth: 0 }}>
          <article style={{ cursor: 'pointer' }}>
            <PlaceholderImg height={340} label="boston celtics third quarter" accent="rgba(245,158,11,.18)" />
            <div style={{ padding: '14px 0 0 0' }}>
              <div className="row" style={{ gap: 6, marginBottom: 8 }}>
                <SportIcon sport="NBA" size={12} color="var(--amber)"/>
                <span className="mono" style={{ fontSize: 10, color: 'var(--amber)', letterSpacing: '.16em', fontWeight: 700 }}>NBA · PLAYOFF WATCH</span>
              </div>
              <h2 style={{ font: '900 32px "Inter Tight"', letterSpacing: '-.025em', lineHeight: 1.05, margin: 0, textWrap: 'pretty' }}>
                Why the Celtics keep winning ugly — and why Denver should be worried
              </h2>
              <p style={{ font: '500 15px "Inter Tight"', color: 'var(--ink-2)', lineHeight: 1.5, margin: '12px 0 0 0', textWrap: 'pretty' }}>
                Boston has flipped the series with defense, not offense. The numbers behind a third-quarter pattern Mike Malone hasn't solved.
              </p>
              <div className="row" style={{ gap: 10, marginTop: 12, fontSize: 11, color: 'var(--ink-3)' }}>
                <span>Rian Pratama</span><span style={{ color: 'var(--ink-4)' }}>·</span>
                <span className="mono">2H AGO</span><span style={{ color: 'var(--ink-4)' }}>·</span>
                <span className="mono">6 MIN</span>
              </div>
            </div>
          </article>

          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '6px 0' }} />

          <ArticleCardMag {...ARTICLES.plLead} size="l" />
        </div>

        {/* MIDDLE column — secondary stack */}
        <div className="col" style={{ gap: 14, minWidth: 0 }}>
          <ArticleCardMag {...ARTICLES.f1Lead} size="m" />
          <ArticleCardMag {...ARTICLES.tennisLead} size="m" />
          <hr style={{ border: 0, borderTop: '1px solid var(--line-soft)' }} />
          {[ARTICLES.nba2, ARTICLES.pl2, ARTICLES.tennis2].map((a, i) => (
            <div key={i}>
              <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                <SportIcon sport={a.sport} size={11} color="var(--ink-3)"/>
                <span className="mono" style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, letterSpacing: '.14em' }}>{a.kicker.toUpperCase()}</span>
              </div>
              <div style={{ font: '700 14px "Inter Tight"', lineHeight: 1.3, letterSpacing: '-.005em', textWrap: 'pretty' }}>{a.title}</div>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', marginTop: 4 }}>{a.byline.toUpperCase()} · {a.time.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* RIGHT — wire feed + scores */}
        <aside className="col" style={{ gap: 12 }}>
          <div className="card">
            <CardHead title="Wire" right={<span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>LIVE</span>} accent="var(--blue)" />
            <div style={{ padding: 8 }}>
              {[
                { t: '12:08', txt: 'Sainz to Williams confirmed for 2025', s: 'F1' },
                { t: '11:42', txt: "Rodri surgery confirmed; out 4–6 months", s: 'PL' },
                { t: '11:21', txt: 'Jokić wins MVP — closest race since 2014', s: 'NBA' },
                { t: '10:50', txt: 'Sabalenka withdraws from Madrid SF', s: 'Tennis' },
                { t: '10:14', txt: 'Liverpool clinch top-4 with Brighton win', s: 'PL' },
                { t: '09:30', txt: 'Verstappen extends Imola lap record in FP2', s: 'F1' },
              ].map((w, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 8, padding: '6px 4px', borderBottom: i < 5 ? '1px solid var(--line-soft)' : 0, fontSize: 11 }}>
                  <span className="mono" style={{ color: 'var(--ink-3)' }}>{w.t}</span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: 'var(--ink-2)' }}>{w.txt}</span>
                    <div className="row" style={{ gap: 5, marginTop: 3 }}>
                      <SportIcon sport={w.s} size={9} color="var(--ink-4)"/>
                      <span className="mono" style={{ fontSize: 8.5, color: 'var(--ink-4)' }}>{w.s.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <CardHead title="Tonight" />
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 7, fontSize: 11 }}>
              {[
                { l: 'NBA', m: 'Lakers @ Warriors', t: '02:30 WIB' },
                { l: 'PL', m: 'Spurs vs Chelsea', t: '21:00 WIB' },
                { l: 'F1', m: 'Imola GP qualifying', t: '21:00 WIB' },
              ].map(r => (
                <div key={r.m} className="spread">
                  <div className="row" style={{ gap: 6 }}>
                    <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', width: 30 }}>{r.l}</span>
                    <span style={{ color: 'var(--ink-2)' }}>{r.m}</span>
                  </div>
                  <span className="mono tab" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{r.t}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Board>
  );
}

// Global newsroom front for Direction B
function GlobalNewsroomB() {
  return (
    <Board>
      <V3TopBar active="news" sectionLabel="Newsroom" />
      <ScreenHeader
        kicker="Newsroom · 412 articles this week"
        title="Read by sport, by series, by tag"
        sub="One destination for every story Gibol publishes. Cross-published into each sport's dashboard."
        right={
          <div className="row" style={{ gap: 6 }}>
            <button className="btn">Most read</button>
            <button className="btn ghost">Latest</button>
            <button className="btn ghost">Series</button>
            <button className="btn ghost">Long reads</button>
          </div>
        }
      />

      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '180px 1fr 280px', gap: 14 }}>
        <aside className="col" style={{ gap: 12 }}>
          <div className="card">
            <CardHead title="Sport" />
            <div style={{ padding: 8 }}>
              {['All sports', 'NBA · 118', 'Premier League · 142', 'Formula 1 · 88', 'Tennis · 64'].map((s, i) => (
                <div key={s} className="spread" style={{
                  padding: '6px 8px', borderRadius: 4,
                  background: i === 0 ? 'var(--bg-3)' : 'transparent',
                  fontSize: 11, cursor: 'pointer',
                }}>
                  <span style={{ color: i === 0 ? 'var(--ink)' : 'var(--ink-2)', fontWeight: i === 0 ? 700 : 500 }}>{s.split('·')[0]}</span>
                  {s.includes('·') && <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>{s.split('·')[1]}</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <CardHead title="Series" />
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { n: 'Playoff Watch', e: '14/22', sport: 'NBA' },
                { n: 'Title Race', e: '8/—', sport: 'PL' },
                { n: 'Tyre Wars', e: '5/—', sport: 'F1' },
                { n: 'Slam Diary', e: '3/14', sport: 'Tennis' },
                { n: 'Catatan Playoff', e: '12/—', sport: 'NBA' },
              ].map(s => (
                <div key={s.n} className="spread" style={{ padding: '4px 4px', cursor: 'pointer', fontSize: 11 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--amber)' }} />
                    <span style={{ fontWeight: 600 }}>{s.n}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>{s.e}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <CardHead title="Region" />
            <div style={{ padding: 8 }}>
              {[
                { n: 'EN', c: 412 }, { n: 'BI', c: 412 }, { n: 'EN-only', c: 38 }, { n: 'BI-only', c: 24 },
              ].map(r => (
                <div key={r.n} className="spread" style={{ padding: '5px 4px', fontSize: 11 }}>
                  <span style={{ color: 'var(--ink-2)' }}>{r.n}</span>
                  <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>{r.c}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main style={{ minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ArticleCardMag {...ARTICLES.nbaLead} size="l" />
            <ArticleCardMag {...ARTICLES.f1Lead} size="l" />
          </div>
          <div style={{ marginTop: 22 }}>
            <SectionRule title="Latest across all sports" />
            <div>
              {[ARTICLES.tennisLead, ARTICLES.plLead, ARTICLES.nba2, ARTICLES.pl2, ARTICLES.f12, ARTICLES.tennis2, ARTICLES.nba4, ARTICLES.pl3].map((a, i) => (
                <ArticleRow key={i} {...a} hot={i === 0} />
              ))}
            </div>
          </div>
        </main>

        <aside className="col" style={{ gap: 12 }}>
          <div className="card">
            <CardHead title="Most read · 24h" />
            <div style={{ padding: 4 }}>
              {[ARTICLES.nbaLead, ARTICLES.f1Lead, ARTICLES.tennisLead].map((a, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10, padding: '8px 10px', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
                  <span className="mono tab" style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-4)', lineHeight: 1 }}>{i + 1}</span>
                  <div>
                    <div style={{ font: '600 12.5px "Inter Tight"', lineHeight: 1.3, textWrap: 'pretty' }}>{a.title}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4 }}>{a.sport.toUpperCase()} · {a.time.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ background: 'rgba(245,158,11,.06)', borderColor: 'rgba(245,158,11,.22)' }}>
            <div style={{ padding: 14 }}>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--amber)', letterSpacing: '.14em', fontWeight: 700, marginBottom: 6 }}>NEWSLETTER</div>
              <div style={{ font: '700 14px "Inter Tight"', lineHeight: 1.3 }}>Get the day's stories in your inbox.</div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>One email at 06:00 WIB. EN + BI.</div>
              <button className="btn amber" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>Subscribe</button>
            </div>
          </div>
        </aside>
      </div>
    </Board>
  );
}

// ===================== DIRECTION C =====================
// Bold reset: editorial gets its own visual language. Big covers, oversized type, warm paper-tinted dark.
// Live becomes a persistent left rail — think trading floor + magazine.

function HomeBoldC() {
  return (
    <Board>
      <V3TopBar active="home" />
      <div style={{
        display: 'grid', gridTemplateColumns: '240px 1fr 280px',
        height: 'calc(100% - 50px)', overflow: 'hidden',
      }}>
        {/* LEFT — persistent live rail */}
        <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--bg)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="dot live"/>
              <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: 'var(--live)' }}>LIVE · 4</span>
            </div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '.1em' }}>UPDATED CONTINUOUSLY</div>
          </div>
          {[
            { sp: 'NBA', tag: 'Q3 4:12', a: 'DEN', sa: 78, ca: '#0E2240', b: 'BOS', sb: 82, cb: '#007A33', mom: 0.38 },
            { sp: 'PL', tag: "67'", a: 'ARS', sa: 2, ca: '#EF0107', b: 'MCI', sb: 1, cb: '#6CADDF', mom: 0.68 },
            { sp: 'F1', tag: 'L34', a: 'VER', sa: 'P1', ca: '#1E5BC6', b: 'NOR', sb: '+2.1', cb: '#FF8000', mom: 0.56 },
            { sp: 'Tennis', tag: 'Set 3', a: 'ALC', sa: '6 4 3', ca: '#FFCC00', b: 'SIN', sb: '3 6 4', cb: '#E30613', mom: 0.54 },
          ].map((m, i) => (
            <div key={i} style={{ padding: 12, borderBottom: '1px solid var(--line-soft)' }}>
              <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                <SportIcon sport={m.sp} size={11} color="var(--ink-3)" />
                <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{m.sp}</span>
                <span className="pill live" style={{ padding: '2px 5px', fontSize: 9, marginLeft: 'auto' }}><span className="dot live"/>{m.tag}</span>
              </div>
              <div className="spread"><span className="row" style={{ gap: 6 }}><Crest short={m.a} color={m.ca} size={16}/><span style={{ font: '600 12px "Inter Tight"' }}>{m.a}</span></span><span className="tab mono" style={{ fontWeight: 800, fontSize: 13 }}>{m.sa}</span></div>
              <div className="spread" style={{ marginTop: 3 }}><span className="row" style={{ gap: 6 }}><Crest short={m.b} color={m.cb} size={16}/><span style={{ font: '600 12px "Inter Tight"' }}>{m.b}</span></span><span className="tab mono" style={{ fontWeight: 800, fontSize: 13 }}>{m.sb}</span></div>
              <div style={{ marginTop: 8 }}><Momentum value={m.mom} home={m.ca} away={m.cb} /></div>
            </div>
          ))}
          <div style={{ padding: '14px 14px 8px 14px' }}>
            <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '.14em', marginBottom: 8 }}>UPCOMING TODAY</div>
            {[
              { t: '21:00', m: 'Spurs–Chelsea', l: 'PL' },
              { t: '21:00', m: 'Imola Quali', l: 'F1' },
              { t: '02:30', m: 'LAL–GSW', l: 'NBA' },
            ].map(r => (
              <div key={r.m} className="spread" style={{ padding: '5px 0', fontSize: 11 }}>
                <span className="mono" style={{ color: 'var(--ink-3)', width: 38 }}>{r.t}</span>
                <span style={{ flex: 1 }}>{r.m}</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>{r.l}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER — magazine cover */}
        <main style={{ overflowY: 'auto' }}>
          <div style={{ padding: '20px 28px 8px 28px' }}>
            <div className="spread">
              <div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--amber)', letterSpacing: '.18em', fontWeight: 700 }}>THE NEWSROOM · MAY 3</div>
                <div style={{ font: '900 30px "Inter Tight"', letterSpacing: '-.03em', marginTop: 4 }}>
                  Defense, math, and the title race
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn ghost">EN</button>
                <button className="btn">BI</button>
              </div>
            </div>
          </div>

          {/* Hero cover */}
          <div style={{ padding: '8px 28px 0 28px' }}>
            <article style={{
              position: 'relative', borderRadius: 12, overflow: 'hidden',
              border: '1px solid var(--line)', cursor: 'pointer',
            }}>
              <PlaceholderImg height={320} label="celtics third quarter portrait" accent="rgba(245,158,11,.22)" />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 30%, rgba(10,22,40,.85) 100%)',
              }}/>
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22 }}>
                <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                  <span className="pill amber"><span style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--amber)' }} />PLAYOFF WATCH · 14</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '.14em' }}>NBA · ANALYSIS · 6 MIN</span>
                </div>
                <h1 style={{ font: '900 38px "Inter Tight"', letterSpacing: '-.03em', lineHeight: 1.05, margin: 0, color: '#fff', textWrap: 'pretty' }}>
                  Why the Celtics keep winning ugly — and why Denver should be worried
                </h1>
                <p style={{ font: '500 15px "Inter Tight"', color: 'var(--ink-2)', lineHeight: 1.5, margin: '10px 0 0 0', maxWidth: 580, textWrap: 'pretty' }}>
                  Boston has flipped the series with defense, not offense. The numbers behind a third-quarter pattern that Mike Malone hasn't solved.
                </p>
                <div className="row" style={{ gap: 10, marginTop: 12, fontSize: 11, color: 'var(--ink-3)' }}>
                  <span style={{ color: '#fff' }}>Rian Pratama</span>
                  <span>·</span><span className="mono">2H AGO</span>
                </div>
              </div>
            </article>
          </div>

          {/* Sub-stories — 3 column */}
          <div style={{ padding: '20px 28px 0 28px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <ArticleCardMag {...ARTICLES.plLead} size="m" />
            <ArticleCardMag {...ARTICLES.f1Lead} size="m" />
            <ArticleCardMag {...ARTICLES.tennisLead} size="m" />
          </div>

          {/* Inline editorial section per sport */}
          <div style={{ padding: '32px 28px 0 28px' }}>
            <SectionRule title="By sport" right={<a style={{ fontSize: 10.5, color: 'var(--blue-2)' }}>Open Newsroom →</a>} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginTop: 8 }}>
              {[
                { sport: 'NBA', count: 118, lead: ARTICLES.nbaLead, second: ARTICLES.nba2, c: '#0E2240' },
                { sport: 'PL', count: 142, lead: ARTICLES.plLead, second: ARTICLES.pl2, c: '#EF0107' },
                { sport: 'F1', count: 88, lead: ARTICLES.f1Lead, second: ARTICLES.f12, c: '#1E5BC6' },
                { sport: 'Tennis', count: 64, lead: ARTICLES.tennisLead, second: ARTICLES.tennis2, c: '#FFCC00' },
              ].map(g => (
                <div key={g.sport}>
                  <div className="spread" style={{ paddingBottom: 8, borderBottom: `1px solid var(--line)`, marginBottom: 12 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ width: 3, height: 16, background: g.c }} />
                      <span style={{ font: '800 14px "Inter Tight"', letterSpacing: '-.01em' }}>{g.sport === 'PL' ? 'Premier League' : g.sport}</span>
                    </div>
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>{g.count} ARTICLES</span>
                  </div>
                  <ArticleCardMag {...g.lead} size="s" />
                  <div style={{ marginTop: 10 }}>
                    <ArticleRow {...g.second} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 40 }} />
        </main>

        {/* RIGHT — series + recap */}
        <aside style={{ borderLeft: '1px solid var(--line)', overflowY: 'auto', padding: 14 }}>
          <div className="card" style={{ background: 'rgba(245,158,11,.06)', borderColor: 'rgba(245,158,11,.22)', marginBottom: 12 }}>
            <div style={{ padding: 14 }}>
              <SeriesRibbon name="Catatan Playoff" episode={12} total="—"/>
              <div style={{ font: '800 18px "Inter Tight"', lineHeight: 1.2, marginTop: 12, textWrap: 'pretty' }}>
                Boston is one win away. Denver's bench can't keep up. Three takeaways from Game 5.
              </div>
              <Byline name="Newsroom" role="AI + editor" ai time="06:00 WIB" readTime="3 min"/>
            </div>
          </div>

          <SectionRule title="Series" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { n: 'Playoff Watch', e: '14/22', s: 'NBA' },
              { n: 'Title Race', e: '8/—', s: 'PL' },
              { n: 'Tyre Wars', e: '5/—', s: 'F1' },
              { n: 'Slam Diary', e: '3/14', s: 'Tennis' },
            ].map(s => (
              <div key={s.n} className="card" style={{ padding: 10, cursor: 'pointer' }}>
                <div className="spread">
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--amber)' }} />
                    <span style={{ font: '700 12px "Inter Tight"' }}>{s.n}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>{s.e}</span>
                </div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 4, letterSpacing: '.1em' }}>{s.s.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <SectionRule title="Tags" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {['playoffs', 'mvp-race', 'title-race', 'imola', 'madrid-open', 'transfer-window', 'rookies', 'tactics'].map(t => <TagChip key={t}>{t}</TagChip>)}
            </div>
          </div>
        </aside>
      </div>
    </Board>
  );
}

Object.assign(window, { HomeRefinedA, NBANewsroomA, HomeEditorialB, GlobalNewsroomB, HomeBoldC });
