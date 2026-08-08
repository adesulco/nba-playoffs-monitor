/**
 * NicknameNudge4a — the v0.79.22 nickname nudge, restyled for Sistem 4a
 * surfaces (R2/R3).
 *
 * The klasemen renders `username || user_id.slice(0,8)`, so a user who
 * never set a nickname shows up as a raw hex prefix ("2280635b") — ugly on
 * a screenshot-and-share product. The original nudge lives on
 * PredictingHub, the OLD hub that MainShell replaces at the R3 flag flip;
 * without this port a new user would have no path to a nickname at all
 * after R3.
 *
 * Logic is copied verbatim from the proven original (gate on the raw
 * has_nickname flag, not `username`, which falls back to the email prefix
 * and would suppress the nudge forever; write via the Supabase client
 * under self-update RLS). Only the skin changed. Shares the SAME
 * localStorage key as the original, so a dismissal on either hub holds on
 * both — nagging twice reads as a bug.
 */

import { useEffect, useState } from 'react';
import { listProfile } from '../api.js';
import { supabase } from '../../lib/supabase.js';
import { trackEvent } from '../../lib/analytics.js';

const NICKNAME_NUDGE_KEY = 'gibol:pickem:nickname-nudge:v1';

export default function NicknameNudge4a({ user, competitionKey, lang = 'en', style, qaForce = false }) {
  const tx = (en, id) => (lang === 'id' ? id : en);
  // qaForce is for /dev/primitives only: the real visibility gate needs an
  // authed profile without a nickname, which the QA route can't fabricate.
  const [status, setStatus] = useState(qaForce ? 'needed' : 'idle'); // idle | needed | done
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (qaForce) return undefined;
    if (!user) { setStatus('done'); return undefined; }
    let dismissed = false;
    try { dismissed = localStorage.getItem(NICKNAME_NUDGE_KEY) === '1'; } catch { /* ignore */ }
    if (dismissed) { setStatus('done'); return undefined; }

    let cancelled = false;
    (async () => {
      const res = await listProfile({ competition: competitionKey, history_limit: 1 });
      if (cancelled) return;
      if (res.ok && res.profile && !res.profile.has_nickname) setStatus('needed');
      else setStatus('done');
    })();
    return () => { cancelled = true; };
  }, [user, competitionKey]);

  const dismiss = () => {
    try { localStorage.setItem(NICKNAME_NUDGE_KEY, '1'); } catch { /* ignore */ }
    setStatus('done');
  };

  const save = async () => {
    const next = value.trim();
    if (next.length < 2 || next.length > 20) {
      setError(tx('Name must be 2–20 characters.', 'Nama 2–20 karakter.'));
      return;
    }
    if (!user?.id) {
      setError(tx('Session expired — log in again.', 'Sesi habis — login lagi.'));
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('profiles').update({ nickname: next }).eq('id', user.id);
    setSaving(false);
    if (err) {
      setError(tx('Save failed. Try again.', 'Gagal simpan. Coba lagi.'));
      return;
    }
    try { localStorage.setItem(NICKNAME_NUDGE_KEY, '1'); } catch { /* ignore */ }
    trackEvent('pickem_nickname_set', { via: 'nudge-4a' });
    setStatus('done');
  };

  if (status !== 'needed') return null;

  return (
    <div style={{ ...S.card, ...style }}>
      <div style={S.row}>
        <div style={S.copy}>
          <strong>{tx('Set your display name', 'Pasang nama panggilanmu')}</strong>{' '}
          {tx(
            'so the standings show you — not a random code.',
            'biar klasemen nampilin kamu — bukan kode acak.'
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label={tx('Close', 'Tutup')} style={S.close}>
          ×
        </button>
      </div>
      <div style={S.inputRow}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
          maxLength={20}
          aria-label={tx('Display name', 'Nama panggilan')}
          placeholder={tx('Display name', 'Nama panggilan')}
          style={S.input}
        />
        <button type="button" onClick={save} disabled={saving} style={S.saveBtn}>
          {saving ? tx('Saving…', 'Menyimpan…') : tx('Use this name', 'Pakai nama ini')}
        </button>
      </div>
      {error && <div style={S.error}>{error}</div>}
    </div>
  );
}

const S = {
  card: {
    background: 'var(--g4-surface)',
    border: '2px solid var(--g4-text)',
    borderRadius: 'var(--g4-radius-card)',
    padding: '12px 14px',
    fontFamily: 'var(--g4-font-ui)',
  },
  row: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  copy: { font: '500 13px/1.5 var(--g4-font-ui)', color: 'var(--g4-text)' },
  close: {
    appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer',
    color: 'var(--g4-text-muted)', fontSize: 18, lineHeight: 1, padding: 2, flexShrink: 0,
  },
  inputRow: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  input: {
    flex: '1 1 150px',
    minWidth: 0,
    font: '500 14px/1.2 var(--g4-font-ui)',
    color: 'var(--g4-text)',
    background: 'var(--g4-bg)',
    border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-cta)',
    padding: '9px 12px',
  },
  saveBtn: {
    appearance: 'none',
    border: 'none',
    background: 'var(--g4-ink-block)',
    color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-cta)',
    padding: '9px 16px',
    font: '700 13px/1.2 var(--g4-font-ui)',
    cursor: 'pointer',
  },
  error: { marginTop: 6, font: '500 12px/1.4 var(--g4-font-ui)', color: 'var(--g4-lose)' },
};
