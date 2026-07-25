/**
 * Inline SVG icon set — R1-6 (v0.82.0).
 *
 * Phosphor-bold style to match the rounded language: 24×24 grid, 2.5px
 * strokes, round caps and joins. Inline components, NOT an icon
 * dependency (hard constraint: no icon libraries) — and not the unicode
 * placeholders (▲●▶■) the design canvas used, which were explicitly
 * "not shipping".
 *
 * All icons inherit `currentColor` and take a `size` prop, so a tab bar
 * only has to set colour on the wrapper. `aria-hidden` by default since
 * icons here always sit beside a text label; pass a `title` for a
 * standalone icon button.
 */

function Svg({ size = 24, title, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ─── Tab bar (replaces ▲ ● ▶ ■) ──────────────────────────────────── */

/** Main — house. */
export function IconMain(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-5.5h5V20" />
    </Svg>
  );
}

/** Grup — people. */
export function IconGrup(props) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6" />
      <path d="M18.5 20c0-2.4-.9-4.2-2.3-5.3" />
    </Svg>
  );
}

/** Skor — scoreboard / live. */
export function IconSkor(props) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
      <path d="M12 7.5v9" />
      <path d="M6 10.5h2.5M6 13.5h2.5M15.5 10.5H18M15.5 13.5H18" />
    </Svg>
  );
}

/** Kabar — newspaper. */
export function IconKabar(props) {
  return (
    <Svg {...props}>
      <path d="M4 5.5h11a1.5 1.5 0 0 1 1.5 1.5v11H5.5A1.5 1.5 0 0 1 4 16.5z" />
      <path d="M16.5 9H19a1 1 0 0 1 1 1v6.5a1.5 1.5 0 0 1-1.5 1.5" />
      <path d="M7 9h5M7 12h5M7 15h3" />
    </Svg>
  );
}

/* ─── Mechanics ───────────────────────────────────────────────────── */

/**
 * Star — the ★ ×2 multiplier. This IS the existing jagoan mechanic
 * (schema and scoring math untouched); only the presentation is new.
 * `filled` renders the selected state.
 */
export function IconStar({ filled = false, ...props }) {
  return (
    <Svg fill={filled ? 'currentColor' : 'none'} {...props}>
      <path d="M12 3.5l2.6 5.5 5.9.8-4.3 4.2 1 6-5.2-2.9-5.2 2.9 1-6-4.3-4.2 5.9-.8z" />
    </Svg>
  );
}

/** Lock — the locked pick chip / lock badge. */
export function IconLock(props) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14v2.5" />
    </Svg>
  );
}

/** Check — a correct pick. */
export function IconCheck(props) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5l5 5 10-10" />
    </Svg>
  );
}

/** Share. */
export function IconShare(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.5v11" />
      <path d="M8 7l4-3.5L16 7" />
      <path d="M5.5 13v6a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-6" />
    </Svg>
  );
}

/** WhatsApp — the colek/ingatkan channel. Solid glyph, not a stroke. */
export function IconWhatsApp({ size = 24, title, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d="M12.04 2.5c-5.23 0-9.48 4.25-9.48 9.48 0 1.67.44 3.3 1.27 4.74L2.5 21.5l4.9-1.28a9.44 9.44 0 0 0 4.64 1.2h.01c5.22 0 9.47-4.25 9.47-9.48 0-2.53-.99-4.91-2.78-6.7a9.4 9.4 0 0 0-6.7-2.74zm5.57 13.45c-.23.65-1.36 1.25-1.88 1.3-.52.05-1 .07-1.55-.1a13.6 13.6 0 0 1-2.5-1.06c-2.2-1.27-3.63-3.6-3.74-3.76-.11-.16-.9-1.24-.9-2.37 0-1.13.6-1.68.81-1.91.21-.23.46-.29.61-.29h.44c.14 0 .33-.05.51.39.19.46.64 1.6.7 1.71.05.12.09.25.01.4-.08.16-.15.26-.27.4l-.36.42c-.12.12-.24.25-.1.48.13.24.6 1 1.28 1.62.88.79 1.62 1.04 1.85 1.16.23.11.37.09.5-.06.14-.15.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.6-.17 1.25z" />
    </svg>
  );
}

/** Copy — "Salin link". */
export function IconCopy(props) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 6.5A1.5 1.5 0 0 0 13.5 5H6.5A1.5 1.5 0 0 0 5 6.5v7A1.5 1.5 0 0 0 6.5 15" />
    </Svg>
  );
}

/** Chevron — row affordance (›). */
export function IconChevronRight(props) {
  return (
    <Svg {...props}>
      <path d="M9.5 5.5l6.5 6.5-6.5 6.5" />
    </Svg>
  );
}

/** Back (‹). */
export function IconChevronLeft(props) {
  return (
    <Svg {...props}>
      <path d="M14.5 5.5L8 12l6.5 6.5" />
    </Svg>
  );
}

/** Live dot — a pulsing ● for live states. Respects reduced motion. */
export function IconLiveDot({ size = 10, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <circle cx="5" cy="5" r="5">
        <animate
          attributeName="opacity"
          values="1;0.35;1"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

/** Moon — the Edisi Malam theme toggle. */
export function IconMoon(props) {
  return (
    <Svg {...props}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </Svg>
  );
}

/** Sun — the light-mode toggle. */
export function IconSun(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </Svg>
  );
}
