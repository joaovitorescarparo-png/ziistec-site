# V3.2 workflow M06–M10

Scope: M06 pin + track, M07 copy/numeral, M08 rail, M09 T12 and M10 T23 on
`feat/homepage-v32-motion`, after `98c551c` (V3.2 HERO FOUNDATION — APPROVED).
M11–M14 are not started. Static markup, tokens, `02-home.css` and the menu are
unchanged (F2 hashes).

## Rules implemented

- Pin only under `(hover: hover) and (pointer: fine) and (min-width: 1024px) and
  (min-height: 600px)`, without reduced motion, with `html.motion`. Touch or
  coarse pointer never pins, at any width.
- Stage `100svh` (`--mo-pin-stage`), narrative scroll `600svh`
  (`--mo-pin-scroll`), track `700svh` (`--mo-pin-track`); `--p` runs 0 → 6 across
  the 600svh (pre-roll from −0.5). The pin layout is CSS-only, before first paint.
- F1: while pinned, 761–899 px tall (≥ 1280) and 761–767 px tall (1024–1279) use
  the approved short-height values; ≥ 900 / ≥ 768 tall centre the approved frame.
- One passive scroll listener → one `requestAnimationFrame` → seek of paused,
  finite WAAPI effects (one per element and property). Only `opacity`,
  `translate` and `scale`; no layout property, no library, no wheel/touch handling.
- Fast scroll (> 3 stage heights/s) cuts to the nearest dwell, then resumes.

## Choreography

| Item | What happens |
|---|---|
| M07 | Step count, title, description and footer step leave t 0.10–0.35 (−12px) and enter t 0.40–0.70 (+12px); numeral rolls t 0.30–0.40 / 0.40–0.50 |
| M08 | Continuous fill and OS #0248 token on all rails; stops switch at each midpoint (160 ms); place chip crossfades 240 ms when its words change |
| M09 · T12 | Approval pill at D1 0.30–0.45; quote leaves; ORC-0218 header flies (t 0.20–0.60) into "Origem · ORC-0218 aprovado"; OS header, fields and toast enter; crumb and nav indicator move |
| M10 · T23 | OS screen leaves; "OS #0248" flies into the 14:00 slot (t 0.00–0.30); agenda takes over; both windows recede 1 → 0.88 (t 0.20–0.55); phone enters (t 0.30–0.85); "OS #0248 · Atribuída" chip arcs from the slot to the phone head (t 0.40–0.80); phone head and body fill (t 0.78–1.00); place becomes "No campo · técnico" at t 0.50. No R$ enters the phone or any carrier |

During T12 and T23 the incoming frame lies over the outgoing one (`mo-over` /
`mo-under`); identical chrome is not drawn twice. Carriers, the nav indicator
and the crumb text wrapper are runtime, `aria-hidden` DOM only.

## Evidence (`validate-workflow.cjs`, Chromium headless)

- Dwells 01–06 equal the approved static frames at 1440×900, 1280×720 and
  1024×768: same element count, max box delta ≤ 0.013 px, opacity delta 0,
  other frames and carriers invisible. 1366×768 and 1280×800 (F1) have no static
  equivalent; composition stays inside the stage, others hidden.
- Pin entry/sticky/exit and reverse identity at 1440×900, 1366×768, 1280×800,
  1280×720 and 1024×768; no R$ on the phone at any T23 instant; resize
  1440×900 → 1280×720 mid-T23 equals a fresh load; anchors `#planos` and
  `#como-funciona`; fast-scroll cut and resume.
- Reduced motion 1440×900, coarse pointer 1280×800 and 1366×1024, tablet
  768×1024, no-JS 1440×900 and 1280×720: page, track and frame heights equal the
  baseline; never pinned. `validate-hero.cjs --matrix-only`: no-JS, reduce,
  failing and blocked scripts are 0 raw pixels from `0c6b4ff` at all 7 sizes.
- Scroll 01 → 03 → 01 (≈ 2 stage heights/s, CPU 1× and 4×): 0 long tasks, motion
  CLS 0, frame p50 16.7 ms, p95 ≤ 16.8 ms, max 50 ms (4×).
- Load, 7 paired runs, M05 head `98c551c` vs M10: LCP deltas −12…+44 ms; load CLS
  identical in every viewport (font swap only, sources nav/hero).

## Known limits

- Content below the pinned track is composited after a sticky layer, so its text
  uses grayscale instead of LCD antialiasing; every box is identical.
- Total load CLS in this environment is 0.033 at 1280×720 and 0.017 at 390×844,
  identical at the M05 head (font swap); M06–M10 add no shift.
- If the main script fails, the boot watchdog restores the static page after
  1500 ms, which returns the track to its static height (failure mode only).
- `motion.js` + boot use 7.9 of the frozen 8 KB gzip budget; M11–M21 need a
  budget decision before they can be added.
- The numeral roll has no clipping box (no inner wrapper in the frozen markup).
- Real-device frame pacing (laptops, Safari, trackpads) is still manual.

Reproduce as in `V32_HERO_VALIDATION.md`, then
`node scripts/validate-workflow.cjs [--video]`.
