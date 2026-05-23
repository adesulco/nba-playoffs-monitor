import React from 'react';

// ============================================================================
// v0.65.0 — Pick'em icon set.
//
// Inline SVGs, no library dependency (CLAUDE.md #7 — no heavy deps on hot
// paths). All icons render at `size` × `size` with currentColor strokes/fills
// so they inherit from their consumer's text color.
//
// Ported from design-handoff-pickem/js/components.jsx + primitives.jsx.
// ============================================================================

function svgProps(size) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };
}

export function TrophyIcon({ size = 18 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4z" />
      <path d="M17 6h3a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3" />
      <path d="M7 6H4a1 1 0 0 0-1 1v1a3 3 0 0 0 3 3" />
    </svg>
  );
}

export function HomeIcon({ size = 18 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  );
}

export function TargetIcon({ size = 18 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function UsersIcon({ size = 18 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
      <path d="M16 7a3 3 0 0 1 0 6" />
      <path d="M19 21v-1a5 5 0 0 0-3-4.58" />
    </svg>
  );
}

export function UserIcon({ size = 18 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

export function BackIcon({ size = 22 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

export function ShareIcon({ size = 18 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v14" />
    </svg>
  );
}

export function BellIcon({ size = 18 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function SearchIcon({ size = 18 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function CheckIcon({ size = 14 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PlusIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  );
}

export function StarIcon({ filled = false, size = 18, color }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color || 'currentColor' : 'none'}
      stroke={color || 'currentColor'}
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function LockIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
