// V4 — Home (Evolution direction, polished)
// Differences from v3 HomeB:
//  - Real SVG illustrations replace abstract placeholders
//  - Tighter type rhythm; the front-page sentence is bigger and the deck reads as journalism
//  - Newsroom column gets a "Reading list" CTA module
//  - Live console gets a tactical micro-chart (not just numbers)
//  - AI disclosure pill is consistent (V4AiByline)

function V4Home() {
  const { t } = useI18n3();
  const live = [
    { sport:'NBA', a:'DEN', as:78, b:'BOS', bs:82, tag:'Q3 4:12' },
    { sport:'PL',  a:'ARS', as:2,  b:'MCI', bs:1,  tag:"67'" },
    { sport:'F1',  a:'VER', as:'P1', b:'NOR', bs:'+2.1', tag:'L34' },
    { sport:'Tennis', a:'ALC', as:'6 4 3', b:'SIN', bs:'3 6 4', tag:'S3 3-2' },
  ];
  const lead = E.articles.NBA[0];

  return (
    <V3Board>
      <V3TopBar active="home"/>
      <V3LiveBand items={live}/>

      {/* Front-page sentence — what's happening right now, in plain language */}
      <div style={{ padding:'18px 22px 16px', borderBottom:'1px solid var(--line-soft)' }}>
        <div className="row" style={{ gap:8 }}>
          <V4Kicker>MON · 03 MAY 2026 · 19:48 WIB</V4Kicker>
          <span className="meta" style={{ color:'var(--ink-3)' }}>· UPDATED 2s AGO</span>
        </div>
        <h1 className="serif" style={{
          font:'600 32px/1.12 "Newsreader", Georgia, serif', letterSpacing:'-.018em',
          margin:'8px 0 0', maxWidth:880, color:'var(--ink)',
        }}>
          Boston has stolen Game 3 in Denver. Verstappen pits clean at Imola and rides home unchallenged. Alcaraz and Sinner go to a third in Madrid.
        </h1>
        <div className="deck" style={{ marginTop:8, fontSize:13, maxWidth:780, color:'var(--ink-3)' }}>
          A live snapshot of every sport you follow, plus what your editors think you should read.
        </div>
      </div>

      <div style={{ padding:'18px 22px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:28 }}>
        {/* LEFT — live console */}
        <section>
          <V3Rule label={`Live now · ${live.length}`} action={<button className="btn sm ghost">Open command center →</button>}/>
          <div className="col" style={{ gap:12 }}>
            {/* Hero — DEN/BOS with momentum */}
            <a className="card" data-sport-stripe style={{
              padding:0, position:'relative', overflow:'hidden', cursor:'pointer',
              borderLeft:`2px solid ${SPORT_COLORS.NBA}`, textDecoration:'none', color:'inherit', display:'block',
            }}>
              <div style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:0 }}>
                <V4Img kind="nba-game" tint={SPORT_COLORS.NBA} ratio="auto"
                  style={{ aspectRatio:'auto', height:'100%', minHeight:160, borderRadius:0, border:0, borderRight:'1px solid var(--line-soft)' }}/>
                <div style={{ padding:14 }}>
                  <div className="spread" style={{ marginBottom:8 }}>
                    <div className="row" style={{ gap:6 }}>
                      <V3SportTag sport="NBA"/>
                      <span className="pill live"><span className="dot live"/>Q3 · 4:12</span>
                    </div>
                    <span className="meta">CONF SF · GM 3 · DEN 2-1</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto', rowGap:6, alignItems:'center' }}>
                    <div className="row" style={{ gap:8 }}>
                      <V3Crest short="DEN" color="#0E2240" size={22}/>
                      <span style={{ font:'700 14px "Inter Tight"' }}>Denver Nuggets</span>
                    </div>
                    <span className="num" style={{ fontSize:30, fontWeight:900, letterSpacing:'-.04em' }}>78</span>
                    <div className="row" style={{ gap:8 }}>
                      <V3Crest short="BOS" color="#007A33" size={22}/>
                      <span style={{ font:'700 14px "Inter Tight"' }}>Boston Celtics</span>
                    </div>
                    <span className="num" style={{ fontSize:30, fontWeight:900, letterSpacing:'-.04em', color:'var(--amber)' }}>82</span>
                  </div>
                  <div style={{ marginTop:10 }}>
                    <V3Momentum value={0.38} home="#0E2240" away="#007A33"/>
                    <div className="meta" style={{ marginTop:4, textTransform:'none', letterSpacing:0, fontFamily:'Inter Tight', fontSize:11, color:'var(--ink-2)' }}>
                      Boston on a 9–2 run · Tatum 28 PTS, 10/18 FG · BOS bench +14
                    </div>
                  </div>
                </div>
              </div>
            </a>

            {/* 3 stacked compact tiles */}
            {[
              {sport:'PL', kind:'pl-stadium', a:'Arsenal', ac:'#EF0107', as:2, b:'Man City', bc:'#6CADDF', bs:1, tag:"67'", note:"Saka cut-back at 61' · xG 1.8–1.2"},
              {sport:'F1', kind:'f1-track',   a:'Verstappen', ac:'#1E5BC6', as:'P1', b:'Norris', bc:'#FF8000', bs:'+2.1', tag:'L34/63', note:'Pit window open · DRS-3 deficit'},
              {sport:'Tennis', kind:'tennis-court', a:'Alcaraz', ac:'#FFCC00', as:'6 4 3', b:'Sinner', bc:'#E30613', bs:'3 6 4', tag:'S3 3-2', note:'1st serve 71% · 4/7 break pts saved'},
            ].map((m,i)=>(
              <a key={i} className="card" data-sport-stripe style={{
                padding:0, display:'grid', gridTemplateColumns:'120px 1fr', gap:0,
                borderLeft:`2px solid ${SPORT_COLORS[m.sport]}`, cursor:'pointer', textDecoration:'none', color:'inherit',
              }}>
                <V4Img kind={m.kind} tint={SPORT_COLORS[m.sport]} ratio="auto"
                  style={{ aspectRatio:'auto', height:'100%', minHeight:96, borderRadius:0, border:0, borderRight:'1px solid var(--line-soft)' }}/>
                <div style={{ padding:'10px 12px' }}>
                  <div className="spread" style={{ marginBottom:6 }}>
                    <V3SportTag sport={m.sport}/>
                    <span className="pill live"><span className="dot live"/>{m.tag}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto', rowGap:3, alignItems:'center' }}>
                    <div className="row" style={{ gap:7 }}><V3Crest short={m.a.slice(0,3).toUpperCase()} color={m.ac} size={18}/><span style={{ font:'600 12px "Inter Tight"' }}>{m.a}</span></div>
                    <span className="num" style={{ fontWeight:800, fontSize:14 }}>{m.as}</span>
                    <div className="row" style={{ gap:7 }}><V3Crest short={m.b.slice(0,3).toUpperCase()} color={m.bc} size={18}/><span style={{ font:'600 12px "Inter Tight"' }}>{m.b}</span></div>
                    <span className="num" style={{ fontWeight:800, fontSize:14 }}>{m.bs}</span>
                  </div>
                  <div style={{ marginTop:6, fontSize:11, color:'var(--ink-2)', lineHeight:1.4 }}>{m.note}</div>
                </div>
              </a>
            ))}

            <button className="btn ghost" style={{ alignSelf:'flex-start', marginTop:2 }}>+ 8 more live · See all →</button>
          </div>
        </section>

        {/* RIGHT — newsroom */}
        <section>
          <V3Rule label="Newsroom" amber action={<button className="btn sm ghost">/news →</button>}/>
          <article style={{ cursor:'pointer', marginBottom:18 }}>
            <V4Img kind="photo-hero" tint={SPORT_COLORS.NBA} label="DENVER · GAME 3" ratio="16/9"/>
            <div className="row" style={{ gap:6, marginTop:10 }}>
              <V3SportTag sport="NBA"/>
              <span className="meta">{lead.kind}</span>
              <span className="meta" style={{ color:'var(--amber)' }}>· {lead.series?.toUpperCase()}</span>
            </div>
            <div className="serif" style={{
              font:'700 26px/1.14 "Newsreader", Georgia, serif', letterSpacing:'-.015em', marginTop:6,
            }}>
              {lead.head}
            </div>
            <div className="deck" style={{ marginTop:6 }}>{lead.deck}</div>
            <div className="row" style={{ gap:8, marginTop:8 }}>
              <span className="meta">{lead.by.toUpperCase()} · {lead.mins} MIN · {lead.when.toUpperCase()}</span>
            </div>
          </article>

          <hr className="loud"/>

          <div className="col" style={{ gap:14 }}>
            {[
              { a:E.articles.PL[0], sp:'PL', kind:'pl-ball' },
              { a:E.articles.F1[0], sp:'F1', kind:'f1-track' },
              { a:E.articles.Tennis[0], sp:'Tennis', kind:'tennis-court' },
            ].map(({a,sp,kind}) => (
              <article key={a.id} style={{ display:'grid', gridTemplateColumns:'140px 1fr', gap:14, cursor:'pointer' }}>
                <V4Img kind={kind} tint={SPORT_COLORS[sp]} ratio="4/3"/>
                <div>
                  <div className="row" style={{ gap:6 }}>
                    <V3SportTag sport={sp}/>
                    <span className="meta">{a.kind}</span>
                    {a.ai && <V4AiByline/>}
                  </div>
                  <div className="serif" style={{ font:'700 16px/1.25 "Newsreader", Georgia, serif', marginTop:5 }}>{a.head}</div>
                  <div style={{ fontSize:12, color:'var(--ink-2)', marginTop:3, lineHeight:1.45 }}>{a.deck}</div>
                  <div className="meta" style={{ marginTop:5 }}>{a.by.toUpperCase()} · {a.mins} MIN · {a.when.toUpperCase()}</div>
                </div>
              </article>
            ))}
          </div>

          <hr className="loud"/>

          <div className="card card-pad" style={{ background:'var(--amber-soft)', border:'1px solid rgba(245,158,11,.25)' }}>
            <V4Kicker>READING LIST · MONDAY EDITION</V4Kicker>
            <div className="serif" style={{ font:'600 16px/1.3 "Newsreader", Georgia, serif', marginTop:4 }}>
              Five long reads to start the week, picked by our editors.
            </div>
            <div className="col" style={{ gap:6, marginTop:10 }}>
              {[
                { t:'The shoot-around that quietly ended the Lakers era', m:14 },
                { t:'How a £45m signing rebuilt Aston Villa\'s spine', m:13 },
                { t:'Inside the Red Bull factory floor', m:18 },
              ].map((r,i)=>(
                <div key={i} className="row" style={{ gap:8, padding:'5px 0', borderTop: i?'1px dashed rgba(245,158,11,.2)':0 }}>
                  <span className="num" style={{ fontSize:11, color:'var(--amber)', width:18 }}>0{i+1}</span>
                  <span style={{ fontSize:12.5, fontWeight:600, flex:1 }}>{r.t}</span>
                  <span className="meta" style={{ color:'var(--amber)' }}>{r.m}m</span>
                </div>
              ))}
            </div>
            <button className="btn amber sm" style={{ marginTop:10 }}>Open list →</button>
          </div>

          <hr className="loud"/>

          <V3Rule label={t.popularTags}/>
          <div className="row" style={{ gap:5, flexWrap:'wrap' }}>
            {E.popularTags.slice(0,12).map(tag => (
              <span key={tag} className="pill outline" style={{ cursor:'pointer' }}>#{tag}</span>
            ))}
          </div>
        </section>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

window.V4Home = V4Home;
