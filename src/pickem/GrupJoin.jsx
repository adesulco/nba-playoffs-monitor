import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import { PickemBtn, EmptyState } from './components/social.jsx';
import { joinGrup, listMyGrups } from './api.js';
import { supabase } from '../lib/supabase.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';

// ============================================================================
// v0.68.0 — Grup join (Pick'em P3).
//
// /pickem/grup/join?code=ABCD  → resolves the invite_code to a league_id
//                                via Supabase + calls joinGrup()
// /pickem/grup/:id/join?code=  → same, with the league_id known upfront
//
// Magic-link landing page after a WhatsApp deep-link tap. If the user
// isn't authed yet, we send them through /login?next=<this URL> first;
// the magic link returns them here, the join fires, then we redirect to
// /pickem/grup/:id.
//
// Resolves the (code → league_id) via a direct Supabase select with the
// browser anon client (leagues row visible to anon for invite-code
// validation, the existing 0002 RLS already permits this read).
// ============================================================================

export default function GrupJoin() {
  return (
    <AuthProvider>
      <GrupJoinInner />
    </AuthProvider>
  );
}

function GrupJoinInner() {
  const { id: leagueIdParam } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const code = (params.get('code') || '').trim().toUpperCase();

  const [status, setStatus] = useState('idle'); // 'idle' | 'resolving' | 'joining' | 'done' | 'error' | 'already'
  const [grup, setGrup] = useState(null);
  const [error, setError] = useState(null);
  const ranRef = useRef(false);

  // If no code in the URL, bail with a friendly empty state.
  const validCode = useMemo(() => code.length >= 4 && code.length <= 12, [code]);

  useEffect(() => {
    if (authLoading) return;
    if (!validCode) {
      setStatus('error');
      setError('Kode undangan nggak valid.');
      return;
    }
    if (!user) {
      // Save the join intent in the magic-link redirect — coming back here
      // after auth replays the same URL.
      const next = encodeURIComponent(
        leagueIdParam
          ? `/pickem/grup/${leagueIdParam}/join?code=${encodeURIComponent(code)}`
          : `/pickem/grup/join?code=${encodeURIComponent(code)}`,
      );
      navigate(`/login?next=${next}`, { replace: true });
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;
    (async () => {
      setStatus('resolving');
      // Resolve (code → leagueId) via direct Supabase select.
      let leagueId = leagueIdParam;
      let league;
      if (leagueId) {
        const { data } = await supabase
          .from('leagues')
          .select('id, name, invite_code, visibility, color')
          .eq('id', leagueId)
          .maybeSingle();
        league = data || null;
      } else {
        const { data } = await supabase
          .from('leagues')
          .select('id, name, invite_code, visibility, color')
          .eq('invite_code', code)
          .maybeSingle();
        league = data || null;
        if (league) leagueId = league.id;
      }
      if (!league || !leagueId) {
        setStatus('error');
        setError('Grup dengan kode ini nggak ketemu. Cek kode-nya sama si pembagi.');
        return;
      }
      if (league.invite_code !== code) {
        setStatus('error');
        setError('Kode nggak cocok dengan grup ini.');
        return;
      }
      setGrup(league);

      // Already a member?
      const my = await listMyGrups();
      if (my.ok && my.grups?.find((g) => g.id === leagueId)) {
        setStatus('already');
        return;
      }

      setStatus('joining');
      const res = await joinGrup({ leagueId, inviteCode: code });
      if (!res.ok) {
        setStatus('error');
        setError(res.error || 'Gagal masuk grup');
        return;
      }
      setStatus('done');
      // Brief delay so the user sees the "Berhasil masuk" state before navigating.
      setTimeout(() => navigate(`/pickem/grup/${leagueId}`, { replace: true }), 700);
    })();
  }, [code, leagueIdParam, user, authLoading, navigate, validCode]);

  return (
    <PickemRoot active="grup">
      <div style={{ padding: '32px 16px', maxWidth: 480, margin: '0 auto' }}>
        {status === 'resolving' && (
          <Center title="Lagi cek kode…" body={`Kode: ${code}`} />
        )}
        {status === 'joining' && (
          <Center title={`Masuk ${grup?.name || 'grup'}…`} body="Sebentar lagi." />
        )}
        {status === 'done' && (
          <Center title="Berhasil masuk" body={`Selamat datang di ${grup?.name || 'grup'}.`} tone="up" />
        )}
        {status === 'already' && (
          <EmptyState
            title="Kamu sudah anggota grup ini"
            body={`Langsung buka grup ${grup?.name || ''}.`}
            action={
              <PickemBtn
                variant="primary"
                onClick={() => navigate(`/pickem/grup/${grup?.id || leagueIdParam}`, { replace: true })}
              >
                Buka grup
              </PickemBtn>
            }
          />
        )}
        {status === 'error' && (
          <EmptyState
            tone="error"
            title="Gagal masuk grup"
            body={error || 'Ada yang salah. Coba lagi.'}
            action={
              <PickemBtn variant="primary" onClick={() => navigate('/pickem/grup')}>
                Kembali
              </PickemBtn>
            }
          />
        )}
      </div>
    </PickemRoot>
  );
}

function Center({ title, body, tone }) {
  const color = tone === 'up' ? 'var(--p-up)' : 'var(--ink-1)';
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '24px 16px',
        background: 'var(--bg-raised)',
        border: '1px solid var(--line-1)',
        borderRadius: 'var(--r-3)',
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          color,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {body && <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>{body}</div>}
    </div>
  );
}
