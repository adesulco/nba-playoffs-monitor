import React from 'react';

/**
 * <Board>{...}</Board>
 *
 * Top-level page wrapper used by v2 screens. Sets a consistent min-height,
 * applies the page bg, and scopes the `.v2` class so any v2-only CSS we
 * later add can be targeted without bleeding into v1.
 *
 * `padding` defaults to 0 so each screen's top bar can render flush against
 * the browser chrome.
 */
export default function Board({
  padding = 0,
  children,
  style,
  className = '',
  ...rest
}) {
  return (
    <div
      className={`v2 ${className}`.trim()}
      style={{
        background: 'var(--bg)',
        color: 'var(--ink)',
        minHeight: '100vh',
        padding,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
