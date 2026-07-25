/**
 * AFF → EPL rollover banner — R0-6 (v0.81.1).
 *
 * The WAP-compounding moment: a grup that played the AFF knockouts is a
 * warm, proven group of friends. Rather than let it die when the
 * tournament ends, one tap re-creates it for the EPL season (same name,
 * same commissioner) and hands back an invite link to re-share on WA.
 *
 * Deliberately plain: this is R0's functional version. R2 reskins it in
 * the Sistem 4a grammar (scarlet nudge banner + WA pill). Copy is
 * kamu-register, EN-default with ID keys, prestige framing only.
 *
 * No new endpoint — reuses the create-league dispatcher action through
 * the src/pickem/api.js seam (createGrup), which already accepts a
 * `competition` key. Tracks pickem_rollover_accept via evRolloverAccept.
 *
 * Renders nothing unless ALL of:
 *   - the user commissions ≥1 grup in `fromCompetition`
 *   - that grup has no counterpart already in `toCompetition`
 *   - `toCompetition` is inside its opening window
 */

import { useState, useMemo } from 'react';
import { createGrup } from '../api.js';
import { COMPETITIONS } from '../competitions.js';
import { evRolloverAccept } from '../../lib/pickemEvents.js';
import { useApp } from '../../lib/AppContext.jsx';

export default function RolloverBanner({
  grups = [],
  userId,
  fromCompetition = 'AFF2026',
  toCompetition = 'EPL-2026-27',
  onRolledOver,
}) {
  // EN default + ID key, per the voice rule. The app-wide lang toggle
  // (AppContext, default 'en') decides which one renders.
  const { lang } = useApp();
  const tx = (en, id) => (lang === 'id' ? id : en);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const from = COMPETITIONS[fromCompetition];
  const to = COMPETITIONS[toCompetition];

  // Candidate = a grup I own in `from` with no same-named grup in `to`.
  const candidate = useMemo(() => {
    if (!userId) return null;
    const targetNames = new Set(
      grups.filter((g) => g.competition === toCompetition).map((g) => (g.name || '').toLowerCase())
    );
    return grups.find(
      (g) =>
        g.competition === fromCompetition &&
        g.owner_id === userId &&
        !targetNames.has((g.name || '').toLowerCase())
    ) || null;
  }, [grups, userId, fromCompetition, toCompetition]);

  // Only pitch once the destination season is actually near/open.
  const toIsOpening = useMemo(() => {
    if (!to?.openAt) return false;
    const opens = new Date(to.openAt).getTime();
    // Show from 3 weeks before EPL opens — that overlaps the AFF knockouts,
    // which is exactly when both competitions are live and the pitch lands.
    return Date.now() >= opens - 21 * 86400000;
  }, [to]);

  if (!candidate || !toIsOpening || !from || !to) return null;

  async function handleRollover() {
    setBusy(true);
    setError(null);
    // createGrup resolves { ok: false, error } rather than throwing; the
    // success body is flat ({ ok, id, invite_code, … }).
    const res = await createGrup({
      name: candidate.name,
      competition: toCompetition,
      visibility: candidate.visibility || 'private',
      ...(candidate.enabled_modes ? { enabled_modes: candidate.enabled_modes } : {}),
      ...(candidate.theme ? { theme: candidate.theme } : {}),
      ...(candidate.color ? { color: candidate.color } : {}),
    });
    setBusy(false);
    if (!res?.ok) {
      setError(
        res?.error === 'not_authenticated'
          ? tx('Please sign in first', 'Masuk dulu ya')
          : String(res?.error || tx('Could not create the grup', 'Gagal membuat grup'))
      );
      return;
    }
    setCreated(res);
    evRolloverAccept({ from: fromCompetition, to: toCompetition });
    if (onRolledOver) onRolledOver(res);
  }

  const inviteUrl = created?.invite_code
    ? `https://www.gibol.co/g/${created.invite_code}`
    : null;

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(tx('Could not copy the link', 'Gagal menyalin link'));
    }
  }

  const waHref = inviteUrl
    ? `https://wa.me/?text=${encodeURIComponent(
        tx(
          `${candidate.name} continues in the ${to.labelLong}. Join here: ${inviteUrl}`,
          `${candidate.name} lanjut di ${to.labelLong}. Gabung di sini: ${inviteUrl}`
        )
      )}`
    : null;

  return (
    <div style={S.wrap}>
      {!created ? (
        <>
          <div style={S.title}>
            {tx(
              `${from.label} is wrapping up — keep ${candidate.name} going?`,
              `${from.label} hampir selesai — lanjutkan ${candidate.name}?`
            )}
          </div>
          <div style={S.body}>
            {tx(
              `One tap re-creates your grup for the ${to.labelLong}. Same name, same members to invite — a fresh season of picks.`,
              `Satu tap bikin ulang grupmu untuk ${to.labelLong}. Nama sama, anggota sama buat diundang — musim pick yang baru.`
            )}
          </div>
          {error && <div style={S.error}>{error}</div>}
          <button type="button" onClick={handleRollover} disabled={busy} style={S.cta}>
            {busy
              ? tx('Creating…', 'Membuat…')
              : tx(`Continue in ${to.label}`, `Lanjut ke ${to.label}`)}
          </button>
        </>
      ) : (
        <>
          <div style={S.title}>
            {tx(
              `${candidate.name} is ready for ${to.label}`,
              `${candidate.name} siap untuk ${to.label}`
            )}
          </div>
          <div style={S.body}>
            {tx(
              'Share the link so everyone joins the new season.',
              'Bagikan linknya biar semua ikut musim baru.'
            )}
          </div>
          {inviteUrl && <div style={S.link}>{inviteUrl}</div>}
          {error && <div style={S.error}>{error}</div>}
          <div style={S.row}>
            <button type="button" onClick={handleCopy} style={S.secondary}>
              {copied ? tx('Copied', 'Tersalin') : tx('Copy link', 'Salin link')}
            </button>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" style={S.cta}>
                {tx('Share on WhatsApp', 'Bagikan di WhatsApp')}
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Plain styling on existing tokens — R2 replaces this with the 4a
// scarlet nudge banner.
const S = {
  wrap: {
    border: '1px solid var(--p-line, #e3ddd0)',
    borderRadius: 14,
    padding: '14px 16px',
    background: 'var(--p-card, #fff)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  title: { font: '700 15px/1.25 inherit', color: 'var(--p-ink, #171310)' },
  body: { font: '500 13px/1.45 inherit', color: 'var(--p-muted, #6E6455)' },
  link: {
    font: '600 12px/1.3 ui-monospace, monospace',
    color: 'var(--p-muted, #6E6455)',
    wordBreak: 'break-all',
  },
  error: { font: '600 12px/1.3 inherit', color: '#A31F12' },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  cta: {
    appearance: 'none',
    border: 'none',
    borderRadius: 12,
    padding: '11px 18px',
    font: '700 14px/1 inherit',
    color: '#fff',
    background: 'var(--pickem-orange, #D92D1C)',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  },
  secondary: {
    appearance: 'none',
    borderRadius: 12,
    padding: '11px 18px',
    font: '700 14px/1 inherit',
    border: '1.5px solid var(--p-ink, #171310)',
    background: 'transparent',
    color: 'var(--p-ink, #171310)',
    cursor: 'pointer',
  },
};
