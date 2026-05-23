import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import { LeaderboardRow, PickemBtn, EmptyState } from './components/social.jsx';
import InviteSheet from './components/InviteSheet.jsx';
import { listLeaderboard, listMyGrups } from './api.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';

// ============================================================================
// v0.68.0 — Grup detail (Pick'em P3).
//
// /pickem/grup/:id — the grup's leaderboard with sharing affordances.
// Auto-pops the InviteSheet once on ?welcome=1 (just-created grups land
// here with that query param so the user immediately sees how to share).
// The "1 anggota" empty state nudges sharing — the §8.3 viral loop hinges
// on this moment.
// ============================================================================

export default function GrupDetail() {
  return (
    <AuthProvider>
      <GrupDetailInner />
    </AuthProvider>
  );
}

function GrupDetailInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();

  const [grup, setGrup] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?next=' + encodeURIComponent(`/pickem/grup/${id}`), { replace: true });
    }
  }, [user, authLoading, id, navigate]);

  // Load the user's grups so we can pull this grup's metadata (name,
  // invite_code, etc.) — there's no dedicated `get-grup` endpoint in v1
  // since list-grups already returns everything cheaply.
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [gRes, bRes] = await Promise.all([
        listMyGrups(),
        listLeaderboard({ scope: 'league', league_id: id, limit: 100 }),
      ]);
      if (gRes.ok) {
        const match = (gRes.grups || []).find((g) => g.id === id);
        setGrup(match || null);
        if (!match) setError('not_a_member');
      }
      if (!bRes.ok) {
        setError((prev) => prev || bRes.error);
      } else {
        setRows(bRes.rows || []);
      }
      setLoading(false);
    })();
  }, [user, id]);

  // Auto-pop InviteSheet once on ?welcome=1 (just-created grups).
  useEffect(() => {
    if (params.get('welcome') === '1' && grup) {
      setInviteOpen(true);
      const next = new URLSearchParams(params);
      next.delete('welcome');
      setParams(next, { replace: true });
    }
  }, [grup, params, setParams]);

  const shareUrl = useMemo(() => {
    if (!grup) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.gibol.co';
    return `${origin}/pickem/grup/join?code=${encodeURIComponent(grup.invite_code || '')}`;
  }, [grup]);

  if (!user || loading) {
    return (
      <PickemRoot active="grup">
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          Memuat grup…
        </div>
      </PickemRoot>
    );
  }

  if (!grup) {
    return (
      <PickemRoot active="grup">
        <div style={{ padding: '20px 16px', maxWidth: 560, margin: '0 auto' }}>
          <EmptyState
            tone="error"
            title="Grup nggak ditemukan"
            body="Mungkin sudah dihapus, atau kamu belum jadi anggotanya."
            action={
              <PickemBtn variant="primary" onClick={() => navigate('/pickem/grup')}>
                Kembali ke daftar grup
              </PickemBtn>
            }
          />
        </div>
      </PickemRoot>
    );
  }

  const memberCount = grup.member_count || rows.length || 1;
  const oneMember = memberCount <= 1;

  return (
    <PickemRoot active="grup">
      <div style={{ padding: '20px 16px 32px', maxWidth: 720, margin: '0 auto' }}>
        <Header
          grup={grup}
          memberCount={memberCount}
          onShare={() => setInviteOpen(true)}
        />

        {oneMember ? (
          <EmptyState
            icon="✦"
            title="Grup masih sendirian"
            body="Ajak teman pakai kode atau link WhatsApp — leaderboard hidup setelah ada 2+ anggota."
            action={
              <PickemBtn variant="primary" onClick={() => setInviteOpen(true)}>
                Bagikan grup
              </PickemBtn>
            }
          />
        ) : (
          <div
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--line-1)',
              borderRadius: 'var(--r-3)',
              overflow: 'hidden',
            }}
          >
            {rows.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                Belum ada hasil yang dihitung. Tunggu pertandingan pertama selesai.
              </div>
            ) : (
              rows.map((row) => (
                <LeaderboardRow
                  key={`${row.user_id}-${row.rank}`}
                  row={row}
                  you={user?.id === row.user_id}
                />
              ))
            )}
          </div>
        )}

        {error && error !== 'not_a_member' && (
          <div
            role="alert"
            style={{
              marginTop: 16,
              padding: '10px 12px',
              borderRadius: 'var(--r-2)',
              background: 'var(--p-down-wash)',
              color: 'var(--p-down)',
              fontSize: 13,
              fontFamily: 'var(--font-ui-pickem)',
            }}
          >
            {String(error)}
          </div>
        )}
      </div>

      <InviteSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        grup={grup}
        shareUrl={shareUrl}
      />
    </PickemRoot>
  );
}

function Header({ grup, memberCount, onShare }) {
  return (
    <header style={{ marginBottom: 18 }}>
      <div className="p-eyebrow" style={{ marginBottom: 6 }}>
        GRUP {grup.visibility === 'public' ? '· PUBLIK' : '· PRIBADI'}
      </div>
      <h1
        className="p-display-sm"
        style={{ marginBottom: 4, color: 'var(--ink-1)', wordBreak: 'break-word' }}
      >
        {grup.name}
      </h1>
      <p
        style={{
          color: 'var(--ink-2)',
          fontFamily: 'var(--font-ui-pickem)',
          fontSize: 13,
          marginBottom: 12,
        }}
      >
        {memberCount} anggota
        {grup.my_rank ? ` · kamu di #${grup.my_rank}` : ''}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <PickemBtn variant="primary" onClick={onShare}>
          Bagikan grup
        </PickemBtn>
        <PickemBtn variant="ghost" onClick={() => window.location.assign('/pickem')}>
          Buka prediksi
        </PickemBtn>
      </div>
    </header>
  );
}
