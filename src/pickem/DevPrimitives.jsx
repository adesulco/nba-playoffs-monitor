/**
 * /dev/primitives — R1-4 visual QA route (v0.82.0).
 *
 * Storybook-less: every Sistem 4a primitive, in every state, across the
 * three shipping sport skins, in both Edisi Malam and light. This is the
 * acceptance surface for R1 ("renders all primitives in 3 skins ×
 * light/dark, AA-checked") and the reference when building R2's screens.
 *
 * Flagged: only mounts when VITE_FLAG_DEV_PRIMITIVES === '1', so it
 * can't be reached in production by URL guessing. It also renders its
 * own theme override locally rather than touching the global theme
 * engine, so both themes can sit side by side on one page.
 */

import { useState } from 'react';
import {
  MatchCard,
  PickChip,
  LeaderboardRow,
  LiveTile,
  KabarCard,
  LockBadge,
} from './components/primitives4a.jsx';
import Logo4a, { LogoLockup } from './components/Logo4a.jsx';
import { SPORT_SKINS, skin } from './sportSkins.js';
import {
  IconMain, IconGrup, IconSkor, IconKabar,
  IconStar, IconLock, IconShare, IconWhatsApp, IconCopy,
  IconChevronRight, IconMoon, IconSun, IconLiveDot,
} from './components/icons4a.jsx';

const SKIN_KEYS = ['bola', 'basket', 'motogp'];

export default function DevPrimitives() {
  const [selected, setSelected] = useState('H');
  const [starred, setStarred] = useState(false);

  return (
    <div style={{ fontFamily: 'var(--g4-font-ui)' }}>
      <div style={{ padding: '20px 16px', borderBottom: '2px solid var(--g4-ink)' }}>
        <LogoLockup size={28} />
        <p style={{ font: '500 13px/1.5 var(--g4-font-ui)', color: 'var(--g4-body-muted)', marginTop: 12 }}>
          Sistem 4a primitives · 6 components × 3 skins × light / Edisi Malam.
          Flagged QA route — not linked from the app.
        </p>
      </div>

      {['light', 'dark'].map((theme) => (
        <section
          key={theme}
          data-theme4a={theme}
          style={{
            background: 'var(--g4-bg)',
            color: 'var(--g4-text)',
            padding: '20px 16px 32px',
          }}
        >
          <h2
            style={{
              font: '800 22px/1.1 var(--g4-font-display)',
              letterSpacing: 'var(--g4-track-display)',
              color: 'var(--g4-text)',
              marginBottom: 4,
            }}
          >
            {theme === 'dark' ? 'Edisi Malam' : 'Light'}
          </h2>
          <p style={{ font: '500 12px/1.4 var(--g4-font-ui)', color: 'var(--g4-text-muted)', marginBottom: 18 }}>
            {theme === 'dark' ? 'auto 19:00–06:00 WIB' : 'auto 06:00–19:00 WIB'}
          </p>

          {/* ── 2. PickChip — all 5 states ────────────────────────── */}
          <Label>Pick chip · 5 states</Label>
          <Row>
            <PickChip state="default">2–1</PickChip>
            <PickChip state="selected">2–1 ✓</PickChip>
            <PickChip state="locked">2–1</PickChip>
            <PickChip state="correct">+3</PickChip>
            <PickChip state="missed">0</PickChip>
          </Row>

          {/* ── 6. LockBadge ──────────────────────────────────────── */}
          <Label>Lock badge · countdown → terkunci</Label>
          <Row>
            <LockBadge secondsLeft={9669} />
            <LockBadge secondsLeft={75} />
            <LockBadge locked />
          </Row>

          {/* ── 1. MatchCard, per skin ────────────────────────────── */}
          <Label>Match card · per sport skin</Label>
          {SKIN_KEYS.map((k) => {
            const s = skin(k);
            const isBasket = k === 'basket';
            const isMoto = k === 'motogp';
            return (
              <div key={k} style={{ marginBottom: 'var(--g4-gap-card)' }}>
                <MatchCard
                  skin={s}
                  eyebrow={`● ${s.label.toUpperCase()} · ${isMoto ? 'MANDALIKA' : isBasket ? 'NBA' : 'AFF SF1'}`}
                  timeLabel={isBasket ? '09:00 WIB' : '19:30 WIB'}
                  homeTeam={isMoto ? 'Martín' : isBasket ? 'Lakers' : 'Indonesia'}
                  awayTeam={isMoto ? 'Marquez' : isBasket ? 'Celtics' : 'Thailand'}
                  separator={isBasket ? '@' : 'vs'}
                  options={
                    isMoto
                      ? [{ value: 'P1', short: 'P1' }, { value: 'P2', short: 'P2' }, { value: 'P3', short: 'P3' }]
                      : isBasket
                        ? [{ value: 'H', short: 'LAL' }, { value: 'A', short: 'BOS' }]
                        : s.primaryLabels
                  }
                  selected={selected}
                  onSelect={setSelected}
                  starred={starred}
                  onToggleStar={() => setStarred((v) => !v)}
                />
              </div>
            );
          })}
          <Label>Match card · locked</Label>
          <MatchCard
            skin={skin('bola')}
            eyebrow="● BOLA · AFF SF1"
            timeLabel="FT"
            homeTeam="Indonesia"
            awayTeam="Thailand"
            options={skin('bola').primaryLabels}
            selected="H"
            locked
            starred
          />

          {/* ── 3. LeaderboardRow ────────────────────────────────── */}
          <Label>Leaderboard row · kamu + belum pick</Label>
          <div
            style={{
              background: 'var(--g4-surface)',
              border: '1px solid var(--g4-border)',
              borderRadius: 'var(--g4-radius-card)',
              overflow: 'hidden',
            }}
          >
            <LeaderboardRow rank={1} name="Bima" avatarColor="#1E3FBB" points={31} streak={6} />
            <LeaderboardRow rank={2} name="Sari" avatarColor="#7A2E8E" points={28} />
            <LeaderboardRow rank={3} name="Ade" points={24} streak={4} isYou />
            <LeaderboardRow rank={4} name="Doni" avatarColor="#9A8E7B" points={22} hasNotPicked />
            <LeaderboardRow rank={5} name="Rio" avatarColor="#1F7A3D" points={19} last />
          </div>

          {/* ── 4. LiveTile, per skin ────────────────────────────── */}
          <Label>Live tile · personal pick status</Label>
          <LiveTile
            skin={skin('bola')}
            live
            statusLabel="AFF SF2 · 74'"
            metaLabel="2.1k nonton"
            homeTeam="Vietnam"
            awayTeam="Indonesia"
            homeScore={0}
            awayScore={1}
            pickStatus="ahead"
            pickStatusLabel="pickmu unggul ✓ · 8 dari 11 grupmu benar sejauh ini"
            style={{ marginBottom: 'var(--g4-gap-card-sm)' }}
          />
          <LiveTile
            skin={skin('basket')}
            live
            statusLabel="NBA · Q3 04:12"
            homeTeam="Lakers"
            awayTeam="Celtics"
            homeScore={81}
            awayScore={88}
            pickStatus="behind"
            pickStatusLabel="pickmu tertinggal · Lakers menang"
            style={{ marginBottom: 'var(--g4-gap-card-sm)' }}
          />
          <LiveTile
            skin={skin('motogp')}
            statusLabel="MOTOGP · LAP 12/27"
            metaLabel="Mandalika"
            homeTeam="Martín"
            awayTeam="Bagnaia"
            homeScore="P1"
            awayScore="P2"
          />

          {/* ── 5. KabarCard ─────────────────────────────────────── */}
          <Label>Kabar card · hero + per skin</Label>
          <KabarCard
            skin={skin('bola')}
            hero
            category="TIMNAS"
            timeLabel="2 JAM LALU"
            headline="Timnas lolos semifinal usai drama adu penalti di Hanoi"
            summary="Ernando dua kali menepis. Semifinal lawan Thailand, Kamis 19:30 WIB."
            hookLabel="Udah pick semifinalmu? →"
            style={{ marginBottom: 'var(--g4-gap-card-sm)' }}
          />
          {SKIN_KEYS.map((k) => (
            <KabarCard
              key={k}
              skin={skin(k)}
              category={skin(k).label.toUpperCase()}
              timeLabel="4 JAM LALU"
              headline={
                k === 'basket'
                  ? 'Tatum 41 poin, Celtics jaga rekor kandang'
                  : k === 'motogp'
                    ? 'Martín pole di Mandalika, Marquez start P4'
                    : 'Pekan pembuka EPL: jadwal lengkap akhir pekan'
              }
              hookLabel={k === 'motogp' ? 'Pick podium →' : 'Udah pick? →'}
              style={{ marginBottom: 'var(--g4-gap-card-sm)' }}
            />
          ))}

          {/* ── Icons ─────────────────────────────────────────────── */}
          <Label>Icon set · inline SVG, Phosphor-bold style</Label>
          <Row>
            {[
              [IconMain, 'Main'], [IconGrup, 'Grup'], [IconSkor, 'Skor'], [IconKabar, 'Kabar'],
              [IconStar, 'star'], [IconLock, 'lock'], [IconShare, 'share'],
              [IconWhatsApp, 'WA'], [IconCopy, 'copy'], [IconChevronRight, 'next'],
              [IconMoon, 'malam'], [IconSun, 'siang'],
            ].map(([Ico, name]) => (
              <span
                key={name}
                style={{
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, color: 'var(--g4-text)', width: 54,
                }}
              >
                <Ico size={22} />
                <span style={{ font: '600 9px/1 var(--g4-font-ui)', color: 'var(--g4-text-muted)' }}>{name}</span>
              </span>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--g4-accent)' }}>
              <IconLiveDot size={8} />
              <span style={{ font: '700 10px/1 var(--g4-font-ui)' }}>2 live</span>
            </span>
          </Row>

          {/* ── Tab bar ───────────────────────────────────────────── */}
          <Label>Tab bar · Main · Grup · Skor · Kabar</Label>
          <div
            style={{
              display: 'flex',
              borderTop: 'var(--g4-rule-strong) solid var(--g4-text)',
              background: 'var(--g4-tabbar-bg)',
              padding: '10px 8px 14px',
              borderRadius: '0 0 var(--g4-radius-card) var(--g4-radius-card)',
            }}
          >
            {[[IconMain, 'Main', true], [IconGrup, 'Grup', false], [IconSkor, 'Skor', false], [IconKabar, 'Kabar', false]]
              .map(([Ico, name, active]) => (
                <span
                  key={name}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    color: active ? 'var(--g4-accent)' : 'var(--g4-muted)',
                  }}
                >
                  <Ico size={20} />
                  <span style={{ font: `${active ? 700 : 600} 11px/1 var(--g4-font-ui)` }}>{name}</span>
                </span>
              ))}
          </div>

          {/* ── Logo sizes ────────────────────────────────────────── */}
          <Label>Logo block · 12 / 15 / 26px</Label>
          <Row>
            <Logo4a size={12} />
            <Logo4a size={15} />
            <Logo4a size={26} />
          </Row>
        </section>
      ))}
    </div>
  );
}

function Label({ children }) {
  return (
    <div
      style={{
        font: '600 9px/1.2 var(--g4-font-ui)',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        color: 'var(--g4-text-muted)',
        margin: '22px 0 8px',
      }}
    >
      {children}
    </div>
  );
}

function Row({ children }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
  );
}

/** All skins, for anything that wants to iterate them (kept exported so
 *  the route is also a live check that sportSkins stays complete). */
export const ALL_SKINS = SPORT_SKINS;
