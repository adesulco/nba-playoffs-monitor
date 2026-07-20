import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import { PickemBtn, SegmentedPicker } from './components/social.jsx';
import { createGrup } from './api.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { usePickemCompetition } from './useCompetition.jsx';
import { usePickemT } from './i18n.js';

// ============================================================================
// v0.68.0 — Grup create (Pick'em P3).
//
// /pickem/grup/new — form to create a new grup. Sends the new P3
// columns (visibility / competition / enabled_modes / theme / color)
// to the extended create-league endpoint. On success, navigates to
// /pickem/grup/:id where the InviteSheet auto-pops once for sharing.
// ============================================================================

// v0.79.1 — COMPETITION now reads from usePickemCompetition() at render time.

const DEFAULT_MODES = { match: true, jagoan: true, upset: true, bracket: true, survivor: false };

export default function GrupCreate() {
  return (
    <AuthProvider>
      <GrupCreateInner />
    </AuthProvider>
  );
}

function GrupCreateInner() {
  const { user, loading: authLoading } = useAuth();
  const { competition } = usePickemCompetition();
  const tx = usePickemT();
  const COMPETITION = competition.key;
  const VISIBILITY_OPTIONS = [
    { k: 'private', l: tx('Private', 'Pribadi') },
    { k: 'public',  l: tx('Public', 'Publik') },
  ];
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [modes, setModes] = useState(DEFAULT_MODES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?next=' + encodeURIComponent('/pickem/grup/new'), { replace: true });
    }
  }, [user, authLoading, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError(tx('Group name needs at least 2 characters.', 'Nama grup minimal 2 karakter.'));
      return;
    }
    if (name.trim().length > 60) {
      setError(tx('Group name can be at most 60 characters.', 'Nama grup maksimal 60 karakter.'));
      return;
    }
    setSubmitting(true);
    const res = await createGrup({
      name: name.trim(),
      visibility,
      competition: COMPETITION,
      enabled_modes: modes,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || tx('Failed to create group', 'Gagal membuat grup'));
      return;
    }
    navigate(`/pickem/grup/${res.id}?welcome=1`);
  };

  return (
    <PickemRoot active="grup">
      <div style={{ padding: '20px 16px 32px', maxWidth: 560, margin: '0 auto' }}>
        <header style={{ marginBottom: 18 }}>
          <div className="p-eyebrow" style={{ marginBottom: 6 }}>{tx('CREATE A GROUP', 'BIKIN GRUP BARU')}</div>
          <h1 className="p-display-sm" style={{ marginBottom: 4, color: 'var(--ink-1)' }}>
            {tx('Your group, your rules', 'Grup kamu, aturanmu')}
          </h1>
          <p style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-ui-pickem)', fontSize: 13 }}>
            {tx('Create it first, invite friends over WhatsApp after.', 'Bikin dulu, ajak teman lewat WhatsApp setelahnya.')}
          </p>
        </header>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field
            label={tx('Group name', 'Nama grup')}
            hint={tx('e.g. Office Pool, Garuda Faithful, Apt 17 Crew', 'Misal: Grup Kantor, Garuda Faithful, Anak Kosan 17')}
          >
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tx('Name your group', 'Beri nama grupmu')}
              maxLength={60}
              required
              aria-invalid={!!error && name.trim().length === 0}
              style={inputStyle}
            />
          </Field>

          <Field label={tx('Type', 'Tipe')} hint={tx('Private = only people with the code can join. Public = listed in the public groups hub.', 'Pribadi = hanya yang punya kode bisa masuk. Publik = ditampilkan di hub grup publik.')}>
            <SegmentedPicker
              items={VISIBILITY_OPTIONS}
              active={visibility}
              onChange={setVisibility}
            />
          </Field>

          <Field label={tx('Modes that count', 'Mode yang dihitung')} hint={tx('Check the modes that count toward this group’s leaderboard.', 'Centang mode yang ikut dihitung untuk leaderboard grup ini.')}>
            <ModesPicker value={modes} onChange={setModes} />
          </Field>

          {error && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--r-2)',
                background: 'var(--p-down-wash)',
                color: 'var(--p-down)',
                fontSize: 13,
                fontFamily: 'var(--font-ui-pickem)',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <PickemBtn type="submit" variant="primary" disabled={submitting}>
              {submitting ? tx('Creating…', 'Membuat…') : tx('Create group', 'Bikin grup')}
            </PickemBtn>
            <PickemBtn type="button" variant="ghost" onClick={() => navigate('/pickem/grup')}>
              {tx('Cancel', 'Batal')}
            </PickemBtn>
          </div>
        </form>
      </div>
    </PickemRoot>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-ui-pickem)' }}>
      <span className="p-eyebrow" style={{ color: 'var(--ink-2)' }}>
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ color: 'var(--ink-3)', fontSize: 12, lineHeight: 1.4 }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function ModesPicker({ value, onChange }) {
  const tx = usePickemT();
  const MODES = [
    { key: 'match',    label: tx('Match predictions', 'Prediksi pertandingan') },
    { key: 'jagoan',   label: tx('Banker (jagoan)', 'Jagoan (banker)') },
    { key: 'upset',    label: tx('Upset bonus', 'Bonus upset') },
    { key: 'bracket',  label: tx('Tournament bracket', 'Bracket turnamen') },
    { key: 'survivor', label: tx('Survivor', 'Survivor') },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {MODES.map((m) => (
        <label
          key={m.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--line-1)',
            borderRadius: 'var(--r-2)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <input
            type="checkbox"
            checked={value[m.key] === true}
            onChange={(e) => onChange({ ...value, [m.key]: e.target.checked })}
            style={{ accentColor: 'var(--pickem-orange)' }}
          />
          <span>{m.label}</span>
        </label>
      ))}
    </div>
  );
}

const inputStyle = {
  background: 'var(--bg-raised)',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-2)',
  padding: '10px 14px',
  color: 'var(--ink-1)',
  fontFamily: 'var(--font-ui-pickem)',
  fontSize: 15,
  outline: 'none',
};
