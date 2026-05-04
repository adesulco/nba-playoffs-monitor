// V3 — Newsroom hubs (per-sport + global) + Article reading layout

// Global newsroom — /news front page
function NewsHub() {
  const { t } = useI18n3();
  const [filter, setFilter] = React.useState('all');
  const all = ['NBA','PL','F1','Tennis'].flatMap(s => E.articles[s].map(a => ({...a, sport:s})));
  const filtered = filter==='all' ? all : all.filter(a=>a.sport===filter);
  const lead = all.find(a=>a.id==='nba-1');
  const second = all.find(a=>a.id==='pl-1');
  const third = all.find(a=>a.id==='f1-1');

  return (
    <V3Board>
      <V3TopBar active="news"/>
      <div style={{ padding:'18px 18px 0' }}>
        <div className="meta" style={{ color:'var(--amber)' }}>NEWSROOM · 03 MAY 2026</div>
        <h1 className="disp" style={{ font:'800 30px/1.05 "Inter Tight"', letterSpacing:'-.03em', marginTop:6 }}>The Gibol Newsroom</h1>
        <div className="deck" style={{ marginTop:6, maxWidth:600 }}>
          Reporting, recaps, and analysis. Human writers on the field, AI on the wire — every byline tells you which.
        </div>
        <div className="row" style={{ gap:6, marginTop:14, paddingBottom:12, borderBottom:'1px solid var(--line)' }}>
          {[{id:'all',l:'All'},{id:'NBA',l:'NBA'},{id:'PL',l:'Premier League'},{id:'F1',l:'Formula 1'},{id:'Tennis',l:'Tennis'}].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{
              background: filter===f.id?'var(--bg-3)':'transparent', border:'1px solid', borderColor: filter===f.id?'var(--line)':'transparent',
              color: filter===f.id?'var(--ink)':'var(--ink-3)', font:'600 12px "Inter Tight"', padding:'5px 11px', borderRadius:6, cursor:'pointer',
            }}>{f.l}</button>
          ))}
          <span style={{ marginLeft:'auto' }} className="meta">{filtered.length} articles</span>
        </div>
      </div>

      {filter==='all' && (
        <div style={{ padding:'18px', display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr', gap:24, borderBottom:'1px solid var(--line)' }}>
          <article style={{ cursor:'pointer' }}>
            <V3Imagery sport="NBA" label="NBA · LEAD" style={{ aspectRatio:'16/9' }}/>
            <div className="row" style={{ gap:6, marginTop:8 }}><V3SportTag sport="NBA"/><span className="meta">{lead.kind}</span><span className="meta" style={{ color:'var(--amber)' }}>· {lead.series}</span></div>
            <h2 className="serif" style={{ font:'800 28px/1.1 "Newsreader", Georgia, serif', letterSpacing:'-.015em', marginTop:6 }}>{lead.head}</h2>
            <div className="deck" style={{ marginTop:6, fontSize:13.5 }}>{lead.deck}</div>
            <div className="meta" style={{ marginTop:8 }}>{lead.by.toUpperCase()} · {lead.mins} MIN · {lead.when.toUpperCase()}</div>
          </article>
          <article style={{ cursor:'pointer' }}>
            <V3Imagery sport="PL" label="PL · LEAD" style={{ aspectRatio:'4/3' }}/>
            <div className="row" style={{ gap:6, marginTop:8 }}><V3SportTag sport="PL"/><span className="meta">{second.kind}</span></div>
            <h3 className="serif" style={{ font:'700 20px/1.18 "Newsreader", Georgia, serif', marginTop:6 }}>{second.head}</h3>
            <div className="deck" style={{ marginTop:4, fontSize:12 }}>{second.deck}</div>
            <div className="meta" style={{ marginTop:6 }}>{second.by.toUpperCase()} · {second.mins} MIN</div>
          </article>
          <article style={{ cursor:'pointer' }}>
            <V3Imagery sport="F1" label="F1 · LEAD" style={{ aspectRatio:'4/3' }}/>
            <div className="row" style={{ gap:6, marginTop:8 }}><V3SportTag sport="F1"/><span className="meta">{third.kind}</span></div>
            <h3 className="serif" style={{ font:'700 20px/1.18 "Newsreader", Georgia, serif', marginTop:6 }}>{third.head}</h3>
            <div className="deck" style={{ marginTop:4, fontSize:12 }}>{third.deck}</div>
            <div className="meta" style={{ marginTop:6 }}>{third.by.toUpperCase()} · {third.mins} MIN</div>
          </article>
        </div>
      )}

      <div style={{ padding:'18px', display:'grid', gridTemplateColumns:'1fr 280px', gap:24 }}>
        <div>
          <V3Rule label={filter==='all'?'Latest':`${filter} · Latest`}/>
          <div className="col" style={{ gap:14 }}>
            {filtered.map(a=>(
              <article key={a.id} style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:14, paddingBottom:14, borderBottom:'1px solid var(--line-soft)', cursor:'pointer' }}>
                <V3Imagery sport={a.sport} label={`${a.sport} · ${a.kind.toUpperCase()}`}/>
                <div>
                  <div className="row" style={{ gap:6 }}>
                    <V3SportTag sport={a.sport}/>
                    <span className="meta">{a.kind}</span>
                    {a.series && <span className="meta" style={{ color:'var(--amber)' }}>· {a.series}</span>}
                    {a.ai && <span className="pill amber">AI</span>}
                  </div>
                  <h3 className="serif" style={{ font:'700 17px/1.25 "Newsreader", Georgia, serif', marginTop:5 }}>{a.head}</h3>
                  <div style={{ fontSize:12.5, color:'var(--ink-2)', marginTop:4, lineHeight:1.5 }}>{a.deck}</div>
                  <div className="row" style={{ gap:8, marginTop:6 }}>
                    <span className="meta">{a.by.toUpperCase()} · {a.mins} MIN · {a.when.toUpperCase()}</span>
                    <span style={{ flex:1 }}/>
                    {a.tags && a.tags.slice(0,3).map(tg=>(<span key={tg} className="pill outline" style={{ fontSize:8.5 }}>#{tg}</span>))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        <aside className="col" style={{ gap:14 }}>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>{t.topicSeries}</div>
            <div className="col" style={{ gap:7 }}>
              {E.series.map(s=>(
                <div key={s.id} className="spread" style={{ cursor:'pointer' }}>
                  <div className="row" style={{ gap:8 }}><span style={{ width:3, height:14, background:s.color, borderRadius:2 }}/><div><div style={{ fontSize:12, fontWeight:600 }}>{s.name}</div><div className="meta" style={{ marginTop:1 }}>{s.sport}</div></div></div>
                  <span className="num" style={{ fontSize:10, color:'var(--ink-3)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>{t.popularTags}</div>
            <div className="row" style={{ gap:5, flexWrap:'wrap' }}>
              {E.popularTags.map(tg=>(<span key={tg} className="pill outline" style={{ cursor:'pointer' }}>#{tg}</span>))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>About the newsroom</div>
            <div style={{ fontSize:11.5, color:'var(--ink-2)', lineHeight:1.55 }}>
              We pair beat writers with an AI wire desk for briefs and recaps. Every article shows whether it was written by a human or assisted by AI, and who edited it.
            </div>
            <button className="btn sm" style={{ marginTop:8 }}>Editorial standards →</button>
          </div>
        </aside>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

// Per-sport newsroom — /nba/news (template; same for PL/F1/Tennis)
function SportNewsHub({ sport='NBA' }) {
  const list = E.articles[sport];
  const subnav = (
    <V3SubNav active="news" items={[
      {id:'overview', label:'Overview'}, {id:'news', label:'News'}, {id:'fixtures', label:'Fixtures'},
      {id:'standings', label:'Standings'}, {id:'teams', label:'Teams'},
    ]}/>
  );
  const lead = list[0];
  return (
    <V3Board>
      <V3TopBar active={sport} currentSport={sport} subnav={subnav}/>
      <div style={{ padding:'14px 18px 0' }}>
        <div className="row" style={{ gap:8 }}>
          <V3SportTag sport={sport}/>
          <span className="meta" style={{ color:'var(--amber)' }}>NEWSROOM</span>
        </div>
        <h1 className="disp" style={{ font:'800 28px/1.05 "Inter Tight"', letterSpacing:'-.03em', marginTop:6 }}>
          {sport==='NBA'?'NBA':sport==='PL'?'Premier League':sport==='F1'?'Formula 1':'Tennis'} · News & analysis
        </h1>
        <div className="deck" style={{ marginTop:6, maxWidth:560 }}>{list.length}+ articles · recaps, previews, tactics, opinion. Updated continuously.</div>
      </div>

      <div style={{ padding:'18px', display:'grid', gridTemplateColumns:'1.4fr 1fr 280px', gap:18 }}>
        {/* Lead column */}
        <article style={{ cursor:'pointer' }}>
          <V3Imagery sport={sport} label={`${sport} · LEAD`} style={{ aspectRatio:'16/9' }}/>
          <div className="row" style={{ gap:6, marginTop:10 }}><span className="meta">{lead.kind}</span>{lead.series && <span className="meta" style={{ color:'var(--amber)' }}>· {lead.series}</span>}</div>
          <h2 className="serif" style={{ font:'800 28px/1.1 "Newsreader", Georgia, serif', letterSpacing:'-.015em', marginTop:6 }}>{lead.head}</h2>
          <div className="deck" style={{ marginTop:6 }}>{lead.deck}</div>
          <div className="meta" style={{ marginTop:8 }}>{lead.by.toUpperCase()} · {lead.mins} MIN · {lead.when.toUpperCase()}</div>
        </article>

        {/* Mid column */}
        <div className="col" style={{ gap:16 }}>
          <V3Rule label="Latest"/>
          {list.slice(1,5).map(a=>(
            <article key={a.id} style={{ paddingBottom:12, borderBottom:'1px solid var(--line-soft)', cursor:'pointer' }}>
              <div className="row" style={{ gap:6 }}><span className="meta">{a.kind}</span>{a.series && <span className="meta" style={{ color:'var(--amber)' }}>· {a.series}</span>}{a.ai && <span className="pill amber">AI</span>}</div>
              <h3 className="serif" style={{ font:'700 16px/1.25 "Newsreader", Georgia, serif', marginTop:4 }}>{a.head}</h3>
              <div style={{ fontSize:11.5, color:'var(--ink-2)', marginTop:3, lineHeight:1.45 }}>{a.deck}</div>
              <div className="meta" style={{ marginTop:5 }}>{a.by.toUpperCase()} · {a.mins} MIN · {a.when.toUpperCase()}</div>
            </article>
          ))}
        </div>

        {/* Rail */}
        <aside className="col" style={{ gap:12 }}>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Topic series</div>
            <div className="col" style={{ gap:7 }}>
              {E.series.filter(s=>s.sport===sport||s.sport==='Multi').map(s=>(
                <div key={s.id} className="spread" style={{ cursor:'pointer' }}>
                  <div className="row" style={{ gap:8 }}><span style={{ width:3, height:14, background:s.color, borderRadius:2 }}/><span style={{ fontSize:12, fontWeight:600 }}>{s.name}</span></div>
                  <span className="num" style={{ fontSize:10, color:'var(--ink-3)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>Tags</div>
            <div className="row" style={{ gap:5, flexWrap:'wrap' }}>
              {[...new Set(list.flatMap(a=>a.tags||[]))].slice(0,12).map(tg=>(<span key={tg} className="pill outline">#{tg}</span>))}
            </div>
          </div>
        </aside>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

// Article reading page
function ArticlePage({ id='nba-1' }) {
  const all = ['NBA','PL','F1','Tennis'].flatMap(s => E.articles[s].map(a => ({...a, sport:s})));
  const a = all.find(x=>x.id===id) || all[0];
  const related = all.filter(x=>x.sport===a.sport && x.id!==a.id).slice(0,3);
  return (
    <V3Board>
      <V3TopBar active={a.sport} currentSport={a.sport}/>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 24px 18px' }}>
        <div className="meta" style={{ marginBottom:8 }}>
          <span style={{ color:'var(--ink-3)' }}>HOME · </span>
          <span style={{ color:'var(--ink-3)' }}>{a.sport} · </span>
          <span style={{ color:'var(--ink-3)' }}>NEWS · </span>
          <span style={{ color:'var(--amber)' }}>{a.kind.toUpperCase()}</span>
        </div>
        <div className="row" style={{ gap:8 }}>
          <V3SportTag sport={a.sport}/>
          <span className="meta">{a.kind}</span>
          {a.series && <span className="meta" style={{ color:'var(--amber)' }}>· {a.series}</span>}
          {a.ai && <span className="pill amber">AI-ASSISTED · HUMAN EDITED</span>}
        </div>
        <h1 className="serif" style={{ font:'800 44px/1.05 "Newsreader", Georgia, serif', letterSpacing:'-.025em', marginTop:10, maxWidth:780 }}>{a.head}</h1>
        <div className="deck" style={{ marginTop:10, fontSize:16, lineHeight:1.5, maxWidth:680, color:'var(--ink-2)' }}>{a.deck}</div>
        <div className="row" style={{ gap:12, marginTop:14, paddingTop:14, borderTop:'1px solid var(--line-soft)', borderBottom:'1px solid var(--line-soft)', paddingBottom:14 }}>
          <div className="row" style={{ gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg, var(--blue), var(--amber))' }}/>
            <div>
              <div style={{ fontSize:12.5, fontWeight:700 }}>{a.by}</div>
              <div className="meta" style={{ marginTop:1 }}>STAFF WRITER · {a.sport} BEAT</div>
            </div>
          </div>
          <span style={{ width:1, height:28, background:'var(--line-soft)' }}/>
          <div className="meta">{a.when.toUpperCase()} · {a.mins} {`MIN READ`} · EN / BI</div>
          <div className="row" style={{ marginLeft:'auto', gap:6 }}>
            <button className="btn sm">Save</button>
            <button className="btn sm">Share</button>
            <button className="btn sm ghost">EN ↔ BI</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 24px', display:'grid', gridTemplateColumns:'1fr 260px', gap:32 }}>
        <article style={{ maxWidth:680 }}>
          <V3Imagery sport={a.sport} label={`${a.sport} · HERO IMAGE`} style={{ aspectRatio:'16/9', marginBottom:8, borderRadius:6 }}/>
          <div className="meta" style={{ marginBottom:18 }}>PHOTO PLACEHOLDER · CAPTION GOES HERE</div>

          {/* Body */}
          <div className="serif" style={{ fontFamily:'"Newsreader", Georgia, serif', fontSize:17, lineHeight:1.65, color:'var(--ink)' }}>
            <p style={{ marginTop:0 }}>The first sign came at the 7:48 mark. Tatum took a half-step left, then drove right, and Boston's bench knew before the ball found Brown in the corner. The next four minutes belonged to them. The next two months might too.</p>
            <p>Denver had been favored all week. The Nuggets had Jokić, the homecourt, and a 2-1 lead. What they did not have, it turned out, was a bench. By the time Mike Malone called timeout with 4:12 to play, the Celtics had outscored Denver 9-2 in two trips up the floor and Joker had played 31 of his last 32 minutes.</p>
            <h3 className="serif" style={{ font:'700 22px/1.2 "Newsreader", Georgia, serif', marginTop:24, letterSpacing:'-.01em' }}>"We just kept making the right pass"</h3>
            <p>Mazzulla's adjustment was small but specific: trap Murray on the side pick-and-roll, force Jokić to start his action higher, and let Brown roam.</p>
            <blockquote style={{ borderLeft:'3px solid var(--amber)', paddingLeft:16, margin:'20px 0', fontStyle:'italic', color:'var(--ink-2)' }}>
              "We weren't trying to score every possession. We were trying to make them tired. By the third quarter you could see it." — Joe Mazzulla
            </blockquote>
            <p>Whether that translates to a Game 4 win in Boston is another question. The Nuggets are still a championship team. But for the first time in this series, they look like a beatable one.</p>
          </div>

          {/* Tags */}
          <div className="row" style={{ gap:6, flexWrap:'wrap', marginTop:24, paddingTop:18, borderTop:'1px solid var(--line-soft)' }}>
            <span className="meta" style={{ marginRight:8 }}>TAGS</span>
            {a.tags && a.tags.map(tg=>(<span key={tg} className="pill outline">#{tg}</span>))}
          </div>
        </article>

        <aside className="col" style={{ gap:18, position:'sticky', top:80, alignSelf:'start' }}>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>In this story</div>
            <div className="col" style={{ gap:6 }}>
              {[
                {n:'Denver Nuggets', sub:'Lost Game 3, 78–82', c:'#0E2240', sh:'DEN'},
                {n:'Boston Celtics', sub:'Won Game 3, 82–78', c:'#007A33', sh:'BOS'},
                {n:'Jayson Tatum',   sub:'35 PTS · 8 REB · 5 AST', c:'#007A33', sh:'JT'},
              ].map((x,i)=>(
                <div key={i} className="row" style={{ gap:8, padding:'5px 6px', borderRadius:6, cursor:'pointer' }}>
                  <V3Crest short={x.sh} color={x.c} size={20}/>
                  <div><div style={{ fontSize:11.5, fontWeight:700 }}>{x.n}</div><div className="meta" style={{ marginTop:1 }}>{x.sub}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad" style={{ background:'var(--amber-soft)', border:'1px solid rgba(245,158,11,.3)' }}>
            <div className="meta" style={{ color:'var(--amber)' }}>SERIES · PLAYOFF WATCH</div>
            <div className="serif" style={{ font:'700 14px/1.3 "Newsreader", Georgia, serif', marginTop:4 }}>Read the full series — 42 articles tracking the road to the Finals.</div>
            <button className="btn sm amber" style={{ marginTop:8 }}>Open series →</button>
          </div>
        </aside>
      </div>

      {/* More from sport */}
      <div style={{ borderTop:'1px solid var(--line)', padding:'24px' }}>
        <V3Rule label={`More from ${a.sport==='NBA'?'NBA':a.sport==='PL'?'Premier League':a.sport==='F1'?'Formula 1':'Tennis'}`}/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:18, maxWidth:1100, margin:'0 auto' }}>
          {related.map(r=>(
            <article key={r.id} className="art">
              <V3Imagery sport={r.sport} label={`${r.sport} · ${r.kind.toUpperCase()}`}/>
              <div className="meta">{r.kind}</div>
              <div className="serif head" style={{ font:'700 15px/1.25 "Newsreader", Georgia, serif' }}>{r.head}</div>
              <div className="meta">{r.by.toUpperCase()} · {r.mins} MIN</div>
            </article>
          ))}
        </div>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

Object.assign(window, { NewsHub, SportNewsHub, ArticlePage });
