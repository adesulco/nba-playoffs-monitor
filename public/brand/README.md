# gibol — brand assets v1.0

For the full brand guideline, see `Gibol Brand Guidelines.html` in the project root.

## Files

| file                          | use                                                |
|-------------------------------|----------------------------------------------------|
| `gibol-wordmark-dark.svg`     | Wordmark on ink (#0F0E0C) — primary product chrome |
| `gibol-wordmark-cream.svg`    | Wordmark on cream (#F5F1EA) — light mode           |
| `gibol-mark.svg`              | Pulse mark, 96×96 — app icons, splash, watermark   |
| `gibol-favicon.svg`           | 16×16 favicon — solid amber dot on ink             |
| `tokens.css`                  | CSS custom properties — drop into global stylesheet |

## Type

- Display: **Newsreader** (Google Fonts, opsz 6..72)
- Sans / wordmark: **Inter Tight** (Google Fonts, 400–900)
- Mono / scoreboard: **JetBrains Mono** (Google Fonts, 400–800)

```html
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700;6..72,800&display=swap" rel="stylesheet">
```

## Wordmark rules (non-negotiable)

1. **Lowercase always** — `gibol`, never `Gibol` or `GIBOL`. Sub-brand suffixes (`gibol Pro`) are the only Title-Case exception.
2. **Pulse dot** = live amber `#F59E0B`, sized at ⅓ cap height, replacing the dot of the `i`. Never any other glyph.
3. **Live amber is reserved** — only on live indicators. Never decorative.
4. **Clear space** = pulse-dot diameter on every side. No headlines, rules, or co-marks inside the box.
5. **Min sizes** — full mark 88px wide; mark-only 16px Ø.

## Color contrast (WCAG AA verified)

| fg                  | bg                  | ratio    | verdict           |
|---------------------|---------------------|----------|-------------------|
| Ink #0F0E0C         | Paper #F5F1EA       | 17.9:1   | AAA               |
| Orange #9A3412      | Paper #F5F1EA       | 5.6:1    | AA — body + micro |
| Amber #F59E0B       | Ink #0F0E0C         | 9.2:1    | AAA — live only   |
| Amber #F59E0B       | Paper #F5F1EA       | 2.0:1    | FAIL — never      |
