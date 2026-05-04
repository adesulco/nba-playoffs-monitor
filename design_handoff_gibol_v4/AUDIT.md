# Gibol Redesign v4 — final audit

> Audit run before handoff to Claude Code. Files reviewed: `Gibol Redesign v4.html`, `v4/*.jsx`, plus the v3 primitives/shell that v4 builds on.

## Verdict

**Ship the visual design with confidence; ship the Tweaks panel with one fix.** The four screens render cleanly, the design system is consistent, and the code is well-organized. There is **one real bug** in the Tweaks panel (bilingual toggle is a no-op) and a few minor handoff cleanups worth doing before passing to engineering.

---

## ✅ What's solid

| Area | Notes |
|---|---|
| **Visual rendering** | All 4 screens render with no console errors. 5 boards present (intro + 4 designs). Imagery is committed via per-sport SVG illustrations. |
| **Design system consistency** | Single `.gb3` scope with CSS custom properties drives type, color, density, accent, and theme. v4 extends v3 cleanly via attribute selectors (`[data-theme="light"]`, `[data-density="compact"]`, `[data-accent="loud"]`). |
| **Theme tweak** | `Dark` ↔ `Light (paper)` works — confirmed by toggling `html[data-theme]` and watching the cream palette take hold. |
| **Density tweak** | `Comfy` ↔ `Compact` works — `data-density="compact"` flips font size and card padding. |
| **Accent tweak** | `Quiet/Balanced/Loud` works — CSS rules under `[data-accent]` adjust sport-color visibility. |
| **AI disclosure** | Layered as discussed — subtle pill on AI-touched headlines, stronger label on live AI cards, "How was this written?" footnote on every article. Tone is editorial, not defensive. |
| **Code organization** | Clean split: `extras.jsx` (tweak sync + imagery), `home.jsx`, `nba.jsx`. No `const styles =` collisions. No console errors. |

---

## 🐛 Real bugs

### 1. Bilingual EN ↔ BI tweak is a no-op
**Severity:** Medium — the tweak appears to work (radio thumb moves, `aria-checked` flips) but produces zero visible change.

**Root cause:** `V4TweakSync` writes `localStorage.gibol_lang` and dispatches a `StorageEvent`. But:
1. `StorageEvent` only fires in *other* tabs, not the same window — so `useI18n3` (in `v3/shell.jsx`) never re-reads.
2. Even if it did, `useI18n3` only reads localStorage on initial mount via `React.useState(() => …)` — there's no `useEffect` listening for changes.

**Fix for engineering:** lift `lang` into a React context (or pass as prop), so the Tweak panel updates the same state the shell reads. Or, in the meantime, post a custom event and have `useI18n3` subscribe via `useSyncExternalStore`.

### 2. EDITMODE block lives in the wrong file
**Severity:** Low — affects persistence only.

The `/*EDITMODE-BEGIN*/{ … }/*EDITMODE-END*/` block is in `v4/extras.jsx` instead of inline `<script>` in the root HTML. The host's persistence layer only rewrites the **root HTML** file; tweak edits will not survive page reload.

**Fix:** move the `TWEAK_DEFAULTS` JSON block into an inline `<script>` in `Gibol Redesign v4.html` and import the constant from there.

### 3. Boards lack `data-screen-label`
**Severity:** Low — affects in-product comments only.

`eval_js` reports `data-screen-label` on 3 elements, but none on the 5 actual `.gb3` boards. When the user comments on an element, the `dom:` line in the mention block won't include the screen name, so I can't tell which screen they meant without context.

**Fix:** add `data-screen-label="01 Home"`, `"02 NBA Dashboard"`, `"03 Game Center"`, `"04 Article"` to each `.gb3` root.

---

## ⚠️ Handoff caveats (not bugs, but flag for eng)

1. **In-browser Babel transformer.** The deck uses `@babel/standalone`. Engineering will obviously precompile, but flag that `text/babel` script tags need to be removed and JSX files moved through their bundler.
2. **No `alt` text on imagery.** Zero `alt`, `aria-label`, or `role` attributes in the root HTML. The illustrations are SVG-as-decoration so it's fine for prototype, but production will need accessible labels for the hero images, score widgets, and live indicators.
3. **All artboards are `.gb3`.** This is by design — v4 reuses v3 primitives — but engineering should know there is no separate "v4" component layer; v4 = v3 components + new screen compositions in `v4/*.jsx` + tweak sync.
4. **Imagery is illustration, not photography.** v4 has committed SVG illustrations per sport. For production, every hero illustration spot will need a real image with proper crop ratios (16/9 for hero, 21/9 for full-bleed article hero).
5. **Live data is hard-coded.** Score, time remaining, win-prob spark, "23s ago" stamps are static. Engineering owns the live wiring — the API contract isn't drawn here.
6. **No mobile breakpoints.** Designs are at desktop widths (1280px boards). Mobile/tablet layouts are out of scope for this redesign — flag if engineering needs them too.
7. **Date in kicker reads "03 May 2026".** Hard-coded. Will need to be `today` on the home/dashboard screens.

---

## Code health

- **No console errors.** Only warning: in-browser Babel transformer (expected for prototype).
- **No global `const styles =` collisions** across `v3/*.jsx` and `v4/*.jsx`.
- **No `text-overflow` issues** detected — all text fits its containers at 1280×{1480,1500,1900}.
- **Vertical scroll on Home and Article boards** is expected — boards are taller than they declare (Home: 1724 actual vs 1480 declared; Article: 2153 actual vs 1900 declared). Engineering should match the artboard `height` to the actual content height, OR the scroll is intentional and we should mark them `data-screen-label="… (scrolling)"` for clarity.

---

## Quick fix checklist for the bilingual bug

If you want me to fix the bilingual no-op before handoff, say the word and I'll:
1. Add a `LangContext` in `v3/shell.jsx`.
2. Replace `useI18n3` localStorage init with context read.
3. Wire `V4TweakSync` to write the context value via a setter exposed on `window`.

Otherwise, document it as known and let engineering own it.
