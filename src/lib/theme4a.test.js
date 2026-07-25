import { describe, it, expect } from 'vitest';
import { wibHour, scheduledTheme } from './theme4a.js';
import { formatCountdown } from '../pickem/components/primitives4a.jsx';

/**
 * R1-7 / R1-4 pure-logic tests. The WIB window is the part worth
 * pinning: it must be timezone-independent (a fixed UTC+7 offset, no
 * DST), because "Edisi Malam" has to mean the same moment for a whole
 * grup regardless of where each member's device clock is set.
 */

// Build a UTC instant, then assert what WIB makes of it.
const utc = (h, m = 0) => new Date(Date.UTC(2026, 6, 25, h, m));

describe('wibHour', () => {
  it('adds the fixed +7 offset', () => {
    expect(wibHour(utc(0))).toBe(7);
    expect(wibHour(utc(5))).toBe(12);
  });

  it('wraps past midnight WIB', () => {
    expect(wibHour(utc(17))).toBe(0);  // 17:00Z = 00:00 WIB next day
    expect(wibHour(utc(20))).toBe(3);
    expect(wibHour(utc(23))).toBe(6);
  });
});

describe('scheduledTheme', () => {
  it('is dark from 19:00 WIB', () => {
    expect(scheduledTheme(utc(12))).toBe('dark');  // 19:00 WIB
    expect(scheduledTheme(utc(14))).toBe('dark');  // 21:00 WIB
    expect(scheduledTheme(utc(16, 59))).toBe('dark'); // 23:59 WIB
  });

  it('stays dark through the small hours', () => {
    expect(scheduledTheme(utc(17))).toBe('dark');  // 00:00 WIB
    expect(scheduledTheme(utc(22, 59))).toBe('dark'); // 05:59 WIB
  });

  it('is light from 06:00 to 18:59 WIB', () => {
    expect(scheduledTheme(utc(23))).toBe('light'); // 06:00 WIB
    expect(scheduledTheme(utc(0))).toBe('light');  // 07:00 WIB
    expect(scheduledTheme(utc(5))).toBe('light');  // 12:00 WIB
    expect(scheduledTheme(utc(11, 59))).toBe('light'); // 18:59 WIB
  });

  it('flips exactly at the boundaries, not around them', () => {
    expect(scheduledTheme(utc(11, 59))).toBe('light');
    expect(scheduledTheme(utc(12, 0))).toBe('dark');
    expect(scheduledTheme(utc(22, 59))).toBe('dark');
    expect(scheduledTheme(utc(23, 0))).toBe('light');
  });
});

describe('formatCountdown', () => {
  it('shows MM:SS under an hour', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(9)).toBe('00:09');
    expect(formatCountdown(75)).toBe('01:15');
    expect(formatCountdown(3599)).toBe('59:59');
  });

  it('shows HH:MM:SS at an hour and beyond', () => {
    expect(formatCountdown(3600)).toBe('01:00:00');
    expect(formatCountdown(9669)).toBe('02:41:09'); // the canvas value
  });

  it('degrades safely on junk rather than rendering NaN', () => {
    expect(formatCountdown(null)).toBe('00:00');
    expect(formatCountdown(undefined)).toBe('00:00');
    expect(formatCountdown(-5)).toBe('00:00');
    expect(formatCountdown(Infinity)).toBe('00:00');
  });
});
