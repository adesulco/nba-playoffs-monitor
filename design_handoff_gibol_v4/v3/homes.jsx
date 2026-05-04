// V3 — Three home directions + editorial placement strategies

// =================================================================================
// DIRECTION A — REFINEMENT
// "Live-first home, editorial as a clean strip below. Per-sport newsroom inside each dashboard."
// Scope: keep v2 mental model. Tighten consistency. Editorial = secondary surface.
// =================================================================================
function HomeA() {
  const { t } = useI18n3();
  const live = [
    { sport:'NBA', a:'DEN', as:78, b:'BOS', bs:82, tag:'Q3 4:12' },
    { sport:'PL',  a:'ARS', as:2,  b:'MCI', bs:1,  tag:"67'" },
    { sport:'F1',  a:'VER', as:'P1', b:'NOR', bs:'+2.1', tag:'L34' },
    { sport:'Tennis', a:'ALC', as:'6 4 3', b:'SIN', bs:'3 6 4', tag:'S3 3-2' },
  ];
  const lead = E.articles.NBA[0];
  const subs = [E.articles.PL[0], E.articles.F1[0], E.articles.Tennis[0]];
  return (
    <V3Board>
      <V3TopBar active="home"/>
      <V3LiveBand items={live}/>
      <div style={{ padding:14, display:'grid', gridTemplateColumns:'1fr 280px', gap:14 }}>
        <main className="col" style={{ gap:14, minWidth:0 }}>
          {/* Hero live card — kept from v2 vocabulary, simplified chrome */}
          <div className="card" style={{ position:'relative', padding:16, overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0,
              background:'radial-gradient(500px 250px at 12% 0, #0E224033, transparent), radial-gradient(500px 250px at 100% 100%, #007A3333, transparent)' }}/>
            <div style={{ position:'relative' }}>
              <div className="spread" style={{ marginBottom:10 }}>
                <div className="row" style={{ gap:8 }}>
                  <span className="pill live"><span className="dot live"/>LIVE · Q3 4:12</span>
                  <span className="meta">WEST CONF SF · GAME 3</span>
                </div>
                <button className="btn amber sm">Open match ↗</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', gap:14 }}>
                <div className="row" style={{ gap:10 }}>
                  <V3Crest short="DEN" color="#0E2240" size={34}/>
                  <div>
                    <div style={{ font:'700 16px "Inter Tight"' }}>Denver Nuggets</div>
                    <div className="meta">HOME · LEADS 2-1</div>
                  </div>
                </div>
                <div className="num" style={{ fontSize:54, fontWeight:900, letterSpacing:'-.06em', lineHeight:1 }}>
                  <span style={{ color:'var(--ink-3)' }}>78</span>
                  <span style={{ color:'var(--ink-4)', margin:'0 10px', fontWeight:400 }}>—</span>
                  <span>82</span>
                </div>
                <div className="row" style={{ gap:10, justifyContent:'flex-end' }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ font:'700 16px "Inter Tight"' }}>Boston Celtics</div>
                    <div className="meta">AWAY · 9-2 RUN</div>
                  </div>
                  <V3Crest short="BOS" color="#007A33" size={34}/>
                </div>
              </div>
              <div style={{ marginTop:12, padding:'8px 10px', border:'1px solid var(--line-soft)', borderRadius:6,
                fontSize:11.5, color:'var(--ink-2)', background:'var(--amber-soft)' }}>
                <span style={{ color:'var(--amber)', fontWeight:800, marginRight:5 }}>AI ·</span>
                Boston on a 9–2 run. Tatum 28 on 10/18, Brown 17. Jokić has played 31 of 32; bench is at -8.
              </div>
            </div>
          </div>

          {/* Live grid — 4 tiles */}
          <div className="card">
            <div className="card-head"><span className="card-title">{t.liveNow} · 12</span>
              <button className="btn sm ghost">All sports →</button></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
              {[
                {sport:'PL', a:'Arsenal', ac:'#EF0107', as:2, b:'Man City', bc:'#6CADDF', bs:1, tag:"67'"},
                {sport:'F1', a:'Verstappen', ac:'#1E5BC6', as:'P1', b:'Norris', bc:'#FF8000', bs:'+2.1', tag:'L34'},
                {sport:'Tennis', a:'Alcaraz', ac:'#FFCC00', as:'6 4 3', b:'Sinner', bc:'#E30613', bs:'3 6 4', tag:'S3 3-2'},
                {sport:'NBA', a:'Lakers', ac:'#552583', as:44, b:'Warriors', bc:'#FFC72C', bs:48, tag:'Q2 8:40'},
              ].map((m,i)=>(
                <div key={i} style={{ padding:12, borderBottom: i<2?'1px solid var(--line-soft)':0, borderRight: i%2===0?'1px solid var(--line-soft)':0 }}>
                  <div className="spread" style={{ marginBottom:6 }}>
                    <V3SportTag sport={m.sport}/>
                    <span className="pill live"><span className="dot live"/>{m.tag}</span>
                  </div>
                  <div className="spread"><div className="row" style={{ gap:7 }}><V3Crest short={m.a.slice(0,3).toUpperCase()} color={m.ac} size={18}/><span style={{ font:'600 12px "Inter Tight"' }}>{m.a}</span></div>
                    <span className="num" style={{ fontWeight:800, fontSize:15 }}>{m.as}</span></div>
                  <div className="spread" style={{ marginTop:4 }}><div className="row" style={{ gap:7 }}><V3Crest short={m.b.slice(0,3).toUpperCase()} color={m.bc} size={18}/><span style={{ font:'600 12px "Inter Tight"' }}>{m.b}</span></div>
                    <span className="num" style={{ fontWeight:800, fontSize:15 }}>{m.bs}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Editorial strip — secondary, dense */}
          <div>
            <V3Rule label={t.editorsPicks} amber action={<button className="btn sm ghost">All articles →</button>}/>
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:14 }}>
              <article className="art">
                <V3Imagery sport={lead.kind==='Recap'?'NBA':'NBA'} label="NBA · GAME 3 RECAP"/>
                <div className="row" style={{ gap:6, marginTop:2 }}>
                  <V3SportTag sport="NBA"/><span className="meta">{lead.kind}</span>
                </div>
                <div className="head" style={{ font:'700 16px/1.25 "Inter Tight"', letterSpacing:'-.015em' }}>{lead.head}</div>
                <div style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.45 }}>{lead.deck}</div>
                <div className="meta">{lead.by.toUpperCase()} · {lead.mins} {t.minRead.toUpperCase()} · {lead.when.toUpperCase()}</div>
              </article>
              {subs.map(a => (
                <article key={a.id} className="art">
                  <V3Imagery sport={a.id.startsWith('pl')?'PL':a.id.startsWith('f1')?'F1':'Tennis'} label={`${a.id.split('-')[0].toUpperCase()} · ${a.kind.toUpperCase()}`}/>
                  <div className="row" style={{ gap:6 }}><V3SportTag sport={a.id.startsWith('pl')?'PL':a.id.startsWith('f1')?'F1':'Tennis'}/><span className="meta">{a.kind}</span></div>
                  <div className="head" style={{ font:'700 13.5px/1.3 "Inter Tight"' }}>{a.head}</div>
                  <div className="meta">{a.by.toUpperCase()} · {a.mins} {t.minRead.toUpperCase()}</div>
                </article>
              ))}
            </div>
          </div>
        </main>

        {/* Right rail — following + tags + series */}
        <aside className="col" style={{ gap:12 }}>
          <div className="card">
            <div className="card-head"><span className="card-title">{t.following}</span></div>
            <div style={{ padding:4 }}>
              {[
                {t:'Nuggets', c:'#0E2240', s:'LIVE · Q3 4:12', live:true, sport:'NBA'},
                {t:'Arsenal', c:'#EF0107', s:"LIVE · 67'", live:true, sport:'PL'},
                {t:'Alcaraz', c:'#FFCC00', s:'LIVE · Set 3', live:true, sport:'Tennis'},
                {t:'Lakers',  c:'#552583', s:'Q2 8:40', sport:'NBA'},
                {t:'Verstappen', c:'#1E5BC6', s:'LIVE · L34', live:true, sport:'F1'},
              ].map(f => (
                <div key={f.t} className="row" style={{ gap:8, padding:'7px 10px', borderRadius:6 }}>
                  {f.live ? <span className="dot live"/> : <span style={{width:6,height:6,background:'var(--ink-5)',borderRadius:'50%'}}/>}
                  <V3Crest short={f.t.slice(0,3).toUpperCase()} color={f.c} size={18}/>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ font:'600 11.5px "Inter Tight"' }}>{f.t}</div>
                    <div className="meta" style={{ marginTop:1 }}>{f.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom:8 }}>{t.topicSeries}</div>
            <div className="col" style={{ gap:7 }}>
              {E.series.slice(0,5).map(s => (
                <div key={s.id} className="spread">
                  <div className="row" style={{ gap:8 }}>
                    <span style={{ width:3, height:14, background:s.color, borderRadius:2 }}/>
                    <span style={{ fontSize:12, fontWeight:600 }}>{s.name}</span>
                  </div>
                  <span className="num" style={{ fontSize:10, color:'var(--ink-3)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <V3Footer/>
    </V3Board>
  );
}

// =================================================================================
// DIRECTION B — EVOLUTION
// "Newsroom upgraded to a peer of live. /news is global; per-sport hubs are slices.
//  Home becomes a 50/50 split: live console left, newsroom right."
// =================================================================================
function HomeB() {
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

      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line-soft)' }}>
        <div className="meta" style={{ color:'var(--amber)' }}>MON · 03 MAY 2026 · WIB</div>
        <h1 className="disp" style={{ marginTop:4, font:'800 26px/1.05 "Inter Tight"', letterSpacing:'-.03em' }}>
          Conference semis tipped off. Imola goes to Verstappen. Madrid waits on Alcaraz.
        </h1>
      </div>

      <div style={{ padding:18, display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {/* LEFT — live console */}
        <section>
          <V3Rule label={`Live · ${live.length}`} action={<button className="btn sm ghost">Open command center →</button>}/>
          <div className="col" style={{ gap:10 }}>
            {/* Hero score */}
            <div className="card" style={{ padding:14, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0,
                background:'radial-gradient(420px 200px at 0 0, #0E224044, transparent), radial-gradient(420px 200px at 100% 100%, #007A3344, transparent)' }}/>
              <div style={{ position:'relative' }}>
                <div className="spread" style={{ marginBottom:8 }}>
                  <div className="row" style={{ gap:6 }}><span className="pill live"><span className="dot live"/>Q3 · 4:12</span><span className="meta">DEN vs BOS · GM 3</span></div>
                  <span className="meta">DEN 2-1</span>
                </div>
                <div className="spread">
                  <div className="row" style={{ gap:8 }}><V3Crest short="DEN" color="#0E2240" size={26}/><span style={{ font:'700 14px "Inter Tight"' }}>Denver</span></div>
                  <span className="num" style={{ fontSize:32, fontWeight:900, letterSpacing:'-.04em' }}>78</span>
                </div>
                <div className="spread" style={{ marginTop:4 }}>
                  <div className="row" style={{ gap:8 }}><V3Crest short="BOS" color="#007A33" size={26}/><span style={{ font:'700 14px "Inter Tight"' }}>Boston</span></div>
                  <span className="num" style={{ fontSize:32, fontWeight:900, letterSpacing:'-.04em', color:'var(--amber)' }}>82</span>
                </div>
                <div style={{ marginTop:10 }}><V3Momentum value={0.38} home="#0E2240" away="#007A33"/></div>
              </div>
            </div>
            {/* Other 3 stacked */}
            {[
              {sport:'PL', a:'Arsenal', ac:'#EF0107', as:2, b:'Man City', bc:'#6CADDF', bs:1, tag:"67'", note:"Saka cut-back at 61'"},
              {sport:'F1', a:'Verstappen', ac:'#1E5BC6', as:'P1', b:'Norris', bc:'#FF8000', bs:'+2.1', tag:'L34/63', note:'Pit window open'},
              {sport:'Tennis', a:'Alcaraz', ac:'#FFCC00', as:'6 4 3', b:'Sinner', bc:'#E30613', bs:'3 6 4', tag:'S3 3-2', note:'Break point Alcaraz'},
            ].map((m,i)=>(
              <div key={i} className="card card-pad">
                <div className="spread" style={{ marginBottom:6 }}>
                  <V3SportTag sport={m.sport}/>
                  <span className="pill live"><span className="dot live"/>{m.tag}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto', rowGap:4, alignItems:'center' }}>
                  <div className="row" style={{ gap:7 }}><V3Crest short={m.a.slice(0,3).toUpperCase()} color={m.ac} size={18}/><span style={{ font:'600 12px "Inter Tight"' }}>{m.a}</span></div>
                  <span className="num" style={{ fontWeight:800, fontSize:14 }}>{m.as}</span>
                  <div className="row" style={{ gap:7 }}><V3Crest short={m.b.slice(0,3).toUpperCase()} color={m.bc} size={18}/><span style={{ font:'600 12px "Inter Tight"' }}>{m.b}</span></div>
                  <span className="num" style={{ fontWeight:800, fontSize:14 }}>{m.bs}</span>
                </div>
                <div className="meta" style={{ marginTop:6, color:'var(--ink-2)', textTransform:'none', letterSpacing:0, fontFamily:'Inter Tight', fontSize:11 }}>{m.note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT — newsroom */}
        <section>
          <V3Rule label="Newsroom" amber action={<button className="btn sm ghost">/news →</button>}/>
          <article className="art" style={{ marginBottom:16 }}>
            <V3Imagery sport="NBA" label="NBA · LEAD STORY" style={{ aspectRatio:'16/8' }}/>
            <div className="row" style={{ gap:6, marginTop:6 }}>
              <V3SportTag sport="NBA"/>
              <span className="meta">{lead.kind}</span>
              <span className="meta" style={{ color:'var(--amber)' }}>{lead.series?.toUpperCase()}</span>
            </div>
            <div className="head serif" style={{ font:'700 22px/1.15 "Newsreader", Georgia, serif', letterSpacing:'-.01em', marginTop:2 }}>
              {lead.head}
            </div>
            <div className="deck" style={{ marginTop:2 }}>{lead.deck}</div>
            <div className="meta" style={{ marginTop:4 }}>{t.byline.toUpperCase()} {lead.by.toUpperCase()} · {lead.mins} {t.minRead.toUpperCase()} · {lead.when.toUpperCase()}</div>
          </article>

          <hr className="loud"/>
          {/* Mid list — 3 articles, dense */}
          <div className="col" style={{ gap:14 }}>
            {[E.articles.PL[0], E.articles.F1[0], E.articles.Tennis[0]].map(a => {
              const sp = a.id.startsWith('pl') ? 'PL' : a.id.startsWith('f1') ? 'F1' : 'Tennis';
              return (
                <article key={a.id} style={{ display:'grid', gridTemplateColumns:'140px 1fr', gap:12, cursor:'pointer' }}>
                  <V3Imagery sport={sp} label={`${sp} · ${a.kind.toUpperCase()}`}/>
                  <div>
                    <div className="row" style={{ gap:6 }}><V3SportTag sport={sp}/><span className="meta">{a.kind}</span>{a.ai && <span className="pill amber">{t.aiAssisted}</span>}</div>
                    <div style={{ font:'700 14px/1.3 "Inter Tight"', letterSpacing:'-.005em', marginTop:4 }}>{a.head}</div>
                    <div style={{ fontSize:11.5, color:'var(--ink-2)', marginTop:3, lineHeight:1.4 }}>{a.deck}</div>
                    <div className="meta" style={{ marginTop:4 }}>{a.by.toUpperCase()} · {a.mins} MIN · {a.when.toUpperCase()}</div>
                  </div>
                </article>
              );
            })}
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

// =================================================================================
// DIRECTION C — RESET (BOLD)
// "Editorial-led front page. Newspaper-grade typography, serif display.
//  Live scores stay live, but the front page is a fan magazine. Hybrid newsroom
//  (global front + per-sport sections). Articles are first-class."
// =================================================================================
function HomeC() {
  const { t } = useI18n3();
  const live = [
    { sport:'NBA', a:'DEN', as:78, b:'BOS', bs:82, tag:'Q3 4:12' },
    { sport:'PL',  a:'ARS', as:2,  b:'MCI', bs:1,  tag:"67'" },
    { sport:'F1',  a:'VER', as:'P1', b:'NOR', bs:'+2.1', tag:'L34' },
    { sport:'Tennis', a:'ALC', as:'6 4 3', b:'SIN', bs:'3 6 4', tag:'S3 3-2' },
  ];
  const lead = E.articles.NBA[0];
  const second = E.articles.PL[1];
  const sub3 = [E.articles.F1[1], E.articles.Tennis[1], E.articles.NBA[4]];
  return (
    <V3Board>
      <V3TopBar active="home"/>
      <V3LiveBand items={live}/>

      {/* Masthead */}
      <div style={{ padding:'24px 28px 0', textAlign:'center', borderBottom:'1px solid var(--line)' }}>
        <div className="meta" style={{ color:'var(--amber)', letterSpacing:'.3em' }}>VOL. 3 · ED. 124 · MON 03 MAY 2026</div>
        <div className="serif" style={{ font:'900 56px/1 "Newsreader", Georgia, serif', letterSpacing:'-.03em', marginTop:8 }}>
          The Front
        </div>
        <div className="deck" style={{ maxWidth:520, margin:'8px auto 18px', color:'var(--ink-3)' }}>
          A daily editorial cut of the world of sport — written, edited, and cross-checked by humans, with AI on the wire.
        </div>
      </div>

      {/* The grid: 1 huge lead | 1 medium 2nd | rail */}
      <div style={{ padding:'24px 28px', display:'grid', gridTemplateColumns:'1.5fr 1fr 260px', gap:28 }}>
        {/* Lead */}
        <article style={{ cursor:'pointer' }}>
          <V3Imagery sport="NBA" label="NBA · GAME 3 · DENVER" style={{ aspectRatio:'16/9', borderRadius:4 }}/>
          <div className="row" style={{ gap:6, marginTop:10 }}>
            <V3SportTag sport="NBA"/>
            <span className="meta" style={{ color:'var(--amber)' }}>{lead.series?.toUpperCase()}</span>
            <span className="meta">·</span>
            <span className="meta">{lead.kind.toUpperCase()}</span>
          </div>
          <h2 className="serif" style={{ font:'800 36px/1.05 "Newsreader", Georgia, serif', letterSpacing:'-.02em', marginTop:8 }}>
            {lead.head}
          </h2>
          <div className="deck" style={{ marginTop:10, fontSize:14, lineHeight:1.55, maxWidth:560 }}>
            {lead.deck}
          </div>
          <div className="meta" style={{ marginTop:10 }}>{t.byline.toUpperCase()} {lead.by.toUpperCase()} · {lead.mins} {t.minRead.toUpperCase()} · {lead.when.toUpperCase()}</div>
        </article>

        {/* Second + tertiary stack */}
        <section style={{ borderLeft:'1px solid var(--line-soft)', borderRight:'1px solid var(--line-soft)', padding:'0 18px' }}>
          <article style={{ cursor:'pointer', borderBottom:'1px solid var(--line-soft)', paddingBottom:18, marginBottom:18 }}>
            <V3Imagery sport="PL" label="PL · TACTICS" style={{ aspectRatio:'4/3', borderRadius:4 }}/>
            <div className="row" style={{ gap:6, marginTop:8 }}><V3SportTag sport="PL"/><span className="meta">{second.kind}</span></div>
            <h3 className="serif" style={{ font:'700 22px/1.15 "Newsreader", Georgia, serif', letterSpacing:'-.012em', marginTop:6 }}>{second.head}</h3>
            <div style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.5, marginTop:4 }}>{second.deck}</div>
            <div className="meta" style={{ marginTop:6 }}>{second.by.toUpperCase()} · {second.mins} MIN</div>
          </article>
          {sub3.map(a => {
            const sp = a.id.startsWith('f1') ? 'F1' : a.id.startsWith('tn') ? 'Tennis' : 'NBA';
            return (
              <article key={a.id} style={{ borderBottom:'1px solid var(--line-soft)', paddingBottom:12, marginBottom:12, cursor:'pointer' }}>
                <div className="row" style={{ gap:6 }}><V3SportTag sport={sp}/><span className="meta">{a.kind}</span></div>
                <h4 className="serif" style={{ font:'700 16px/1.25 "Newsreader", Georgia, serif', marginTop:4 }}>{a.head}</h4>
                <div className="meta" style={{ marginTop:4 }}>{a.by.toUpperCase()} · {a.mins} MIN · {a.when.toUpperCase()}</div>
              </article>
            );
          })}
        </section>

        {/* Right rail — live + opinion */}
        <aside>
          <V3Rule label="Live now" action={<span className="num" style={{ fontSize:9, color:'var(--ink-3)' }}>04</span>}/>
          <div className="col" style={{ gap:8, marginBottom:18 }}>
            {[
              {sport:'NBA', a:'DEN', as:78, b:'BOS', bs:82, tag:'Q3 4:12'},
              {sport:'PL', a:'ARS', as:2, b:'MCI', bs:1, tag:"67'"},
              {sport:'F1', a:'VER', as:'P1', b:'NOR', bs:'+2.1', tag:'L34'},
              {sport:'Tennis', a:'ALC', as:'6 4 3', b:'SIN', bs:'3 6 4', tag:'S3 3-2'},
            ].map((m,i)=>(
              <div key={i} className="card card-pad" style={{ padding:'8px 10px' }}>
                <div className="spread" style={{ marginBottom:4 }}><V3SportTag sport={m.sport}/><span className="pill live"><span className="dot live"/>{m.tag}</span></div>
                <div className="num tab spread" style={{ fontSize:11, fontWeight:700 }}>
                  <span>{m.a} <span style={{ color:'var(--ink)' }}>{m.as}</span></span>
                  <span style={{ color:'var(--ink-3)' }}>vs</span>
                  <span><span style={{ color:'var(--ink)' }}>{m.bs}</span> {m.b}</span>
                </div>
              </div>
            ))}
          </div>

          <V3Rule label="The opinion" amber/>
          <div className="col" style={{ gap:14 }}>
            {E.articles.PL[5] && (
              <article style={{ cursor:'pointer' }}>
                <div className="meta" style={{ color:'var(--amber)' }}>OPINION · PL</div>
                <div className="serif" style={{ font:'700 16px/1.3 "Newsreader", Georgia, serif', marginTop:3 }}>{E.articles.PL[5].head}</div>
                <div className="meta" style={{ marginTop:4 }}>{E.articles.PL[5].by.toUpperCase()}</div>
              </article>
            )}
            {E.articles.NBA[5] && (
              <article style={{ cursor:'pointer' }}>
                <div className="meta" style={{ color:'var(--amber)' }}>OPINION · NBA</div>
                <div className="serif" style={{ font:'700 16px/1.3 "Newsreader", Georgia, serif', marginTop:3 }}>{E.articles.NBA[5].head}</div>
                <div className="meta" style={{ marginTop:4 }}>{E.articles.NBA[5].by.toUpperCase()}</div>
              </article>
            )}
          </div>
        </aside>
      </div>

      {/* Sport sections — newsroom slices */}
      <div style={{ padding:'8px 28px 28px' }}>
        {[
          { sport:'NBA', label:'Basketball', items:E.articles.NBA.slice(1,5) },
          { sport:'PL',  label:'Football',   items:E.articles.PL.slice(2,6) },
          { sport:'F1',  label:'Formula 1',  items:E.articles.F1.slice(1,5) },
          { sport:'Tennis', label:'Tennis',  items:E.articles.Tennis.slice(0,4) },
        ].map(sec => (
          <div key={sec.sport} style={{ marginTop:24 }}>
            <V3Rule
              label={sec.label}
              action={
                <div className="row" style={{ gap:8 }}>
                  <V3SportTag sport={sec.sport}/>
                  <button className="btn sm ghost">/{sec.sport.toLowerCase()}/news →</button>
                </div>
              }
            />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14 }}>
              {sec.items.map(a => (
                <article key={a.id} className="art" style={{ cursor:'pointer' }}>
                  <V3Imagery sport={sec.sport} label={`${sec.sport} · ${a.kind.toUpperCase()}`}/>
                  <div className="meta">{a.kind}{a.series ? ` · ${a.series}` : ''}</div>
                  <div className="serif head" style={{ font:'700 14.5px/1.25 "Newsreader", Georgia, serif' }}>{a.head}</div>
                  <div className="meta" style={{ marginTop:2 }}>{a.by.toUpperCase()} · {a.mins} MIN</div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
      <V3Footer/>
    </V3Board>
  );
}

Object.assign(window, { HomeA, HomeB, HomeC });
