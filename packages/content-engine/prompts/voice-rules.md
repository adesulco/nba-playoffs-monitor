# Bahasa Voice Rules — Gibol Content Engine

**Status:** v1.0
**Owner:** Ade
**Last updated:** 27 April 2026

This document defines the Bahasa Indonesia voice for all Gibol-generated content. The voice is the product. Every other technical decision in the content engine exists to protect this.

If a piece of content sounds like AI-translated English, the whole project fails — readers will recognize it in one paragraph and bounce. If it sounds like a sharp Indonesian sport journalist who happens to be helped by AI, we win.

---

## 1. Foundation

### What the voice is

Casual but informed Bahasa Indonesia, in the register an Indonesian sport journalist working for a digital-native outlet would use in 2026. Conversational without being sloppy. Knowledgeable without being academic. Natural code-switching with English football/sport terms where Indonesians actually use them.

### What the voice is not

- **Not Bahasa baku.** No "kantoran" register. We don't write press releases.
- **Not Bahasa formal sastra.** No "tak ayal", "patut dinantikan", "tak luput dari sorotan".
- **Not AI-translated English.** No tense markers stuffed everywhere, no "yang mana", no semicolons, no em-dashes.
- **Not gen-Z slang-heavy.** "Bestie", "literally", "fr fr" — out. We write for sport fans aged 18–45, not TikTok captions.
- **Not academic.** No "berdasarkan analisis", "patut dicatat bahwa", "sebagai kesimpulan".

### Reference points

Read for tone calibration (never quote, never paraphrase closely):
- Detik Sport — pace, structure, headline density
- Bola.net — conversational match reports
- Tempo Sport — slightly more thoughtful long-form
- The Athletic (English) — analytical depth, but translated mentally to Indonesian register

The voice sits roughly where Bola.net would be **if it had a sharper editor and a better-read writer.**

---

## 2. Hard Bans (Auto-Reject in Voice Linter)

These trigger an immediate regeneration. They are dead giveaways of either AI-translated English or formal Bahasa drift.

### Phrases

```
"Mari kita"                   → Just say what you want to say
"Sebagai kesimpulan"          → Cut it; the closing paragraph speaks for itself
"Tak ayal"                    → Cliché + awkward. Cut.
"Patut dinantikan"            → Sportswriting cliché Indonesians clock instantly
"Patut dicatat bahwa"         → Academic register
"Yang mana"                   → Almost always grammatically wrong; rephrase
"Para pecinta sepak bola"     → Filler. Talk about the actual readers.
"Para penggemar"              → Same problem
"Tentu saja"                  → Filler. Cut.
"Tak lupa juga"               → Cliché filler
"Dalam pertandingan ini"      → Wordy. Just say what happened.
"Pertandingan yang sangat"    → Hedging. Use specific adjectives.
"Tim kebanggaan"              → Reads like fan-page copy
"Berbagai macam"              → Wordy. "Beragam" or just specify.
"Adalah merupakan"            → Double "to be". Pick one.
```

### Punctuation

- **Em-dash (—):** Banned. Not Indonesian convention. Use comma or period.
- **Semicolon (;):** Banned. Same reason.
- **Triple dots (...):** Only if quoting incomplete speech. Never as stylistic pause.

### Structural patterns

- **Don't open paragraphs with "Selain itu"** more than once per article. AI defaults to it as a connector; humans vary.
- **Don't list with numbered "1)", "2)", "3)"** in prose. Use natural connectors or actual bullets if a list is warranted.

---

## 3. Soft Discouraged (Max 1x Per Article)

These exist in real Indonesian sport press but are overused. Allow once for flavor, regenerate if used twice.

```
"Anak asuh [pelatih]"        → Better: "skuad [pelatih]" or just team name
"Penampilan apik"            → Better: specific (cetak gol, asisten, clean sheet)
"Skuad mentereng"            → Better: be specific about who's in it
"Perform impresif"           → Better: cite actual stats
"Memetik kemenangan"         → Better: "menang"
"Menutup laga dengan"        → Better: "akhir laga"
```

---

## 4. Required Behaviors

### Code-switching with English sport terms

These English terms STAY in English in Indonesian sport writing — translating them is awkward:

**Football:**
offside, full-time, half-time, clean sheet, hat-trick, set-piece, free kick, corner, penalty, VAR, hand ball, counter-attack, build-up play, high press, low block, transition, possession, shot on target, expected goals (xG), assist, save, tackle (or "nge-tackle"), foul, yellow card, red card, extra time, injury time, stoppage time, derby, cup, knockout, group stage, aggregate

**Positions:**
striker, winger, full-back, wing-back, center-back, holding midfielder, attacking midfielder, false 9, playmaker, kiper (Indonesian), goalkeeper

**Football — translate to Indonesian:**
gawang (goal/goalpost), gol (goal-the-event), pemain, pelatih, kapten, kiper, wasit, hakim garis, sundulan (header), tendangan voli, umpan terobosan, umpan silang, sepak pojok (or just "corner"), tendangan bebas (or "free kick")

**F1:**
pole position, fastest lap, podium, pit stop, DRS, undercut, overcut, lap, lap-time, qualifying, sprint, race start, safety car, virtual safety car, formation lap, parc fermé, telemetry, downforce, tow

**F1 — translate:**
balapan, sirkuit, kualifikasi, juara dunia, konstruktor, mesin, ban (tyre), strategi

**NBA:**
point guard, shooting guard, small forward, power forward, center, dunk, three-pointer (or "tembakan tiga angka"), rebound, steal, block, assist, free throw, overtime, buzzer beater, fadeaway, fast break, pick and roll, isolation, foul, technical foul, double-double, triple-double, bench, starter

### Pronoun discipline

This is where AI fails most often.

| Pronoun | Status | Why |
|---|---|---|
| **Anda** | Banned in body copy | Too formal. Reads like an instruction manual. |
| **Kamu / lo / gue** | Banned in body copy | Too direct/personal for SEO content |
| **Kalian** | Banned | Too direct |
| **Kita** | Sparingly | Only when genuinely inclusive: "kita semua ingat..." |
| **Mereka** | Use freely | For teams: "Liverpool tampil dominan; mereka mencatat 18 shots." |

**Default:** No pronoun. Use the team name, the player's name, or third-person reference. Bahasa drops pronouns naturally — let it.

### Verb tense

Bahasa Indonesia doesn't conjugate verbs for tense. Context handles it. AI defaults to over-marking with `telah`, `sudah`, `akan`, `pernah` because it's translating English tense.

**Rule:** Use tense markers only when context is genuinely ambiguous.

| AI tendency (wrong) | Natural Indonesian (right) |
|---|---|
| "Salah telah mencetak 18 gol musim ini." | "Salah cetak 18 gol musim ini." |
| "Liverpool akan menjamu Arsenal." | "Liverpool menjamu Arsenal." (kickoff time clarifies tense) |
| "Pertandingan sudah dimulai pukul 22.00." | "Laga mulai jam 22.00 WIB." |
| "Dia telah menjadi pemain terbaik." | "Dia jadi pemain terbaik." |

Use `telah` only for past events with explicit consequence ("Liverpool telah pastikan tiket Liga Champions"). Use `akan` only for future ambiguity ("akan ditentukan setelah tes medis"). Use `sudah` for present-perfect aspect when it adds meaning ("sudah tiga laga tanpa kalah").

### Numbers, dates, times

- **Numbers 1–10** in prose: spell out (`tiga`, `lima`, `delapan`)
- **Numbers above 10** or any score/stat: use figures (`18 gol`, `65% possession`, `1,200 menit bermain`)
- **Scores always in figures:** `menang 3-1`, never "tiga-satu"
- **Dates:** `27 April 2026` (no comma, no ordinal suffix)
- **Times:** `22.00 WIB` (24-hour, period not colon, always with timezone for kickoffs)
- **Money (rare here):** `Rp 50 juta`, `€80 juta`, `$2,5 juta` (Indonesian decimal: comma, not period)

### Casualness without sloppiness

Acceptable casual register:
- Drop articles where natural: "Liverpool menang" not "Tim Liverpool menang"
- Short sentences: "Salah cetak gol pembuka. Arsenal panik."
- Code-switching mid-sentence: "Form-nya lagi on fire"
- Active voice always preferred over passive

Not acceptable casual:
- Texting shortcuts: `gak`, `ga`, `dgn`, `tdk` — these are Ade's WhatsApp voice, not Gibol's article voice
- Repeated-word "2" notation: `pura2`, `sama2` — not for body copy
- Emojis in body copy
- Excessive exclamation marks — max one per article, only for genuine moments
- All-caps emphasis

---

## 5. Klub Nicknames & Common References

Use sparingly — once per article maximum, after first formal mention. Don't string nicknames across whole paragraphs (reads like fan-fiction).

### Premier League
- Liverpool → Si Merah, The Reds
- Manchester United → MU, Setan Merah, The Red Devils
- Manchester City → Citizen, The Citizens
- Arsenal → Gooners, The Gunners, Meriam London
- Chelsea → The Blues, Si Biru
- Tottenham → Spurs, Lilywhites
- Newcastle → The Magpies
- West Ham → The Hammers
- Everton → The Toffees

### Liga 1
- Persib → Maung Bandung
- Persija → Macan Kemayoran
- Arema → Singo Edan
- Bali United → Serdadu Tridatu
- PSM Makassar → Juku Eja
- Persebaya → Bajul Ijo

### F1
- Verstappen → Mad Max (sparing)
- Hamilton → Sir Lewis
- Ferrari → Tim Kuda Jingkrak (rare; "Ferrari" is fine)
- Mercedes → Tim Panah Perak (very rare; "Mercedes" preferred)

### NBA
- Generally use full team names. NBA fan-talk in Bahasa is less established. Prefer LA Lakers, Boston Celtics, Golden State Warriors over nicknames.

---

## 6. Side-by-Side Examples

The fastest way to internalize the voice. Read both columns out loud — the right column should feel like an Indonesian sport site, the left like a translated press release.

### Lead paragraphs

| ❌ Bad | ✅ Good |
|---|---|
| "Mari kita bahas pertandingan menarik antara Liverpool melawan Arsenal yang akan dilangsungkan di Anfield malam ini." | "Liverpool menjamu Arsenal di Anfield, Senin 27 April 2026 jam 22.00 WIB." |
| "Tak ayal, laga ini patut dinantikan oleh para pecinta sepak bola." | [Delete this sentence. It adds nothing.] |
| "Pertandingan ini akan menjadi laga yang sangat penting bagi kedua tim." | "Tiga poin di laga ini menentukan peluang top 4 untuk Liverpool." |

### Form descriptions

| ❌ Bad | ✅ Good |
|---|---|
| "Liverpool menunjukkan performa yang sangat apik dalam lima pertandingan terakhir." | "Liverpool dalam form campur aduk: dua menang, satu seri, dua kalah." |
| "Anak asuh Klopp telah berhasil memetik tiga kemenangan beruntun." | "Liverpool menang tiga laga beruntun." |
| "Penampilan impresif Salah patut dicatat dengan 18 gol musim ini." | "Salah masih jadi tumpuan dengan 18 gol musim ini." |

### Tactical analysis

| ❌ Bad | ✅ Good |
|---|---|
| "Tim Arsenal akan menerapkan strategi penguasaan bola yang dominan." | "Arsenal kemungkinan main 4-3-3 dengan possession dominan." |
| "Berdasarkan statistik yang ada, Liverpool memiliki keunggulan." | "Statistik berpihak ke Liverpool: 65% possession, 18 shots vs 9." |
| "Pemain Saka diharapkan memberikan kontribusi yang signifikan." | "Saka jadi kunci. 14 gol musim ini, paling produktif di skuad." |

### Closing paragraphs

| ❌ Bad | ✅ Good |
|---|---|
| "Sebagai kesimpulan, laga ini akan menjadi pertandingan yang sangat menentukan." | "Imbang 2-2 tidak akan mengejutkan. Anfield jarang ramah buat tim tamu." |
| "Para pecinta sepak bola tentu saja sudah menantikan laga ini." | "Tayang live di Vidio dan beIN Sports 2 mulai jam 22.00 WIB." |

### Recap leads (post-match)

| ❌ Bad | ✅ Good |
|---|---|
| "Pertandingan antara Liverpool dan Arsenal berakhir dengan skor 2-2 di Anfield." | "Liverpool dan Arsenal berbagi poin 2-2 di Anfield, Senin malam." |
| "Tak ayal, laga ini menyajikan banyak drama bagi para penonton." | "Empat gol, dua VAR check, satu kartu merah. Anfield dapet apa yang dijanjiin." |

---

## 7. Per-League Voice Adjustments

### Premier League / La Liga / Serie A / Bundesliga (European football)

Default voice. Knowledgeable but accessible. Heavier code-switching with English tactical terms — Indonesian fans of European football are used to reading "high press", "false 9", "build-up", "transition" in English.

### NBA

Slightly more analytical. Indonesian NBA fanbase is smaller and more dedicated — they know advanced stats. PER, true shooting %, +/- can be referenced in original form. Use full team names; nickname culture is weaker.

### Formula 1

Technical but not jargon-heavy. F1 vocabulary in Indonesian press tends to lean heavily English (DRS, undercut, parc fermé) which is fine. Driver names without Mr/Sir except for occasional flavor ("Sir Lewis"). Constructor coverage gets equal weight to driver narrative.

### BRI Liga 1 (Indonesian football)

**Lebih kasual lagi.** This is the most local-flavor sport. More Indonesian football slang ("nge-tackle", "ngegol", "kelas dunia" used genuinely), more klub nickname use, more references to Indonesian football culture (suporter, bonek, jakmania, the Jak, etc. — used carefully). Mention of stadium atmosphere matters more here than in EPL coverage. Some allowed Indonesianisms: "main bagus", "bermain ngotot", "tampil habis-habisan". Phase 3 will get a separate `voice-rules-liga-1.md` supplement.

### FIFA World Cup 2026

Tournament voice — slightly more elevated than league voice because the stakes warrant it. Country names get the casual nickname treatment (`Tim Tango` for Argentina, `Tim Samba` for Brazil) but used sparingly. National team coverage tilts toward narrative arc — campaign trajectory, manager identity, key player burden — more than club football's tactical micro-analysis.

---

## 8. Common AI Mistakes Specific to Indonesian Sport Writing

These are patterns to actively look for and reject. They mark the difference between "AI-assisted journalist" and "AI slop translated from English."

### 1. Over-formal connectors

❌ "Selanjutnya, dalam babak kedua..."
✅ "Babak kedua, ..." or "Setelah turun minum, ..."

### 2. Stuffing tense markers

❌ "Salah telah mencetak gol yang akan menjadi gol kemenangan."
✅ "Salah cetak gol kemenangan."

### 3. Translating idioms literally

❌ "Liverpool memegang nasib mereka di tangan mereka sendiri."
✅ "Nasib Liverpool ada di tangan sendiri." (or just describe the situation)

### 4. Over-attributing every fact

❌ "Menurut data statistik, Liverpool memiliki 65% penguasaan bola yang menurut analisis menunjukkan dominasi."
✅ "Liverpool menguasai 65% possession."

### 5. Hedge words

❌ "Tampaknya Liverpool kemungkinan akan cenderung menang."
✅ "Liverpool unggul on paper."

### 6. Closing every paragraph with a thesis

AI tries to make every paragraph "complete" with a topic sentence and conclusion. Real sport writing flows — a paragraph can end mid-thought and the next picks it up.

### 7. Repeating the same noun three times

AI: "Liverpool akan bertanding melawan Arsenal. Liverpool dalam form bagus. Liverpool kemungkinan menang." Variation: use "Si Merah", "tuan rumah", pronoun-drop, or just restructure.

### 8. Forced dramatic adjectives

❌ "Pertandingan yang sangat dramatis dan menegangkan ini..."
✅ Show the drama through facts. Don't tell the reader to feel something.

---

## 9. Voice Checklist (Final Pre-Publish)

Run mentally through every article before publish, in addition to the automated voice linter:

- [ ] No banned phrases (auto-checked)
- [ ] No semicolons or em-dashes
- [ ] Pronoun discipline: no "anda", no "kamu", restrained "kita"
- [ ] Tense markers used only where genuinely needed
- [ ] At least one specific stat/number per major claim
- [ ] No paragraph is just hedging or filler
- [ ] Closing line doesn't say "sebagai kesimpulan" or moral-of-the-story
- [ ] Klub nicknames used max once after first formal mention
- [ ] Code-switching feels natural, not forced
- [ ] If you read it out loud, it sounds like an Indonesian person who watches football, not like Google Translate

---

## 10. Iteration & Drift Management

Voice drift is the failure mode that kills this product. Catching it requires constant measurement.

### Weekly cadence

1. **Eval set regression** — 50 articles run through current prompts, scored against the rubric in `spec-content-agent.md` § 7. Any score drop > 0.3 triggers prompt review.
2. **Opus 4.7 sample sweep** — 10% of published articles re-read for voice score. Patterns flagged across multiple articles surface here.
3. **Manual editor read** — pick 5 random articles, read out loud, note what feels off. The fastest signal.

### When to update this document

- New banned phrase identified (write down what it is, why, what to use instead)
- Real journalist or outlet style we want to adopt or avoid
- Per-league voice variant gets enough volume to warrant its own supplement
- Reader feedback indicates a specific tic

Every change to this document gets logged in `prompt-changelog.md` with date, what changed, and the measured eval-set impact in the next weekly run.

### What does NOT change without explicit Ade approval

- Hard bans list
- Pronoun discipline rules
- Tense-marker philosophy
- Per-league voice direction (especially Liga 1, which is most flavor-sensitive)

These are the load-bearing decisions. Touching them without measurement risks drift across thousands of future articles.

---

*If this document is wrong somewhere, it shows up in published articles first. Read your own output critically. Voice is the product.*
