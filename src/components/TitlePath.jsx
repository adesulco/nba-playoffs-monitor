import React from 'react';

/**
 * v0.79.0 — TitlePath stub.
 *
 * Komdigi de-risk 2026-05-23: the bracket-walk projection was driven by
 * championOdds from the now-blocked futures-odds provider. With no
 * statistical replacement yet (Elo-based "Prediksi Juara" is fast-follow),
 * the component renders null. NBADashboard already stopped passing
 * championOdds so the render path is dead; keeping the export here so
 * any straggler import still resolves.
 */
export default function TitlePath() {
  return null;
}
