import React, { useState, useEffect, useRef } from 'react';
import { TEAM_META, COLORS as C } from '../lib/constants.js';

export default function TeamPicker({ selectedTeam, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const meta = selectedTeam ? TEAM_META[selectedTeam] : null;
  const sortedTeams = Object.keys(TEAM_META).sort();
  const byConf = {
    E: sortedTeams.filter((t) => TEAM_META[t].conf === 'E'),
    W: sortedTeams.filter((t) => TEAM_META[t].conf === 'W'),
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: meta ? meta.color : '#0f2038',
          border: `1px solid ${meta ? meta.color : C.line}`,
          borderRadius: 4,
          color: C.text,
          fontFamily: 'inherit',
          fontSize: 10.5,
          letterSpacing: 0.5,
          cursor: 'pointer',
          transition: 'all 0.15s',
          minWidth: 140,
        }}
      >
        {meta ? (
          <>
            <span style={{ fontWeight: 700, fontSize: 9.5, background: 'rgba(0,0,0,0.25)', padding: '2px 5px', borderRadius: 2 }}>
              {meta.abbr}
            </span>
            <span style={{ flex: 1, textAlign: 'left' }}>{selectedTeam.split(' ').slice(-1)[0]}</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 11 }}>★</span>
            <span style={{ flex: 1, textAlign: 'left', color: C.dim }}>Pick your team</span>
            <span style={{ fontSize: 9, color: C.dim }}>▼</span>
          </>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 280,
            background: '#0a1628',
            border: `1px solid ${C.line}`,
            borderRadius: 4,
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxHeight: 420,
            overflowY: 'auto',
          }}
        >
          {selectedTeam && (
            <div
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${C.lineSoft}`,
                fontSize: 10.5,
                color: C.red,
                cursor: 'pointer',
                letterSpacing: 0.3,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#0d1d34')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              × Clear selection
            </div>
          )}
          {['E', 'W'].map((conf) => (
            <div key={conf}>
              <div
                style={{
                  padding: '6px 12px',
                  fontSize: 9,
                  letterSpacing: 1.2,
                  color: C.dim,
                  background: '#081221',
                  borderBottom: `1px solid ${C.lineSoft}`,
                  fontWeight: 600,
                }}
              >
                {conf === 'E' ? 'EASTERN' : 'WESTERN'} CONFERENCE
              </div>
              {byConf[conf].map((name) => {
                const m = TEAM_META[name];
                const isSel = name === selectedTeam;
                return (
                  <div
                    key={name}
                    onClick={() => {
                      onSelect(name);
                      setOpen(false);
                    }}
                    style={{
                      padding: '7px 12px',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderBottom: `1px solid ${C.lineSoft}`,
                      background: isSel ? m.color : 'transparent',
                      color: isSel ? '#fff' : C.text,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSel) e.currentTarget.style.background = '#0d1d34';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSel) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 3,
                        background: m.color,
                        color: '#fff',
                        fontSize: 8.5,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {m.abbr}
                    </div>
                    <span style={{ flex: 1 }}>{name}</span>
                    {m.seed && (
                      <span style={{ fontSize: 9, color: isSel ? 'rgba(255,255,255,0.7)' : C.muted }}>
                        #{m.seed}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
