import React from 'react';
import { COLORS as C } from '../lib/constants.js';

/**
 * PickerSheet — v0.13.8 Sprint 2 Theme C, Ship F.
 *
 * Wrapper that renders its children as a bottom-sheet on mobile and
 * an absolute-positioned popover on desktop. Used by all five sport
 * pickers (TeamPicker NBA, EPLClubPicker, ConstructorPicker,
 * TennisPlayerPicker, SuperLeagueClubPicker) so the mobile picker
 * UX stays identical across sports.
 *
 * Pre-extraction (v0.13.7) the bottom-sheet styles were inlined in
 * TeamPicker only. Porting that pattern to the other four pickers
 * needs ~30 lines of JS + a scrim per picker, so a tiny shared shell
 * pays for itself immediately.
 *
 * Mobile shell:
 *   - Fixed bottom-sheet, full width, slide-up via top-radius.
 *   - 70vh maxHeight, vertically scrollable inside.
 *   - Drag-handle affordance + scrim backdrop.
 *   - Honours iOS home-indicator safe-area.
 *
 * Desktop shell:
 *   - Absolute popover, anchored beneath the trigger button.
 *   - 280 px width by default (override via `desktopWidth`).
 *   - Caller is responsible for `position: relative` on the parent.
 *
 * Props:
 *   isMobile     — bool from useIsMobile(); decides which shell renders
 *   open         — bool; controls visibility
 *   onClose      — () => void; called when scrim is tapped
 *   ariaLabel    — string for the listbox role
 *   desktopWidth — px (default 280); only applies on desktop
 *   children     — picker option list (rows, headers, etc.)
 */
export default function PickerSheet({
  isMobile,
  open,
  onClose,
  ariaLabel,
  desktopWidth = 280,
  children,
}) {
  if (!open) return null;
  return (
    <>
      {/* Scrim — mobile only. Tap closes the sheet. */}
      {isMobile && (
        <div
          aria-hidden="true"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 99,
          }}
        />
      )}
      <div
        role="listbox"
        aria-label={ariaLabel}
        style={isMobile ? {
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: C.panel,
          borderTop: `1px solid ${C.line}`,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          zIndex: 100,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
          maxHeight: '70vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        } : {
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          width: desktopWidth,
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 4,
          zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxHeight: 420,
          overflowY: 'auto',
        }}
      >
        {/* Drag handle — mobile-only visual affordance. */}
        {isMobile && (
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 4,
              background: C.line,
              borderRadius: 2,
              margin: '8px auto 4px',
            }}
          />
        )}
        {children}
      </div>
    </>
  );
}
