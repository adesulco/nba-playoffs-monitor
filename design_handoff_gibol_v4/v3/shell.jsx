// V3 — shared TopBar + Footer + bilingual strings + mock data

const I18N3 = {
  en: {
    home:'Home', news:'News', fixtures:'Fixtures', standings:'Standings', pickem:"Pick'em",
    liveNow:'Live now', following:'Following', latest:'Latest', editorsPicks:"Editor's picks",
    readMore:'Read more', allArticles:'All articles', browseSport:'Browse',
    todayOn:'Today on Gibol', deepRead:'Deep read', recap:'Recap', preview:'Preview', analysis:'Analysis',
    minRead:'min read', byline:'By', updated:'Updated',
    moreFrom:'More from', popularTags:'Popular tags', topicSeries:'Topic series',
    aiAssisted:'AI-assisted', humanWritten:'Human-written', editorial:'Editorial',
    lang:'EN',
  },
  bi: {
    home:'Beranda', news:'Berita', fixtures:'Jadwal', standings:'Klasemen', pickem:"Pick'em",
    liveNow:'Live sekarang', following:'Diikuti', latest:'Terbaru', editorsPicks:'Pilihan editor',
    readMore:'Baca selengkapnya', allArticles:'Semua artikel', browseSport:'Jelajahi',
    todayOn:'Hari ini di Gibol', deepRead:'Bacaan mendalam', recap:'Ringkasan', preview:'Pratinjau', analysis:'Analisis',
    minRead:'menit baca', byline:'Oleh', updated:'Diperbarui',
    moreFrom:'Lainnya dari', popularTags:'Tag populer', topicSeries:'Seri topik',
    aiAssisted:'Bantuan AI', humanWritten:'Ditulis manusia', editorial:'Editorial',
    lang:'BI',
  }
};

window.useI18n3 = function () {
  const [lang, setLang] = React.useState(() => localStorage.getItem('gibol_lang') || 'en');
  const toggle = () => {
    const n = lang === 'en' ? 'bi' : 'en'; setLang(n);
    localStorage.setItem('gibol_lang', n);
  };
  return { t: I18N3[lang], lang, toggle };
};

// Editorial mock dataset — used by every direction
const E = {
  // Articles by sport. Each: id, sport, kind, head, deck, byline, ai, mins, when, tags, series, lang
  articles: {
    NBA: [
      { id:'nba-1', kind:'Recap',     head:'Boston turns the West on its head — Celtics steal Game 3 in Denver',
        deck:"Tatum's 35 and a fourth-quarter run nobody saw coming. Joker is gassed, the bench is empty, and the series tilts.",
        by:'Reza Pranata', ai:false, mins:6, when:'2h ago', tags:['Celtics','Nuggets','Conf SF','Tatum'], series:'Playoff Watch' },
      { id:'nba-2', kind:'Analysis',  head:"Why OKC's pace is the league's quiet revolution",
        deck:'Five-out, no centers, and the highest assist rate of any contender. The Thunder built something the league copied without admitting it.',
        by:'Maya Sutanto', ai:false, mins:9, when:'6h ago', tags:['OKC','Thunder','Pace','Strategy'], series:'Tactics Lab' },
      { id:'nba-3', kind:'Preview',   head:'Knicks vs Bucks Game 5 — pick your poison on the perimeter',
        deck:'Brunson sees doubles. Lillard sees blitzes. Whoever blinks first hands their bench a closing-time problem.',
        by:'AI Newsroom', ai:true,  mins:3, when:'1h ago', tags:['NYK','MIL','Brunson','Lillard'], series:'Playoff Watch' },
      { id:'nba-4', kind:'Brief',     head:'Wemby cleared, will start tonight in San Antonio',
        deck:'Late scratch reversal after warm-ups. Spurs lineup unchanged otherwise.',
        by:'AI Newsroom', ai:true,  mins:1, when:'18m ago', tags:['Wembanyama','SAS','Injury'] },
      { id:'nba-5', kind:'Feature',   head:'The shoot-around that quietly ended the Lakers era',
        deck:'A long, unhurried look at a roster that ran out of decisions before it ran out of stars.',
        by:'Hakim Wibowo', ai:false, mins:14, when:'Yesterday', tags:['Lakers','Era','Long-form'], series:'Anatomy Of' },
      { id:'nba-6', kind:'Power Rk',  head:'Power rankings · Week 26 — only one team is actually scary',
        deck:'And it isn\'t the one in your bracket.',
        by:'Maya Sutanto', ai:false, mins:5, when:'Yesterday', tags:['Rankings','Contenders'], series:'Power Rankings' },
    ],
    PL: [
      { id:'pl-1', kind:'Match Recap', head:"Saka's cut-back drags Arsenal back into the title race",
        deck:'A flat first half, an Ødegaard adjustment, and a 17-pass sequence that ended with City watching their season blink.',
        by:'Dimas Aryo', ai:false, mins:7, when:'1h ago', tags:['Arsenal','Man City','Saka','Title'], series:'Title Race' },
      { id:'pl-2', kind:'Tactics',     head:"Why Pep's right-back gambit isn't working at 4-3 down",
        deck:'A look at the inverted full-back template — and the moment it stops scaling against a low block.',
        by:'Dimas Aryo', ai:false, mins:11, when:'4h ago', tags:['Man City','Tactics','Guardiola'], series:'Tactics Lab' },
      { id:'pl-3', kind:'Preview',     head:'Liverpool vs Tottenham — last shot at top four for Spurs',
        deck:'Postecoglou keeps saying "we go." The xG table says they probably should not.',
        by:'AI Newsroom', ai:true,  mins:4, when:'30m ago', tags:['Liverpool','Spurs','Top Four'] },
      { id:'pl-4', kind:'Brief',       head:'Haaland subbed at half — precaution, says City',
        deck:'No update yet on availability for Imola weekend Wembley fixture.',
        by:'AI Newsroom', ai:true,  mins:1, when:'42m ago', tags:['Haaland','Injury'] },
      { id:'pl-5', kind:'Long-form',   head:'How a £45m signing rebuilt Aston Villa\'s spine',
        deck:'Twelve months of slow tactical work, one striker, and a patience that English football rarely allows.',
        by:'Hakim Wibowo', ai:false, mins:13, when:'Yesterday', tags:['Villa','Recruitment'], series:'Anatomy Of' },
      { id:'pl-6', kind:'Opinion',     head:'The Premier League finally has a relegation problem worth watching',
        deck:'Three teams, eight points, four matchdays. The bottom may be more interesting than the top.',
        by:'Reza Pranata', ai:false, mins:5, when:'2 days ago', tags:['Relegation'] },
    ],
    F1: [
      { id:'f1-1', kind:'Race Report', head:'Verstappen rides a one-stop home — Imola goes to script',
        deck:'A clean lights-out, a 14-lap medium stint, and a pit window Lando never quite caught.',
        by:'Anjani Putri', ai:false, mins:6, when:'3h ago', tags:['Verstappen','Imola','Strategy'] },
      { id:'f1-2', kind:'Analysis',    head:"McLaren's race pace is real — qualifying is the lie",
        deck:'A long look at sector deltas, fuel-corrected stints, and why Saturday is the only thing fooling people.',
        by:'Anjani Putri', ai:false, mins:9, when:'8h ago', tags:['McLaren','Norris','Pace'], series:'Tactics Lab' },
      { id:'f1-3', kind:'Driver Mkt',  head:'Sainz to Audi — the slowest dominoes in F1 history finally fell',
        deck:'What a 3-year deal worth €40m says about where Audi thinks 2026 is going.',
        by:'AI Newsroom', ai:true,  mins:4, when:'5h ago', tags:['Sainz','Audi','Silly Season'], series:'Silly Season' },
      { id:'f1-4', kind:'Brief',       head:'FIA confirms 2026 power-unit weight target — and a margin',
        deck:'5kg of give, technical directive published Friday.',
        by:'AI Newsroom', ai:true,  mins:1, when:'1h ago', tags:['FIA','Regs'] },
      { id:'f1-5', kind:'Feature',     head:'Inside the Red Bull factory floor that built the championship',
        deck:'Six months, 80 interviews, one carbon-fibre layup nobody wanted to talk about.',
        by:'Hakim Wibowo', ai:false, mins:18, when:'2 days ago', tags:['Red Bull','Long-form'], series:'Anatomy Of' },
    ],
    Tennis: [
      { id:'tn-1', kind:'Match Recap', head:'Alcaraz over Sinner in Madrid — clay, three sets, no daylight',
        deck:'A 47-shot rally at 5–4 in the third you will replay until next week. Carlos has his footing back.',
        by:'Sasha Idris', ai:false, mins:6, when:'1h ago', tags:['Alcaraz','Sinner','Madrid'], series:'Slam Watch' },
      { id:'tn-2', kind:'Analysis',    head:"Iga's serve plus-one — the shot that quietly broke Gauff",
        deck:'Heatmaps, return positions, and a three-point pattern that won the second set in eleven minutes.',
        by:'Sasha Idris', ai:false, mins:8, when:'5h ago', tags:['Swiatek','Gauff','Tactics'], series:'Tactics Lab' },
      { id:'tn-3', kind:'Preview',     head:'Madrid Open final — the one Sinner cannot afford to lose',
        deck:"Points to defend, ranking math, and the tournament that sets up Roland-Garros.",
        by:'AI Newsroom', ai:true,  mins:3, when:'2h ago', tags:['Sinner','Madrid','Final'] },
      { id:'tn-4', kind:'Rankings',    head:'Race to Turin · Week 17 — Djokovic falls out of top eight',
        deck:'For the first time since 2018. Whether it lasts is the only interesting question left.',
        by:'AI Newsroom', ai:true,  mins:2, when:'Yesterday', tags:['Rankings','Djokovic'], series:'Race To Turin' },
    ],
  },
  series: [
    { id:'playoff-watch', name:'Playoff Watch', sport:'NBA', count:42, color:'var(--nba)' },
    { id:'title-race',    name:'Title Race',    sport:'PL',  count:28, color:'var(--pl)' },
    { id:'tactics-lab',   name:'Tactics Lab',   sport:'Multi', count:36, color:'var(--blue-2)' },
    { id:'anatomy-of',    name:'Anatomy Of',    sport:'Multi', count:18, color:'var(--amber)' },
    { id:'silly-season',  name:'Silly Season',  sport:'F1',  count:12, color:'var(--f1)' },
    { id:'race-to-turin', name:'Race To Turin', sport:'Tennis', count:9, color:'var(--tennis)' },
    { id:'power-ranks',   name:'Power Rankings', sport:'NBA', count:26, color:'var(--nba)' },
    { id:'slam-watch',    name:'Slam Watch',    sport:'Tennis', count:15, color:'var(--tennis)' },
  ],
  popularTags: [
    'Tatum','Saka','Verstappen','Alcaraz','Playoffs','Title Race','Imola','Madrid Open',
    'OKC','Arsenal','McLaren','Sinner','Wembanyama','Haaland','Norris','Swiatek',
  ],
};
window.E = E;

// Liveband — used at top of every dashboard for consistency
function V3LiveBand({ items, dense=false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, padding:'6px 14px',
      borderBottom:'1px solid var(--line)', background:'var(--bg)',
      fontSize:10, overflow:'hidden', whiteSpace:'nowrap' }} className="mono tab">
      <span className="row" style={{ gap:6, marginRight:14, flexShrink:0 }}><span className="dot live"/><span style={{ color:'var(--live)', fontWeight:800 }}>LIVE</span></span>
      <div style={{ display:'flex', gap:0, flex:1, overflow:'hidden' }}>
        {items.map((it,i)=>(
          <div key={i} className="row" style={{ gap:6, marginRight:18, color:'var(--ink-2)', flexShrink:0 }}>
            <span style={{ color:'var(--ink-3)' }}>{it.sport}</span>
            <span style={{ fontWeight:700 }}>{it.a}</span>
            <span className="tab" style={{ color:'var(--ink)' }}>{it.as}</span>
            <span style={{ color:'var(--ink-4)' }}>·</span>
            <span style={{ fontWeight:700 }}>{it.b}</span>
            <span className="tab" style={{ color:'var(--ink)' }}>{it.bs}</span>
            <span style={{ color:'var(--ink-4)' }}>{it.tag}</span>
          </div>
        ))}
      </div>
      <span style={{ marginLeft:'auto', color:'var(--ink-3)', flexShrink:0 }}>UPDATED 2s AGO</span>
    </div>
  );
}

// Top bar — UNIFIED across home + sport dashboards. The currentSport prop colors the
// sport tab. Sub-nav rendered conditionally for sport pages.
function V3TopBar({ active='home', currentSport=null, subnav=null, density='comfortable' }) {
  const { t, toggle } = useI18n3();
  const items = [
    { id:'home', lbl:t.home },
    { id:'NBA',  lbl:'NBA' },
    { id:'PL',   lbl:'Premier League' },
    { id:'F1',   lbl:'Formula 1' },
    { id:'Tennis', lbl:'Tennis' },
    { id:'news', lbl:t.news },
    { id:'fixtures', lbl:t.fixtures },
    { id:'pickem', lbl:t.pickem },
  ];
  const pad = density==='dense' ? '6px 14px' : '10px 18px';
  return (
    <header style={{
      borderBottom:'1px solid var(--line)', background:'var(--bg)', position:'sticky', top:0, zIndex:10,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:pad }}>
        <V3Logo size={16}/>
        <nav style={{ display:'flex', gap:1, marginLeft:8, overflow:'hidden' }}>
          {items.map(it => {
            const isActive = active===it.id;
            const isSport = !!SPORT_COLORS[it.id];
            return (
              <button key={it.id} style={{
                background: isActive?'var(--bg-3)':'transparent', border:0,
                color: isActive?'var(--ink)':'var(--ink-3)',
                font:'600 12px "Inter Tight"', padding:'6px 10px', borderRadius:6, cursor:'pointer',
                display:'inline-flex', alignItems:'center', gap:6,
                borderBottom: isActive && isSport ? `2px solid ${SPORT_COLORS[it.id]}` : '2px solid transparent',
              }}>
                {isSport && <span style={{ width:6, height:6, borderRadius:1, background: SPORT_COLORS[it.id] }}/>}
                {it.lbl}
              </button>
            );
          })}
        </nav>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{
            display:'flex', alignItems:'center', gap:8, background:'var(--bg-3)', border:'1px solid var(--line)',
            borderRadius:6, padding:'5px 10px', width:200, color:'var(--ink-3)', fontSize:11,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            {currentSport ? `Search ${currentSport} · ⌘K` : 'Search · ⌘K'}
          </div>
          <button className="btn ghost" onClick={toggle} style={{ fontSize:10, fontWeight:800, letterSpacing:'.1em' }}>{t.lang}</button>
          <button className="btn ghost" style={{ padding:'5px 7px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          </button>
          <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg, var(--blue), var(--amber))' }}/>
        </div>
      </div>
      {subnav && (
        <div style={{ borderTop:'1px solid var(--line-soft)', padding:'6px 18px', display:'flex', gap:2, alignItems:'center', overflow:'auto' }}>
          {subnav}
        </div>
      )}
    </header>
  );
}

function V3SubNav({ items, active }) {
  return (
    <div className="row" style={{ gap:1 }}>
      {items.map(it => {
        const a = it.id===active;
        return (
          <button key={it.id} style={{
            background: a?'var(--bg-3)':'transparent', border:0,
            color: a?'var(--ink)':'var(--ink-3)',
            font:'600 11px "Inter Tight"', padding:'5px 10px', borderRadius:5, cursor:'pointer',
          }}>{it.label}</button>
        );
      })}
    </div>
  );
}

// Footer — minimal, consistent across all surfaces
function V3Footer() {
  return (
    <footer style={{ borderTop:'1px solid var(--line)', padding:'18px 18px 24px', marginTop:24,
      display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr 1fr 1fr', gap:18 }}>
      <div>
        <V3Logo size={14}/>
        <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:6, lineHeight:1.5, maxWidth:240 }}>
          Live scores, calm analysis, and a newsroom built for fans who care about the why.
        </div>
        <div className="mono" style={{ fontSize:9, color:'var(--ink-4)', marginTop:8, letterSpacing:'.1em' }}>
          v3.0.0 · 2026.05.03 · ASIA/JAKARTA
        </div>
      </div>
      {[
        { h:'Sports', l:['NBA','Premier League','Formula 1','Tennis','World Cup 2026','Liga 1'] },
        { h:'Newsroom', l:['Latest','Recaps','Tactics Lab','Anatomy Of','Power Rankings'] },
        { h:'Features', l:['Fixtures','Standings',"Pick'em",'Command Center','Glossary'] },
        { h:'Company', l:['About','Editorial standards','Contact','Privacy','Terms'] },
      ].map(c => (
        <div key={c.h}>
          <div className="card-title" style={{ marginBottom:8 }}>{c.h}</div>
          <div className="col" style={{ gap:5 }}>
            {c.l.map(x => <a key={x} style={{ fontSize:11.5, color:'var(--ink-2)', textDecoration:'none', cursor:'pointer' }}>{x}</a>)}
          </div>
        </div>
      ))}
    </footer>
  );
}

Object.assign(window, { I18N3, V3LiveBand, V3TopBar, V3SubNav, V3Footer });
