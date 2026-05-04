// V4 — NBA Dashboard. Refines v3 DashNBA with:
//  - Sub-nav split into "scoreboard pages" and "newsroom pages"
//  - Game Center entry from the hero
//  - Real imagery in newsroom strip
//  - Compact "Series" page module on the right rail (pulls from E.series)
//  - data-screen-label tag for comment context

function V4DashNBA() {
  const subnav = (
    <V3SubNav active="overview" items={[
      {id:'overview', label:'Overview'},
      {id:'live', label:'Live · 3'},
      {id:'standings', label:'Standings'},
      {id:'bracket', label:'Playoff bracket'},
      {id:'fixtures', label:'Fixtures'},
      {id:'stats', label:'Stats'},
      {id:'news', label:'News'},
      {id:'teams', label:'Teams'},
    ]}/>
  );
  return (
    <V3Board>
      <V3TopBar active="NBA" currentSport="NBA" subnav={subnav}/>
      <V3LiveBand items={[
        { sport:'NBA', a:'DEN', as:78, b:'BOS', bs:82, tag:'Q3 4:12' },
        { sport:'NBA', a:'LAL', as:44, b:'GSW', bs:48, tag:'Q2 8:40' },
        { sport:'NBA', a:'NYK', as:0,  b:'MIL', bs:0,  tag:'19:30' },
      ]}/>
      <div data-screen-label="NBA Dashboard" style={{ padding:18, display:'grid', gridTemplateColumns:'1fr 280px', gap:18 }}>
        <main className="col" style={{ gap:18, minWidth:0 }}>
          {/* Hero — landscape, image left, KPIs right */}
          <a className="card" data-sport-stripe style={{
            position:'relative', overflow:'hidden', cursor:'pointer', textDecoration:'none', color:'inherit', display:'block',
            borderLeft:`2px solid ${SPORT_COLORS.NBA}`,
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:0 }}>
              <V4Img kind="photo-hero" tint={SPORT_COLORS.NBA} label="DENVER · BOSTON" ratio="auto"
                style={{ aspectRatio:'auto', height:'100%', minHeight:200, borderRadius:0, border:0, borderRight:'1px solid var(--line-soft)' }}/>
              <div style={{ padding:18 }}>
                <div className="row" style={{ gap:8, marginBottom:8 }}>
                  <V4Kicker>WEST CONF SF · GAME 3</V4Kicker>
                  <span className="pill live"><span className="dot live"/>Q3 · 4:12</span>
                </div>
                <h1 className="disp" style={{ font:'800 26px/1.05 "Inter Tight"', letterSpacing:'-.025em' }}>
                  Denver Nuggets <span style={{ color:'var(--ink-3)' }}>vs</span> Boston Celtics
                </h1>
                <div className="meta" style={{ marginTop:6, color:'var(--ink-2)', fontSize:11.5, fontFamily:'Inter Tight', textTransform:'none', letterSpacing:0 }}>
                  Ball Arena, Denver · Series 2-1 DEN · TV · TNT, NBA League Pass
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginTop:14, paddingTop:14, borderTop:'1px solid var(--line-soft)' }}>
                  {[
                    { l:'SCORE', v:'78 — 82', s:'BOS +4' },
                    { l:'SERIES', v:'2 — 1', s:'DEN leads' },
                    { l:'WIN PROB', v:'42 / 58%', s:'BOS' },
                    { l:'PACE', v:'97.4', s:'-2.8 vs avg' },
                  ].map((k,i)=>(
                    <div key={i}>
                      <div className="meta">{k.l}</div>
                      <div className="num" style={{ fontSize:18, fontWeight:800, marginTop:3 }}>{k.v}</div>
                      <div style={{ fontSize:10.5, color:'var(--ink-3)', marginTop:2 }}>{k.s}</div>
                    </div>
                  ))}
                </div>
                <button className="btn amber sm" style={{ marginTop:14 }}>Open Game Center →</button>
              </div>
            </div>
          </a>

          {/* Live grid + bracket preview row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="card">
              <div className="card-head"><span className="card-title">Live & today</span><span className="meta">3 GAMES</span></div>
              <div>
                {[
                  {tag:'Q3 4:12', live:true, a:'DEN', as:78, b:'BOS', bs:82, ac:'#0E2240', bc:'#007A33'},
                  {tag:'Q2 8:40', live:true, a:'LAL', as:44, b:'GSW', bs:48, ac:'#552583', bc:'#FFC72C'},
                  {tag:'19:30',   live:false, a:'NYK', as:'', b:'MIL', bs:'', ac:'#006BB6', bc:'#00471B'},
                ].map((m,i)=>(
                  <div key={i} style={{ padding:'12px 14px', borderTop: i?'1px solid var(--line-soft)':0, display:'grid', gridTemplateColumns:'1fr auto', gap:6, alignItems:'center' }}>
                    <div>
                      <div className="row" style={{ gap:8, marginBottom:3 }}><V3Crest short={m.a} color={m.ac} size={18}/><span style={{ fontSize:12.5, fontWeight:600 }}>{m.a}</span><span className="num" style={{ marginLeft:'auto', fontWeight:800, fontSize:14 }}>{m.as}</span></div>
                      <div className="row" style={{ gap:8 }}><V3Crest short={m.b} color={m.bc} size={18}/><span style={{ fontSize:12.5, fontWeight:600 }}>{m.b}</span><span className="num" style={{ marginLeft:'auto', fontWeight:800, fontSize:14 }}>{m.bs}</span></div>
                    </div>
                    {m.live ? <span className="pill live"><span className="dot live"/>{m.tag}</span> : <span className="pill outline">{m.tag}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">Playoff bracket · Round 2</span><button className="btn sm ghost">Full →</button></div>
              <div style={{ padding:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  {team:'BOS',c:'#007A33',s:3,opp:'IND',os:1,w:false},
                  {team:'NYK',c:'#006BB6',s:2,opp:'MIL',os:2,w:false},
                  {team:'DEN',c:'#0E2240',s:2,opp:'BOS',os:1,w:true},
                  {team:'OKC',c:'#007AC1',s:3,opp:'LAL',os:2,w:true},
                ].map((b,i)=>(
                  <div key={i} className="row" style={{ gap:8, padding:'8px 10px', background:'var(--bg-3)', borderRadius:6 }}>
                    <V3Crest short={b.team} color={b.c} size={22}/>
                    <div style={{ flex:1, fontSize:12 }}>
                      <div style={{ fontWeight:700 }}>{b.team} <span className="num" style={{ color:'var(--ink-3)' }}>{b.s}-{b.os}</span> {b.opp}</div>
                      <div className="meta">{b.w?'WEST':'EAST'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Standings */}
          <div className="card">
            <div className="card-head"><span className="card-title">Conference Standings · East</span><button className="btn sm ghost">All →</button></div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }} className="tab">
              <thead><tr style={{ color:'var(--ink-3)', fontFamily:"'JetBrains Mono'", fontSize:9.5, letterSpacing:'.1em' }}>
                {['#','TEAM','W','L','PCT','GB','STRK','L10'].map((h,i)=><th key={i} style={{ textAlign: i<2?'left':'right', padding:'9px 12px', borderBottom:'1px solid var(--line-soft)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[
                  [1,'BOS','#007A33','64','18','.780','—','W6','9-1'],
                  [2,'MIL','#00471B','58','24','.707','6.0','W2','7-3'],
                  [3,'NYK','#006BB6','55','27','.671','9.0','L1','6-4'],
                  [4,'CLE','#860038','51','31','.622','13.0','W3','7-3'],
                ].map((r,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid var(--line-soft)' }}>
                    <td style={{ padding:'9px 12px', color:'var(--ink-3)' }} className="num">{r[0]}</td>
                    <td style={{ padding:'9px 12px' }}><div className="row" style={{ gap:8 }}><V3Crest short={r[1]} color={r[2]} size={18}/><span style={{ fontWeight:700 }}>{r[1]}</span></div></td>
                    {r.slice(3).map((c,j)=><td key={j} className="num" style={{ padding:'9px 12px', textAlign:'right', fontWeight: j===0?700:500 }}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* NEWSROOM SLICE */}
          <div>
            <V3Rule label="NBA Newsroom" amber action={<button className="btn sm ghost">/nba/news →</button>}/>
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:14 }}>
              {E.articles.NBA.slice(0,3).map((a,i)=>{
                const kind = i===0 ? 'photo-hero' : i===1 ? 'nba-game' : 'nba-player';
                return (
                  <article key={a.id} className="art" style={{ cursor:'pointer' }}>
                    <V4Img kind={kind} tint={SPORT_COLORS.NBA} ratio={i===0?'16/9':'4/3'}/>
                    <div className="row" style={{ gap:6 }}>
                      <span className="meta">{a.kind}</span>
                      {a.series && <span className="meta" style={{ color:'var(--amber)' }}>· {a.series}</span>}
                      {a.ai && <V4AiByline/>}
                    </div>
                    <div className="serif head" style={{ font:`700 ${i===0?'19':'14'}px/1.25 "Newsreader", Georgia, serif` }}>{a.head}</div>
                    {i===0 && <div style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.45 }}>{a.deck}</div>}
                    <div className="meta">{a.by.toUpperCase()} · {a.mins} MIN · {a.when.toUpperCase()}</div>
                  </article>
                );
              })}
            </div>
          </div>
        </main>

        <aside className="col" style={{ gap:14 }}>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Topic series · NBA</div>
            <div className="col" style={{ gap:8 }}>
              {E.series.filter(s=>s.sport==='NBA'||s.sport==='Multi').slice(0,4).map(s=>(
                <div key={s.id} className="spread" style={{ cursor:'pointer' }}>
                  <div className="row" style={{ gap:8 }}><span style={{ width:3, height:14, background:s.color, borderRadius:2 }}/><span style={{ fontSize:12, fontWeight:600 }}>{s.name}</span></div>
                  <span className="num" style={{ fontSize:10, color:'var(--ink-3)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Top scorers · season</div>
            <div className="col" style={{ gap:7 }}>
              {[['Luka Dončić','DAL',32.4],['Shai G-A','OKC',30.9],['Jayson Tatum','BOS',28.1],['Giannis A.','MIL',27.2]].map((p,i)=>(
                <div key={i} className="spread"><span style={{ fontSize:12 }}>{p[0]} <span style={{ color:'var(--ink-3)', fontSize:10 }}>{p[1]}</span></span><span className="num" style={{ fontWeight:700 }}>{p[2]}</span></div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Popular tags</div>
            <div className="row" style={{ gap:5, flexWrap:'wrap' }}>
              {['Tatum','Jokić','OKC','Wemby','Bracket','Brunson'].map(t=>(<span key={t} className="pill outline">#{t}</span>))}
            </div>
          </div>
        </aside>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

// ----- GAME CENTER (live deep dive) -----
function V4GameCenter() {
  const sub = (
    <V3SubNav active="liveplay" items={[
      {id:'liveplay', label:'Live play'}, {id:'box', label:'Box score'},
      {id:'shot', label:'Shot chart'}, {id:'pbp', label:'Play-by-play'},
      {id:'stats', label:'Team stats'}, {id:'preview', label:'Preview'}, {id:'recap', label:'Recap'},
    ]}/>
  );
  // fake quarter scores
  const Q = [['1Q','22','19'],['2Q','21','24'],['3Q','19','25'],['4Q','—','—'],['F','62','68']];
  return (
    <V3Board>
      <V3TopBar active="NBA" currentSport="NBA" subnav={sub}/>
      <V3LiveBand items={[
        { sport:'NBA', a:'DEN', as:78, b:'BOS', bs:82, tag:'Q3 4:12' },
      ]}/>
      <div data-screen-label="NBA · Game Center · DEN-BOS" style={{ padding:18 }}>
        {/* Header */}
        <div className="row" style={{ gap:8, marginBottom:8 }}>
          <span className="meta" style={{ color:'var(--ink-3)' }}>NBA · WEST CONF SF · GM 3 ·</span>
          <V4Kicker>BALL ARENA, DENVER · 03 MAY · 19:30 LOCAL</V4Kicker>
        </div>

        <div className="card" data-sport-stripe style={{
          padding:0, position:'relative', overflow:'hidden', borderLeft:`2px solid ${SPORT_COLORS.NBA}`,
        }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px 1fr', alignItems:'center', padding:'22px 26px' }}>
            {/* Home side */}
            <div className="row" style={{ gap:14 }}>
              <V3Crest short="DEN" color="#0E2240" size={56}/>
              <div>
                <div style={{ font:'800 22px "Inter Tight"', letterSpacing:'-.02em' }}>Denver</div>
                <div className="meta">HOME · 64-18 · WEST #2</div>
                <div style={{ display:'flex', gap:5, marginTop:6 }}>
                  {'WWLWW'.split('').map((c,i)=>(
                    <span key={i} style={{ width:14, height:5, borderRadius:1, background: c==='W'?'var(--up)':'var(--down)' }}/>
                  ))}
                </div>
              </div>
            </div>
            {/* Score */}
            <div style={{ textAlign:'center' }}>
              <span className="pill live"><span className="dot live"/>LIVE · Q3 · 4:12</span>
              <div className="num" style={{ fontSize:64, fontWeight:900, letterSpacing:'-.06em', lineHeight:1, marginTop:6 }}>
                <span style={{ color:'var(--ink-3)' }}>78</span>
                <span style={{ color:'var(--ink-4)', margin:'0 16px', fontWeight:300 }}>—</span>
                <span style={{ color:'var(--amber)' }}>82</span>
              </div>
              <div className="meta" style={{ marginTop:6 }}>BOS ON 9–2 RUN · LAST 3:24</div>
            </div>
            {/* Away */}
            <div className="row" style={{ gap:14, justifyContent:'flex-end' }}>
              <div style={{ textAlign:'right' }}>
                <div style={{ font:'800 22px "Inter Tight"', letterSpacing:'-.02em' }}>Boston</div>
                <div className="meta">AWAY · 64-18 · EAST #1</div>
                <div style={{ display:'flex', gap:5, marginTop:6, justifyContent:'flex-end' }}>
                  {'WWWWW'.split('').map((c,i)=>(
                    <span key={i} style={{ width:14, height:5, borderRadius:1, background:'var(--up)' }}/>
                  ))}
                </div>
              </div>
              <V3Crest short="BOS" color="#007A33" size={56}/>
            </div>
          </div>
          <div style={{ padding:'0 26px 18px' }}>
            <V3Momentum value={0.38} home="#0E2240" away="#007A33" h={6}/>
          </div>
        </div>

        {/* Body grid */}
        <div style={{ marginTop:18, display:'grid', gridTemplateColumns:'1fr 320px', gap:18 }}>
          <main className="col" style={{ gap:14 }}>
            {/* Quarter scores */}
            <div className="card">
              <div className="card-head"><span className="card-title">By quarter</span></div>
              <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }} className="tab mono">
                <thead><tr style={{ color:'var(--ink-3)', fontSize:10 }}>
                  {['','1Q','2Q','3Q','4Q','F'].map((h,i)=><th key={i} style={{ padding:'8px 10px', textAlign: i?'right':'left', borderBottom:'1px solid var(--line-soft)' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  <tr style={{ borderBottom:'1px solid var(--line-soft)' }}>
                    <td style={{ padding:'10px', fontWeight:700 }}><span className="row" style={{ gap:8 }}><V3Crest short="DEN" color="#0E2240" size={18}/>Denver</span></td>
                    {['22','21','19','—','62'].map((c,i)=><td key={i} style={{ padding:'10px', textAlign:'right', fontWeight: i===4?800:500, color: i===4?'var(--ink)':'var(--ink-2)' }}>{c}</td>)}
                  </tr>
                  <tr>
                    <td style={{ padding:'10px', fontWeight:700 }}><span className="row" style={{ gap:8 }}><V3Crest short="BOS" color="#007A33" size={18}/>Boston</span></td>
                    {['19','24','25','—','68'].map((c,i)=><td key={i} style={{ padding:'10px', textAlign:'right', fontWeight: i===4?800:500, color: i===4?'var(--amber)':'var(--ink-2)' }}>{c}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Box score top players */}
            <div className="card">
              <div className="card-head"><span className="card-title">Top performers</span></div>
              <div style={{ padding:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  {team:'DEN', c:'#0E2240', name:'Nikola Jokić', pos:'C', stats:[['PTS',24],['REB',12],['AST',9],['MIN',31]]},
                  {team:'BOS', c:'#007A33', name:'Jayson Tatum', pos:'F', stats:[['PTS',28],['REB',8],['AST',5],['MIN',29]], hot:true},
                  {team:'DEN', c:'#0E2240', name:'Jamal Murray', pos:'G', stats:[['PTS',18],['REB',3],['AST',7],['MIN',28]]},
                  {team:'BOS', c:'#007A33', name:'Jaylen Brown', pos:'G', stats:[['PTS',17],['REB',5],['AST',3],['MIN',26]]},
                ].map((p,i)=>(
                  <div key={i} className="card" style={{ padding:10, background:'var(--bg-3)' }}>
                    <div className="row" style={{ gap:8, marginBottom:8 }}>
                      <V3Crest short={p.team} color={p.c} size={20}/>
                      <div>
                        <div style={{ font:'700 13px "Inter Tight"' }}>{p.name}</div>
                        <div className="meta">{p.team} · {p.pos}{p.hot && <span style={{ color:'var(--amber)', marginLeft:6 }}>· HOT</span>}</div>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                      {p.stats.map(([k,v])=>(
                        <div key={k} style={{ background:'var(--bg)', borderRadius:4, padding:'5px 7px' }}>
                          <div className="meta">{k}</div>
                          <div className="num" style={{ fontWeight:800, fontSize:14 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI summary card */}
            <div className="card" style={{ borderColor:'rgba(245,158,11,.3)', background:'var(--amber-soft)' }}>
              <div className="card-head" style={{ borderBottom:'1px solid rgba(245,158,11,.2)' }}>
                <span className="row" style={{ gap:8 }}><V4AiByline/><span className="card-title" style={{ color:'var(--amber)' }}>Live summary · updated 8s ago</span></span>
              </div>
              <div style={{ padding:14, fontSize:13, lineHeight:1.55, color:'var(--ink-2)' }}>
                Boston has flipped the third quarter on a <b style={{ color:'var(--ink)' }}>9–2 run</b>. Mazzulla's adjustment to trap Murray on the side pick-and-roll is forcing Jokić to start higher up the floor, and Tatum (28 PTS, 10/18 FG) is punishing the rotation. The Nuggets' bench is at <b style={{ color:'var(--ink)' }}>-8</b> across 7 minutes; Joker has now played 31 of his last 32. Pit window for Boston: ride this out, hold the lead through the under-eight in Q4.
                <div className="row" style={{ gap:8, marginTop:10, paddingTop:10, borderTop:'1px solid rgba(245,158,11,.2)' }}>
                  <button className="btn sm ghost" style={{ color:'var(--amber)' }}>How is this written? →</button>
                  <span className="meta">SOURCES: NBA.COM, OPTA, EDITOR ON DUTY</span>
                </div>
              </div>
            </div>
          </main>

          <aside className="col" style={{ gap:12 }}>
            {/* Win prob spark */}
            <div className="card card-pad">
              <div className="spread" style={{ marginBottom:8 }}>
                <span className="card-title">Win probability</span>
                <span className="num" style={{ fontSize:11, color:'var(--ink-3)' }}>BOS 58%</span>
              </div>
              <div style={{ position:'relative' }}>
                <V3Spark data={[50,52,49,46,47,52,55,53,49,44,48,52,57,58]} w={260} h={48} color="#007A33"/>
                <div style={{ position:'absolute', inset:0, borderTop:'1px dashed var(--line-soft)', top:'50%' }}/>
              </div>
              <div className="row" style={{ marginTop:6, justifyContent:'space-between' }}>
                <span className="meta">TIP-OFF</span><span className="meta">NOW · Q3 4:12</span>
              </div>
            </div>

            {/* Play feed */}
            <div className="card">
              <div className="card-head"><span className="card-title">Play feed</span><span className="meta">Q3</span></div>
              <div style={{ maxHeight:280, overflow:'auto' }}>
                {[
                  {t:'4:12', team:'BOS', text:'Tatum — 3PT made, assist Brown', big:true},
                  {t:'4:34', team:'DEN', text:'Jokić — turnover (steal Brown)'},
                  {t:'4:51', team:'BOS', text:'Brown — Layup made'},
                  {t:'5:18', team:'BOS', text:'Holiday — 3PT made'},
                  {t:'5:42', team:'DEN', text:'MPJ — 3PT missed'},
                  {t:'6:08', team:'BOS', text:'Tatum — Free throw 2/2'},
                  {t:'6:24', team:'DEN', text:'Murray — Foul (offensive)'},
                  {t:'6:50', team:'BOS', text:'Mazzulla — Timeout 20s'},
                ].map((p,i)=>(
                  <div key={i} className="row" style={{ gap:10, padding:'7px 12px', borderTop: i?'1px solid var(--line-soft)':0,
                    background: p.big ? 'rgba(245,158,11,.06)':'transparent' }}>
                    <span className="num" style={{ fontSize:10.5, color:'var(--ink-3)', width:32 }}>{p.t}</span>
                    <span style={{ width:3, height:14, background: p.team==='DEN'?'#0E2240':'#007A33', borderRadius:1 }}/>
                    <span style={{ fontSize:11.5, color: p.big?'var(--ink)':'var(--ink-2)', fontWeight: p.big?700:400 }}>{p.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Series tracker */}
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom:8 }}>Series · DEN vs BOS</div>
              <div className="row" style={{ gap:5, marginBottom:8 }}>
                {[{r:'G1',w:'DEN',s:'112-105'},{r:'G2',w:'DEN',s:'118-110'},{r:'G3',w:'BOS',s:'LIVE'},{r:'G4',w:null,s:'WED 19:30'},{r:'G5',w:null,s:'IF NEEDED'}].map((g,i)=>(
                  <div key={i} style={{ flex:1, padding:'6px 4px', textAlign:'center',
                    background: g.s==='LIVE' ? 'var(--live-soft)' : 'var(--bg-3)',
                    borderRadius:4, border: g.s==='LIVE' ? '1px solid var(--live)' : '1px solid var(--line-soft)' }}>
                    <div className="meta" style={{ color: g.s==='LIVE'?'var(--live)':'var(--ink-3)' }}>{g.r}</div>
                    <div className="num" style={{ fontWeight:800, fontSize:11, marginTop:2,
                      color: g.w==='DEN'?'var(--ink)': g.w==='BOS'?'var(--amber)':'var(--ink-3)' }}>
                      {g.w || g.s.slice(0,3)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="meta" style={{ textAlign:'center' }}>BEST OF 7 · DEN LEADS 2-1</div>
            </div>
          </aside>
        </div>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

// ----- ARTICLE READING -----
function V4Article() {
  const a = E.articles.NBA[0];
  const related = E.articles.NBA.slice(1,4);
  return (
    <V3Board>
      <V3TopBar active="NBA" currentSport="NBA"/>
      <div data-screen-label="NBA · Article · Game 3 recap">
        {/* Hero band */}
        <div style={{ position:'relative', overflow:'hidden' }}>
          <V4Img kind="photo-hero" tint={SPORT_COLORS.NBA} ratio="auto"
            style={{ aspectRatio:'auto', height:380, borderRadius:0, border:0 }}/>
          <div style={{ position:'absolute', inset:0, padding:'40px 28px',
            background:'linear-gradient(180deg, transparent 0%, transparent 50%, rgba(10,22,40,.85) 100%)',
            display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <div className="row" style={{ gap:8, marginBottom:8 }}>
              <V3SportTag sport="NBA"/>
              <span className="meta" style={{ color:'var(--ink)' }}>{a.kind}</span>
              <V4Kicker>{a.series?.toUpperCase()}</V4Kicker>
            </div>
            <h1 className="serif" style={{
              font:'800 44px/1.05 "Newsreader", Georgia, serif', letterSpacing:'-.025em', maxWidth:840, margin:0,
            }}>{a.head}</h1>
            <div className="deck" style={{ marginTop:10, fontSize:15, color:'rgba(230,238,249,.85)', maxWidth:720, lineHeight:1.5 }}>
              {a.deck}
            </div>
            <div className="meta" style={{ marginTop:10, color:'rgba(230,238,249,.55)' }}>
              PHOTO · BALL ARENA, DENVER · MAY 03 · STAFF
            </div>
          </div>
        </div>

        {/* Byline strip */}
        <div style={{ padding:'16px 28px', borderBottom:'1px solid var(--line-soft)' }}>
          <div className="row" style={{ gap:14, maxWidth:1100, margin:'0 auto' }}>
            <div className="row" style={{ gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg, var(--blue), var(--amber))' }}/>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{a.by}</div>
                <div className="meta" style={{ marginTop:1 }}>STAFF WRITER · NBA BEAT · @REZA</div>
              </div>
            </div>
            <span style={{ width:1, height:32, background:'var(--line-soft)' }}/>
            <div className="meta">{a.when.toUpperCase()} · {a.mins} MIN READ · EN/BI</div>
            <div className="row" style={{ marginLeft:'auto', gap:6 }}>
              <button className="btn sm">⌘ Save</button>
              <button className="btn sm">↗ Share</button>
              <button className="btn sm ghost">EN ↔ BI</button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'32px 28px', display:'grid', gridTemplateColumns:'minmax(0,1fr) 280px', gap:36, maxWidth:1140, margin:'0 auto' }}>
          <article style={{ maxWidth:680, justifySelf:'center', minWidth:0 }}>
            <div className="serif" style={{ fontFamily:'"Newsreader", Georgia, serif', fontSize:18, lineHeight:1.7, color:'var(--ink)' }}>
              <p style={{ marginTop:0, font:'500 22px/1.45 "Newsreader"' }}>
                <span style={{ float:'left', font:'800 64px/0.85 "Newsreader"', marginRight:8, marginTop:6, color:'var(--amber)' }}>T</span>
                he first sign came at the 7:48 mark of the third quarter. Tatum took a half-step left, then drove right, and Boston's bench knew before the ball found Brown in the corner. The next four minutes belonged to them. The next two months might too.
              </p>
              <p>Denver had been favored all week. The Nuggets had Jokić, the homecourt, and a 2-1 lead. What they did not have, it turned out, was a bench. By the time Mike Malone called timeout with 4:12 to play, the Celtics had outscored Denver 9-2 in two trips up the floor and Joker had played 31 of his last 32 minutes.</p>

              <h2 className="serif" style={{ font:'700 26px/1.2 "Newsreader"', marginTop:30, letterSpacing:'-.01em' }}>A small, specific adjustment</h2>
              <p>Mazzulla's adjustment was small but specific: trap Murray on the side pick-and-roll, force Jokić to start his action higher, and let Brown roam. It worked because Boston has the personnel for it — and because Denver's bench could not punish them for it.</p>

              <blockquote style={{ borderLeft:`3px solid var(--amber)`, paddingLeft:20, margin:'28px 0', font:'500 italic 22px/1.45 "Newsreader"', color:'var(--ink)' }}>
                "We weren't trying to score every possession. We were trying to make them tired. By the third quarter you could see it."
                <div className="meta" style={{ marginTop:8, fontStyle:'normal', color:'var(--ink-3)' }}>— JOE MAZZULLA, POSTGAME</div>
              </blockquote>

              {/* Inline data card */}
              <div className="card" style={{ margin:'24px 0', padding:14, fontFamily:'"Inter Tight"', fontSize:13 }}>
                <div className="card-title" style={{ marginBottom:8 }}>The bench problem · Q3 minutes</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <div className="row" style={{ gap:8, marginBottom:5 }}><V3Crest short="DEN" color="#0E2240" size={16}/><span style={{ fontWeight:700 }}>Denver bench</span></div>
                    <div className="num" style={{ fontSize:24, fontWeight:900, color:'var(--down)' }}>-8</div>
                    <div className="meta" style={{ marginTop:3 }}>7 MIN · 6 PTS · 11 ALLOWED</div>
                  </div>
                  <div>
                    <div className="row" style={{ gap:8, marginBottom:5 }}><V3Crest short="BOS" color="#007A33" size={16}/><span style={{ fontWeight:700 }}>Boston bench</span></div>
                    <div className="num" style={{ fontSize:24, fontWeight:900, color:'var(--up)' }}>+14</div>
                    <div className="meta" style={{ marginTop:3 }}>9 MIN · 18 PTS · 4 ALLOWED</div>
                  </div>
                </div>
              </div>

              <p>Whether that translates to a Game 4 win in Boston is another question. The Nuggets are still a championship team. But for the first time in this series, they look like a beatable one.</p>
              <p>And whoever wins this series will have one fewer question to answer in the Finals.</p>
            </div>

            {/* Tags + AI footnote */}
            <div className="row" style={{ gap:6, flexWrap:'wrap', marginTop:32, paddingTop:18, borderTop:'1px solid var(--line-soft)' }}>
              <span className="meta" style={{ marginRight:6 }}>TAGS</span>
              {a.tags.map(tg => <span key={tg} className="pill outline">#{tg}</span>)}
            </div>

            <div style={{ marginTop:18, padding:14, background:'var(--bg-2)', border:'1px dashed var(--line)', borderRadius:8 }}>
              <div className="row" style={{ gap:8 }}>
                <span style={{ font:'800 9px/1 "JetBrains Mono"', letterSpacing:'.18em', color:'var(--ink-3)' }}>HOW THIS WAS WRITTEN</span>
              </div>
              <div style={{ fontSize:12.5, color:'var(--ink-2)', lineHeight:1.55, marginTop:6 }}>
                Reporting and writing by <b style={{ color:'var(--ink)' }}>{a.by}</b>, on the ground at Ball Arena. No AI generation was used in this article. Live data sourced from the NBA stats API and Opta. <a style={{ color:'var(--amber)', cursor:'pointer' }}>Read our editorial standards →</a>
              </div>
            </div>
          </article>

          {/* Right rail — sticky */}
          <aside className="col" style={{ gap:18, position:'sticky', top:80, alignSelf:'start' }}>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom:8 }}>In this story</div>
              <div className="col" style={{ gap:6 }}>
                {[
                  {n:'Denver Nuggets', sub:'Lost Game 3 · 78–82', c:'#0E2240', sh:'DEN'},
                  {n:'Boston Celtics', sub:'Won Game 3 · 82–78', c:'#007A33', sh:'BOS'},
                  {n:'Jayson Tatum',   sub:'35 PTS · 8 REB · 5 AST', c:'#007A33', sh:'JT'},
                ].map((x,i)=>(
                  <div key={i} className="row" style={{ gap:8, padding:'6px 6px', borderRadius:6, cursor:'pointer' }}>
                    <V3Crest short={x.sh} color={x.c} size={22}/>
                    <div><div style={{ fontSize:12, fontWeight:700 }}>{x.n}</div><div className="meta" style={{ marginTop:1 }}>{x.sub}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card card-pad" style={{ background:'var(--amber-soft)', border:'1px solid rgba(245,158,11,.3)' }}>
              <V4Kicker>SERIES · PLAYOFF WATCH</V4Kicker>
              <div className="serif" style={{ font:'600 15px/1.3 "Newsreader"', marginTop:5 }}>
                Read the full series — 42 articles tracking the road to the Finals.
              </div>
              <button className="btn amber sm" style={{ marginTop:10 }}>Open series →</button>
            </div>
          </aside>
        </div>

        {/* More from NBA */}
        <div style={{ borderTop:'1px solid var(--line)', padding:'28px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <V3Rule label="More from NBA"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:18 }}>
              {related.map((r,i)=>{
                const kind = ['nba-game','nba-player','photo-hero'][i] || 'nba-game';
                return (
                  <article key={r.id} className="art" style={{ cursor:'pointer' }}>
                    <V4Img kind={kind} tint={SPORT_COLORS.NBA}/>
                    <div className="row" style={{ gap:6 }}>
                      <span className="meta">{r.kind}</span>
                      {r.ai && <V4AiByline/>}
                    </div>
                    <div className="serif head" style={{ font:'700 16px/1.25 "Newsreader"' }}>{r.head}</div>
                    <div className="meta">{r.by.toUpperCase()} · {r.mins} MIN</div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

Object.assign(window, { V4DashNBA, V4GameCenter, V4Article });
