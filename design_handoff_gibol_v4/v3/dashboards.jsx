// V3 — Unified Sport Dashboard Template + Per-sport Newsroom Hubs
// One template that adapts per-sport. Same hero pattern, same sub-nav, same rail.

function V3SportHero({ sport, primary, color1, color2, accent, kpis, status, kicker }) {
  return (
    <div className="card" style={{ position:'relative', padding:18, overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0,
        background:`radial-gradient(500px 220px at 0 0, ${color1}33, transparent), radial-gradient(500px 220px at 100% 100%, ${color2}33, transparent)` }}/>
      <div style={{ position:'relative' }}>
        <div className="row" style={{ gap:8, marginBottom:8 }}>
          <V3SportTag sport={sport}/>
          {kicker && <span className="meta" style={{ color:'var(--amber)' }}>{kicker}</span>}
          {status && <span className="pill live"><span className="dot live"/>{status}</span>}
        </div>
        <h1 className="disp" style={{ font:'800 24px/1.05 "Inter Tight"', letterSpacing:'-.025em' }}>
          {primary}
        </h1>
        {kpis && (
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${kpis.length}, 1fr)`, gap:14, marginTop:14, paddingTop:14, borderTop:'1px solid var(--line-soft)' }}>
            {kpis.map((k,i) => (
              <div key={i}>
                <div className="meta">{k.l}</div>
                <div className="num" style={{ fontSize:18, fontWeight:800, marginTop:3, color: k.c || 'var(--ink)' }}>{k.v}</div>
                {k.s && <div style={{ fontSize:10.5, color:'var(--ink-3)', marginTop:2 }}>{k.s}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- NBA Dashboard ----------
function DashNBA() {
  const subnav = (
    <V3SubNav active="overview" items={[
      {id:'overview', label:'Overview'}, {id:'live', label:'Live · 3'}, {id:'standings', label:'Standings'},
      {id:'bracket', label:'Playoff bracket'}, {id:'fixtures', label:'Fixtures'}, {id:'stats', label:'Stats'}, {id:'news', label:'News'}, {id:'teams', label:'Teams'},
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
      <div style={{ padding:14, display:'grid', gridTemplateColumns:'1fr 280px', gap:14 }}>
        <main className="col" style={{ gap:14, minWidth:0 }}>
          <V3SportHero
            sport="NBA"
            primary="Conference Semifinals · Game 3 — Denver vs Boston"
            kicker="WEST · TIPPED OFF"
            status="Q3 · 4:12"
            color1="#0E2240" color2="#007A33"
            kpis={[
              { l:'SCORE', v:'78 — 82', c:'var(--ink)' },
              { l:'SERIES', v:'2 — 1', s:'DEN leads' },
              { l:'WIN PROB', v:'42 / 58', s:'BOS' },
              { l:'PACE', v:'97.4', s:'-2.8 vs avg' },
            ]}
          />

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
                  <div key={i} style={{ padding:'10px 13px', borderTop: i?'1px solid var(--line-soft)':0, display:'grid', gridTemplateColumns:'1fr auto', gap:6, alignItems:'center' }}>
                    <div>
                      <div className="row" style={{ gap:7, marginBottom:3 }}><V3Crest short={m.a} color={m.ac} size={16}/><span style={{ fontSize:12, fontWeight:600 }}>{m.a}</span><span className="num" style={{ marginLeft:'auto', fontWeight:800 }}>{m.as}</span></div>
                      <div className="row" style={{ gap:7 }}><V3Crest short={m.b} color={m.bc} size={16}/><span style={{ fontSize:12, fontWeight:600 }}>{m.b}</span><span className="num" style={{ marginLeft:'auto', fontWeight:800 }}>{m.bs}</span></div>
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
                  {team:'BOS',c:'#007A33',s:3,opp:'IND',os:1,west:false},
                  {team:'NYK',c:'#006BB6',s:2,opp:'MIL',os:2,west:false},
                  {team:'DEN',c:'#0E2240',s:2,opp:'BOS',os:1,west:true},
                  {team:'OKC',c:'#007AC1',s:3,opp:'LAL',os:2,west:true},
                ].map((b,i)=>(
                  <div key={i} className="row" style={{ gap:8, padding:'6px 8px', background:'var(--bg-3)', borderRadius:6 }}>
                    <V3Crest short={b.team} color={b.c} size={20}/>
                    <div style={{ flex:1, fontSize:11.5 }}>
                      <div style={{ fontWeight:700 }}>{b.team} <span style={{ color:'var(--ink-3)' }}>{b.s}-{b.os}</span> {b.opp}</div>
                      <div className="meta">{b.west?'WEST':'EAST'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PER-SPORT NEWSROOM HUB */}
          <div>
            <V3Rule label="NBA Newsroom" amber action={<button className="btn sm ghost">/nba/news →</button>}/>
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:14 }}>
              {E.articles.NBA.slice(0,3).map((a,i)=>(
                <article key={a.id} className="art">
                  <V3Imagery sport="NBA" label={`NBA · ${a.kind.toUpperCase()}`} style={i===0?{aspectRatio:'16/9'}:{}}/>
                  <div className="row" style={{ gap:6 }}>
                    <span className="meta">{a.kind}</span>
                    {a.series && <span className="meta" style={{ color:'var(--amber)' }}>· {a.series}</span>}
                    {a.ai && <span className="pill amber">AI</span>}
                  </div>
                  <div className="serif head" style={{ font:`700 ${i===0?'18':'13.5'}px/1.25 "Newsreader", Georgia, serif` }}>{a.head}</div>
                  {i===0 && <div style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.45 }}>{a.deck}</div>}
                  <div className="meta">{a.by.toUpperCase()} · {a.mins} MIN · {a.when.toUpperCase()}</div>
                </article>
              ))}
            </div>
          </div>

          {/* Standings */}
          <div className="card">
            <div className="card-head"><span className="card-title">Conference Standings · East</span><button className="btn sm ghost">All →</button></div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }} className="tab">
              <thead><tr style={{ color:'var(--ink-3)', fontFamily:"'JetBrains Mono'", fontSize:9.5, letterSpacing:'.1em' }}>
                {['#','TEAM','W','L','PCT','GB','STRK','L10'].map((h,i)=><th key={i} style={{ textAlign: i<2?'left':'right', padding:'8px 10px', borderBottom:'1px solid var(--line-soft)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[
                  [1,'BOS','#007A33','64','18','.780','—','W6','9-1'],
                  [2,'MIL','#00471B','58','24','.707','6.0','W2','7-3'],
                  [3,'NYK','#006BB6','55','27','.671','9.0','L1','6-4'],
                  [4,'CLE','#860038','51','31','.622','13.0','W3','7-3'],
                ].map((r,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid var(--line-soft)' }}>
                    <td style={{ padding:'8px 10px', color:'var(--ink-3)' }}>{r[0]}</td>
                    <td style={{ padding:'8px 10px' }}><div className="row" style={{ gap:7 }}><V3Crest short={r[1]} color={r[2]} size={16}/><span style={{ fontWeight:700 }}>{r[1]}</span></div></td>
                    {r.slice(3).map((c,j)=><td key={j} style={{ padding:'8px 10px', textAlign:'right', fontWeight: j===0?700:500 }}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>

        <aside className="col" style={{ gap:12 }}>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Topic series · NBA</div>
            <div className="col" style={{ gap:7 }}>
              {E.series.filter(s=>s.sport==='NBA'||s.sport==='Multi').slice(0,4).map(s=>(
                <div key={s.id} className="spread">
                  <div className="row" style={{ gap:8 }}><span style={{ width:3, height:14, background:s.color, borderRadius:2 }}/><span style={{ fontSize:12, fontWeight:600 }}>{s.name}</span></div>
                  <span className="num" style={{ fontSize:10, color:'var(--ink-3)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Popular tags</div>
            <div className="row" style={{ gap:5, flexWrap:'wrap' }}>
              {['Tatum','Jokić','OKC','Wemby','Bracket','Playoffs','Brunson','Lakers'].map(t=>(<span key={t} className="pill outline">#{t}</span>))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Top scorers</div>
            <div className="col" style={{ gap:6 }}>
              {[['Luka Dončić','DAL',32.4],['Shai Gilgeous-Alexander','OKC',30.9],['Jayson Tatum','BOS',28.1],['Giannis A.','MIL',27.2]].map((p,i)=>(
                <div key={i} className="spread"><span style={{ fontSize:11.5 }}>{p[0]} <span style={{ color:'var(--ink-3)', fontSize:10 }}>{p[1]}</span></span><span className="num" style={{ fontWeight:700 }}>{p[2]}</span></div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

// ---------- PL Dashboard (same shell, soccer fields) ----------
function DashPL() {
  const subnav = (
    <V3SubNav active="overview" items={[
      {id:'overview', label:'Overview'}, {id:'live', label:'Live · 4'}, {id:'table', label:'Table'},
      {id:'fixtures', label:'Fixtures'}, {id:'scorers', label:'Top scorers'}, {id:'news', label:'News'}, {id:'clubs', label:'Clubs'},
    ]}/>
  );
  return (
    <V3Board>
      <V3TopBar active="PL" currentSport="PL" subnav={subnav}/>
      <V3LiveBand items={[
        { sport:'PL', a:'ARS', as:2, b:'MCI', bs:1, tag:"67'" },
        { sport:'PL', a:'LIV', as:1, b:'TOT', bs:1, tag:"54'" },
        { sport:'PL', a:'CHE', as:0, b:'AVL', bs:0, tag:"22'" },
      ]}/>
      <div style={{ padding:14, display:'grid', gridTemplateColumns:'1fr 280px', gap:14 }}>
        <main className="col" style={{ gap:14, minWidth:0 }}>
          <V3SportHero
            sport="PL"
            primary="Matchday 34 — Arsenal vs Manchester City"
            kicker="EMIRATES · TITLE RACE"
            status="LIVE 67'"
            color1="#EF0107" color2="#6CADDF"
            kpis={[
              { l:'SCORE', v:'2 — 1' },
              { l:'XG', v:'1.8 — 1.2' },
              { l:'POSSESSION', v:'48 / 52' },
              { l:'SHOTS', v:'11 — 9', s:'5 OT — 3 OT' },
            ]}
          />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="card">
              <div className="card-head"><span className="card-title">Today's matches</span></div>
              <div>
                {[
                  {tag:"67'", live:true, a:'ARS', as:2, b:'MCI', bs:1, ac:'#EF0107', bc:'#6CADDF'},
                  {tag:"54'", live:true, a:'LIV', as:1, b:'TOT', bs:1, ac:'#C8102E', bc:'#132257'},
                  {tag:"22'", live:true, a:'CHE', as:0, b:'AVL', bs:0, ac:'#034694', bc:'#95BFE5'},
                  {tag:'17:30', live:false, a:'MUN', as:'', b:'NEW', bs:'', ac:'#DA291C', bc:'#241F20'},
                ].map((m,i)=>(
                  <div key={i} style={{ padding:'10px 13px', borderTop: i?'1px solid var(--line-soft)':0, display:'grid', gridTemplateColumns:'1fr auto', gap:6, alignItems:'center' }}>
                    <div>
                      <div className="row" style={{ gap:7, marginBottom:3 }}><V3Crest short={m.a} color={m.ac} size={16}/><span style={{ fontSize:12, fontWeight:600 }}>{m.a}</span><span className="num" style={{ marginLeft:'auto', fontWeight:800 }}>{m.as}</span></div>
                      <div className="row" style={{ gap:7 }}><V3Crest short={m.b} color={m.bc} size={16}/><span style={{ fontSize:12, fontWeight:600 }}>{m.b}</span><span className="num" style={{ marginLeft:'auto', fontWeight:800 }}>{m.bs}</span></div>
                    </div>
                    {m.live ? <span className="pill live"><span className="dot live"/>{m.tag}</span> : <span className="pill outline">{m.tag}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">Table · Top 5</span><button className="btn sm ghost">Full →</button></div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }} className="tab">
                <thead><tr style={{ color:'var(--ink-3)', fontFamily:"'JetBrains Mono'", fontSize:9.5, letterSpacing:'.1em' }}>
                  {['#','CLUB','P','GD','PTS','FORM'].map((h,i)=><th key={i} style={{ textAlign: i<2?'left':'right', padding:'7px 10px', borderBottom:'1px solid var(--line-soft)' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {[
                    [1,'MCI','#6CADDF',34,'+58',82,'WWLWW'],
                    [2,'ARS','#EF0107',34,'+52',81,'WWWWW'],
                    [3,'LIV','#C8102E',34,'+44',74,'DWLWD'],
                    [4,'AVL','#95BFE5',33,'+22',66,'WWDLW'],
                    [5,'TOT','#132257',34,'+18',60,'LWWLD'],
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom:'1px solid var(--line-soft)' }}>
                      <td style={{ padding:'7px 10px', color:'var(--ink-3)' }}>{r[0]}</td>
                      <td style={{ padding:'7px 10px' }}><div className="row" style={{ gap:7 }}><V3Crest short={r[1]} color={r[2]} size={16}/><span style={{ fontWeight:700 }}>{r[1]}</span></div></td>
                      <td style={{ padding:'7px 10px', textAlign:'right' }}>{r[3]}</td>
                      <td style={{ padding:'7px 10px', textAlign:'right' }}>{r[4]}</td>
                      <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:800 }}>{r[5]}</td>
                      <td style={{ padding:'7px 10px', textAlign:'right' }}>
                        <span style={{ display:'inline-flex', gap:2 }}>
                          {r[6].split('').map((c,j)=><span key={j} style={{ width:8, height:8, borderRadius:1, background: c==='W'?'var(--up)': c==='L'?'var(--down)':'var(--ink-4)' }}/>)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Newsroom slice */}
          <div>
            <V3Rule label="Premier League Newsroom" amber action={<button className="btn sm ghost">/pl/news →</button>}/>
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:14 }}>
              {E.articles.PL.slice(0,3).map((a,i)=>(
                <article key={a.id} className="art">
                  <V3Imagery sport="PL" label={`PL · ${a.kind.toUpperCase()}`} style={i===0?{aspectRatio:'16/9'}:{}}/>
                  <div className="row" style={{ gap:6 }}>
                    <span className="meta">{a.kind}</span>
                    {a.series && <span className="meta" style={{ color:'var(--amber)' }}>· {a.series}</span>}
                    {a.ai && <span className="pill amber">AI</span>}
                  </div>
                  <div className="serif head" style={{ font:`700 ${i===0?'18':'13.5'}px/1.25 "Newsreader", Georgia, serif` }}>{a.head}</div>
                  {i===0 && <div style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.45 }}>{a.deck}</div>}
                  <div className="meta">{a.by.toUpperCase()} · {a.mins} MIN · {a.when.toUpperCase()}</div>
                </article>
              ))}
            </div>
          </div>
        </main>

        <aside className="col" style={{ gap:12 }}>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Topic series · PL</div>
            <div className="col" style={{ gap:7 }}>
              {[{n:'Title Race',c:'var(--pl)',k:28},{n:'Tactics Lab',c:'var(--blue-2)',k:36},{n:'Anatomy Of',c:'var(--amber)',k:18}].map((s,i)=>(
                <div key={i} className="spread">
                  <div className="row" style={{ gap:8 }}><span style={{ width:3, height:14, background:s.c, borderRadius:2 }}/><span style={{ fontSize:12, fontWeight:600 }}>{s.n}</span></div>
                  <span className="num" style={{ fontSize:10, color:'var(--ink-3)' }}>{s.k}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Popular tags</div>
            <div className="row" style={{ gap:5, flexWrap:'wrap' }}>
              {['Saka','Haaland','Title','Top Four','Pep','Ødegaard','Liverpool','Spurs'].map(t=>(<span key={t} className="pill outline">#{t}</span>))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Top scorers</div>
            <div className="col" style={{ gap:6 }}>
              {[['Erling Haaland','MCI',24],['Mohamed Salah','LIV',19],['Bukayo Saka','ARS',17],['Ollie Watkins','AVL',16]].map((p,i)=>(
                <div key={i} className="spread"><span style={{ fontSize:11.5 }}>{p[0]} <span style={{ color:'var(--ink-3)', fontSize:10 }}>{p[1]}</span></span><span className="num" style={{ fontWeight:700 }}>{p[2]}</span></div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

// ---------- F1 Dashboard ----------
function DashF1() {
  const subnav = (
    <V3SubNav active="overview" items={[
      {id:'overview', label:'Overview'}, {id:'race', label:'Race · LIVE'}, {id:'standings', label:'Standings'},
      {id:'calendar', label:'Calendar'}, {id:'teams', label:'Teams'}, {id:'drivers', label:'Drivers'}, {id:'news', label:'News'},
    ]}/>
  );
  return (
    <V3Board>
      <V3TopBar active="F1" currentSport="F1" subnav={subnav}/>
      <V3LiveBand items={[{ sport:'F1', a:'VER', as:'P1', b:'NOR', bs:'+2.1', tag:'L34/63' }]}/>
      <div style={{ padding:14, display:'grid', gridTemplateColumns:'1fr 280px', gap:14 }}>
        <main className="col" style={{ gap:14, minWidth:0 }}>
          <V3SportHero
            sport="F1"
            primary="Imola — Emilia-Romagna Grand Prix"
            kicker="ROUND 8 · 24°C · DRY"
            status="L34 / 63"
            color1="#1E5BC6" color2="#FF8000"
            kpis={[
              { l:'LEADER', v:'VER', s:'1:16.482 fastest' },
              { l:'GAP TO P2', v:'+2.1s', c:'var(--up)' },
              { l:'PIT WINDOW', v:'OPEN', c:'var(--up)' },
              { l:'SAFETY CAR', v:'NONE' },
            ]}
          />
          <div className="card">
            <div className="card-head"><span className="card-title">Live timing</span><span className="meta">L34/63</span></div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }} className="tab mono">
              <thead><tr style={{ color:'var(--ink-3)', fontSize:9.5, letterSpacing:'.1em' }}>
                {['POS','DRV','TEAM','GAP','LAST','TYRE','AGE'].map((h,i)=><th key={i} style={{ textAlign: i<3?'left':'right', padding:'7px 10px', borderBottom:'1px solid var(--line-soft)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[
                  ['1','VER','RBR','—',     '1:16.6','H','14'],
                  ['2','NOR','MCL','+2.1',  '1:16.5','H','15'],
                  ['3','LEC','FER','+8.4',  '1:16.9','H','16'],
                  ['4','HAM','MER','+12.1', '1:17.1','H','13'],
                  ['5','SAI','FER','+15.8', '1:17.4','M','34'],
                ].map((r,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid var(--line-soft)' }}>
                    <td style={{ padding:'7px 10px', color:'var(--amber)', fontWeight:800 }}>{r[0]}</td>
                    <td style={{ padding:'7px 10px', fontWeight:700 }}>{r[1]}</td>
                    <td style={{ padding:'7px 10px', color:'var(--ink-3)' }}>{r[2]}</td>
                    <td style={{ padding:'7px 10px', textAlign:'right' }}>{r[3]}</td>
                    <td style={{ padding:'7px 10px', textAlign:'right' }}>{r[4]}</td>
                    <td style={{ padding:'7px 10px', textAlign:'right' }}><span className="row" style={{ gap:6, justifyContent:'flex-end' }}><span style={{ width:8, height:8, borderRadius:'50%', background: r[5]==='H'?'#FFFFFF':r[5]==='M'?'#FFD700':'#E10600', border:'1px solid var(--line)' }}/>{r[5]}</span></td>
                    <td style={{ padding:'7px 10px', textAlign:'right' }}>{r[6]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <V3Rule label="Formula 1 Newsroom" amber action={<button className="btn sm ghost">/f1/news →</button>}/>
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:14 }}>
              {E.articles.F1.slice(0,3).map((a,i)=>(
                <article key={a.id} className="art">
                  <V3Imagery sport="F1" label={`F1 · ${a.kind.toUpperCase()}`} style={i===0?{aspectRatio:'16/9'}:{}}/>
                  <div className="row" style={{ gap:6 }}>
                    <span className="meta">{a.kind}</span>
                    {a.series && <span className="meta" style={{ color:'var(--amber)' }}>· {a.series}</span>}
                    {a.ai && <span className="pill amber">AI</span>}
                  </div>
                  <div className="serif head" style={{ font:`700 ${i===0?'18':'13.5'}px/1.25 "Newsreader", Georgia, serif` }}>{a.head}</div>
                  {i===0 && <div style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.45 }}>{a.deck}</div>}
                  <div className="meta">{a.by.toUpperCase()} · {a.mins} MIN · {a.when.toUpperCase()}</div>
                </article>
              ))}
            </div>
          </div>
        </main>
        <aside className="col" style={{ gap:12 }}>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Drivers' standings</div>
            <div className="col" style={{ gap:5 }}>
              {[['1','VER',312,'#1E5BC6'],['2','NOR',258,'#FF8000'],['3','LEC',221,'#DC0000'],['4','HAM',198,'#27F4D2']].map((r,i)=>(
                <div key={i} className="spread"><span className="row" style={{ gap:7 }}><span className="num" style={{ width:14, color:'var(--ink-3)' }}>{r[0]}</span><span style={{ width:3, height:12, background:r[3], borderRadius:1 }}/><span style={{ fontSize:12, fontWeight:700 }}>{r[1]}</span></span><span className="num" style={{ fontWeight:700 }}>{r[2]}</span></div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Topic series · F1</div>
            <div className="col" style={{ gap:7 }}>
              {[{n:'Silly Season',c:'var(--f1)',k:12},{n:'Tactics Lab',c:'var(--blue-2)',k:36},{n:'Anatomy Of',c:'var(--amber)',k:18}].map((s,i)=>(
                <div key={i} className="spread">
                  <div className="row" style={{ gap:8 }}><span style={{ width:3, height:14, background:s.c, borderRadius:2 }}/><span style={{ fontSize:12, fontWeight:600 }}>{s.n}</span></div>
                  <span className="num" style={{ fontSize:10, color:'var(--ink-3)' }}>{s.k}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Popular tags</div>
            <div className="row" style={{ gap:5, flexWrap:'wrap' }}>
              {['Verstappen','Norris','McLaren','Ferrari','Imola','Strategy','2026 Regs','Sainz'].map(t=>(<span key={t} className="pill outline">#{t}</span>))}
            </div>
          </div>
        </aside>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

// ---------- Tennis Dashboard ----------
function DashTennis() {
  const subnav = (
    <V3SubNav active="overview" items={[
      {id:'overview', label:'Overview'}, {id:'live', label:'Live · 6'}, {id:'tournaments', label:'Tournaments'},
      {id:'rankings', label:'Rankings'}, {id:'players', label:'Players'}, {id:'news', label:'News'},
    ]}/>
  );
  return (
    <V3Board>
      <V3TopBar active="Tennis" currentSport="Tennis" subnav={subnav}/>
      <V3LiveBand items={[
        { sport:'TEN', a:'ALC', as:'6 4 3', b:'SIN', bs:'3 6 4', tag:'S3 3-2' },
        { sport:'TEN', a:'SWI', as:'6 5', b:'GAU', bs:'3 4', tag:'S2 5-4' },
      ]}/>
      <div style={{ padding:14, display:'grid', gridTemplateColumns:'1fr 280px', gap:14 }}>
        <main className="col" style={{ gap:14, minWidth:0 }}>
          <V3SportHero
            sport="Tennis"
            primary="ATP 1000 Madrid · Semifinal — Alcaraz vs Sinner"
            kicker="MANOLO SANTANA · CLAY"
            status="SET 3 · 3-2"
            color1="#FFCC00" color2="#E30613"
            kpis={[
              { l:'SETS', v:'1 — 1' },
              { l:'GAMES (S3)', v:'3 — 2' },
              { l:'1ST SERVE', v:'71 / 68%' },
              { l:'BREAK PTS', v:'4/7 — 3/8' },
            ]}
          />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom:10 }}>Set scores</div>
              <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }} className="tab mono">
                <thead><tr style={{ color:'var(--ink-3)', fontSize:10 }}>
                  {['','S1','S2','S3','PTS'].map((h,i)=><th key={i} style={{ padding:'4px 8px', textAlign: i?'right':'left' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {[['Alcaraz','#FFCC00',6,4,3,30,true],['Sinner','#E30613',3,6,4,15,false]].map((r,i)=>(
                    <tr key={i} style={{ borderTop:'1px solid var(--line-soft)' }}>
                      <td style={{ padding:'8px 8px', fontWeight:700 }}><span className="row" style={{ gap:7 }}><V3Crest short={r[0].slice(0,3).toUpperCase()} color={r[1]} size={18}/>{r[0]}{r[6] && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--amber)' }}/>}</span></td>
                      <td style={{ padding:'8px 8px', textAlign:'right' }}>{r[2]}</td>
                      <td style={{ padding:'8px 8px', textAlign:'right' }}>{r[3]}</td>
                      <td style={{ padding:'8px 8px', textAlign:'right', color:'var(--amber)', fontWeight:800 }}>{r[4]}</td>
                      <td style={{ padding:'8px 8px', textAlign:'right', fontWeight:800 }}>{r[5]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom:10 }}>ATP rankings · Top 5</div>
              <div className="col" style={{ gap:6 }}>
                {[['1','Sinner',10560,'-'],['2','Alcaraz',8970,'+1'],['3','Djokovic',7940,'-1'],['4','Zverev',6420,'-'],['5','Medvedev',5810,'-']].map((p,i)=>(
                  <div key={i} className="spread" style={{ fontSize:12 }}>
                    <span className="row" style={{ gap:8 }}><span className="num" style={{ width:14, color:'var(--ink-3)' }}>{p[0]}</span><span style={{ fontWeight:600 }}>{p[1]}</span></span>
                    <span className="row" style={{ gap:8 }}><span className="num" style={{ color: p[3].startsWith('+')?'var(--up)':p[3].startsWith('-1')?'var(--down)':'var(--ink-3)' }}>{p[3]}</span><span className="num" style={{ fontWeight:700 }}>{p[2]}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <V3Rule label="Tennis Newsroom" amber action={<button className="btn sm ghost">/tennis/news →</button>}/>
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:14 }}>
              {E.articles.Tennis.slice(0,3).map((a,i)=>(
                <article key={a.id} className="art">
                  <V3Imagery sport="Tennis" label={`TENNIS · ${a.kind.toUpperCase()}`} style={i===0?{aspectRatio:'16/9'}:{}}/>
                  <div className="row" style={{ gap:6 }}>
                    <span className="meta">{a.kind}</span>
                    {a.series && <span className="meta" style={{ color:'var(--amber)' }}>· {a.series}</span>}
                    {a.ai && <span className="pill amber">AI</span>}
                  </div>
                  <div className="serif head" style={{ font:`700 ${i===0?'18':'13.5'}px/1.25 "Newsreader", Georgia, serif` }}>{a.head}</div>
                  {i===0 && <div style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.45 }}>{a.deck}</div>}
                  <div className="meta">{a.by.toUpperCase()} · {a.mins} MIN · {a.when.toUpperCase()}</div>
                </article>
              ))}
            </div>
          </div>
        </main>
        <aside className="col" style={{ gap:12 }}>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Topic series · Tennis</div>
            <div className="col" style={{ gap:7 }}>
              {[{n:'Slam Watch',c:'var(--tennis)',k:15},{n:'Race To Turin',c:'var(--tennis)',k:9},{n:'Tactics Lab',c:'var(--blue-2)',k:36}].map((s,i)=>(
                <div key={i} className="spread">
                  <div className="row" style={{ gap:8 }}><span style={{ width:3, height:14, background:s.c, borderRadius:2 }}/><span style={{ fontSize:12, fontWeight:600 }}>{s.n}</span></div>
                  <span className="num" style={{ fontSize:10, color:'var(--ink-3)' }}>{s.k}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Popular tags</div>
            <div className="row" style={{ gap:5, flexWrap:'wrap' }}>
              {['Alcaraz','Sinner','Swiatek','Madrid','Roland Garros','Clay','Djokovic','Top 10'].map(t=>(<span key={t} className="pill outline">#{t}</span>))}
            </div>
          </div>
        </aside>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

Object.assign(window, { DashNBA, DashPL, DashF1, DashTennis });
