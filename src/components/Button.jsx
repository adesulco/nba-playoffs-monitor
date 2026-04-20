import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/AppContext.jsx';
import { resolveSportColor } from '../lib/sportColor.js';

/**
 * Button — shared CTA for Home, Recap, FangirBanner (step 4/9).
 *
 * Two variants, polymorphic render target:
 *   variant="primary" → filled accent bg, white|black text, hover-lift
 *   variant="ghost"   → transparent, 1px accent border, accent text
 *
 * Polymorphism (`as` prop):
 *   as="link"   (default if `to`)   → react-router <Link to={to}>
 *   as="a"      (default if `href`) → external anchor with target/rel
 *   as="button" (default otherwise) → <button onClick={onClick}>
 *   as="span"                       → presentational pill that inherits click
 *                                     from a parent <a> or <Link>. Required for
 *                                     FangirBanner where the whole banner is a
 *                                     single <a> and nested <a>s break semantics.
 *
 * Color resolution mirrors <Chip> and <SportIcon>: sportId wins, accent is
 * the raw-hex fallback. Primary variant picks white or black text based on
 * accent luminance (WCAG advisory — avoids unreadable white text on e.g.
 * bright yellow).
 *
 * Motion: hover lifts -1px and gains var(--e-1) shadow over 180ms
 * var(--ease-standard). Honored by the global prefers-reduced-motion block
 * which zeroes every transition-duration to 0.
 */

// Pick white or black text for a given accent bg. Luminance formula is the
// WCAG relative-luminance threshold — over 0.55 means the bg is bright
// enough that white text would fail AA.
function pickTextOn(accent) {
  if (!accent || !/^#[0-9a-f]{6}$/i.test(accent)) return '#fff';
  const r = parseInt(accent.slice(1, 3), 16) / 255;
  const g = parseInt(accent.slice(3, 5), 16) / 255;
  const b = parseInt(accent.slice(5, 7), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.55 ? '#0b0d12' : '#ffffff';
}

const BASE_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  lineHeight: 1,
  padding: '10px 16px',
  borderRadius: 'var(--r-pill)',
  border: '1px solid transparent',
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  transition: 'transform var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard), background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard), color var(--dur-base) var(--ease-standard)',
  willChange: 'transform',
};

const SIZE_STYLE = {
  sm: { fontSize: 10, padding: '7px 12px', gap: 5 },
  md: {}, // use BASE_STYLE defaults
};

function variantStyle(variant, color) {
  if (variant === 'ghost') {
    return {
      background: 'transparent',
      border: `1px solid ${color}`,
      color,
    };
  }
  // primary
  return {
    background: color,
    border: `1px solid ${color}`,
    color: pickTextOn(color),
  };
}

function hoverEnter(e, variant, color) {
  // subtle lift; shadow echoes the accent tint so the button feels "of its sport"
  e.currentTarget.style.transform = 'translateY(-1px)';
  if (variant === 'ghost') {
    e.currentTarget.style.background = `${color}14`;
  } else {
    e.currentTarget.style.boxShadow = `0 6px 18px -10px ${color}`;
  }
}
function hoverLeave(e, variant) {
  e.currentTarget.style.transform = 'translateY(0)';
  e.currentTarget.style.boxShadow = 'none';
  if (variant === 'ghost') {
    e.currentTarget.style.background = 'transparent';
  }
}

export default function Button({
  variant = 'primary',
  size = 'md',
  sportId,
  accent,
  to,
  href,
  onClick,
  as,
  label,
  leftIcon,
  rightIcon,
  disabled = false,
  ariaLabel,
  title,
  style,
  className,
  children,
}) {
  const { theme } = useApp();
  const color = resolveSportColor({ theme, sportId, accent }) || 'var(--accent)';

  // Resolve render element
  const el = as || (to ? 'link' : href ? 'a' : 'button');

  const mergedStyle = {
    ...BASE_STYLE,
    ...(SIZE_STYLE[size] || {}),
    ...variantStyle(variant, color),
    ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : null),
    ...style,
  };

  const content = (
    <>
      {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
      {label ?? children}
      {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </>
  );

  const commonProps = {
    className,
    style: mergedStyle,
    onMouseEnter: disabled ? undefined : (e) => hoverEnter(e, variant, color),
    onMouseLeave: disabled ? undefined : (e) => hoverLeave(e, variant),
    title,
    'aria-label': ariaLabel,
    'aria-disabled': disabled || undefined,
  };

  if (el === 'link') {
    return <Link to={to} onClick={onClick} {...commonProps}>{content}</Link>;
  }
  if (el === 'a') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        {...commonProps}
      >
        {content}
      </a>
    );
  }
  if (el === 'span') {
    // Presentational inside a parent <a> / <Link>. No onClick; parent handles it.
    return <span {...commonProps}>{content}</span>;
  }
  // default: <button>
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...commonProps}
    >
      {content}
    </button>
  );
}
