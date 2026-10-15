# V3.2 workflow M06–M14

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
  finite WAAPI effects (one per element and property). Since the M10 hardening
  the listener and the frame are shared with M05: each job reads, then all jobs
  write, in the same tick. Only `opacity`,
  `translate` and `scale`; no layout property, no library, no wheel/touch handling.
- Fast scroll (> 3 stage heights/s) cuts to the nearest dwell, then resumes.

## Choreography

| Item | What happens |
|---|---|
| M07 | Step count, title, description and footer step leave t 0.10–0.35 (−12px) and enter t 0.40–0.70 (+12px); numeral rolls t 0.30–0.40 / 0.40–0.50 |
| M08 | Continuous fill and OS #0248 token on all rails; stops switch at each midpoint (160 ms); place chip crossfades 240 ms when its words change |
| M09 · T12 | Approval pill at D1 0.30–0.45; quote leaves; ORC-0218 header flies (t 0.20–0.60) into "Origem · ORC-0218 aprovado"; OS header, fields and toast enter; nav indicator moves; crumb crossfades t 0.30–0.60 |
| M10 · T23 | OS screen leaves; "OS #0248" flies into the 14:00 slot (t 0.00–0.30); agenda takes over; both windows recede 1 → 0.88 (t 0.20–0.55); phone enters (t 0.30–0.85); "OS #0248 · Atribuída" chip arcs from the slot to the phone head (t 0.40–0.80); phone head and body fill (t 0.78–1.05, body 0.04 apart); crumb crossfades t 0.30–0.60; place becomes "No campo · técnico" at t 0.50. No R$ enters the phone or any carrier |
| M11 · T34 | Phone stays (a copy of the stage-03 phone lies under the transparent stage-04 phone). Pill Atribuída → Em atendimento at t 0.25 (240 ms, scale 0.96 → 1 from the left); title/address/time/Solicitação/Itens leave −12px (t 0.20–0.45); tl-phone 13:42 / 13:55 / 14:10 (t 0.40–0.79), now-dot scales once; Material usado, checks 0.6 → 1 (t 0.78–0.92, 0.04 apart); back window dims 0 → 0.22 (t 0.10–0.60) and crossfades to OS #0248 · Em atendimento with .tl-desk; crumb/nav; R$ 420 enters only in the office window (t 0.80–0.95) |
| M12 · T45 | "Concluir atendimento" press (scale 1 → 0.97 → 1, 8% white overlay, t 0.00–0.14); phone leaves (96px 56px, 0.92, 0, t 0.12–0.45); windows 0.88 → 1 and .app-dim 0.22 → 0 (t 0.20–0.60); place chip at t 0.50; crumb Financeiro › Setembro; "OS #0248" arcs from the phone head into the .fin-os title (t 0.30–0.70); figures enter whole (t 0.45–0.70); ORC-0218 R$ 2.000 line (t 0.72–0.82), then R$ 420 moves alone from .live-sale into the second line (t 0.74–0.88), drawn only after the phone is gone (t 0.46) |
| M13 | First time T45 passes t 0.60: six bars scaleY 0 → 1 from the baseline, ABR → SET, 70 ms apart, 600 ms total; time-based, once per page view; final in both directions afterwards |
| M14 · T56 | Header, figures and chart leave (t 0.00–0.30); money lines leave first (t 0.15–0.30); the card without its money carries "OS #0248" into "OS #0248 · concluída" (t 0.30–0.60), event text and .hist-ic arrive (t 0.55–0.65); ORC-0218 aprovado, Produto, Garantia assemble, lines grow scaleY (t 0.40–0.82); Concluída pill (t 0.80–1.00); rail token becomes "OS #0248 · concluída" at t 0.80 (160 ms); D6 holds 0.35 H, no exit animation |

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
- At M10 (`f11e7f8`), `motion.js` + boot measured 7.9 KB gzip against the then
  frozen 8 KB budget. Runtime budget amendment 2 below replaces that budget.
- The numeral roll has no clipping box (no inner wrapper in the frozen markup).
- Real-device frame pacing (laptops, Safari, trackpads) is still manual.

## M10 hardening

After `98bf716`, without changing the T12/T23 concepts, the dwells, the Hero,
fonts, static layout or M11–M21:

- **Scheduler.** M05 and the workflow share one passive scroll listener and at
  most one pending `requestAnimationFrame`; reads run before writes. Gate:
  `check.mjs` fails on a second scroll listener, `requestAnimationFrame(` or
  `cancelAnimationFrame(` (two mutation tests); `validate-workflow.cjs` counts
  listeners and pending frames at runtime. Rendered state, sampled every 0.05
  stage heights at four viewports plus the M05 exit, is unchanged.
- **Crumb.** Outgoing and incoming crumbs crossfade over t 0.30–0.60 with the
  same symmetric curve; their effective opacities sum to 1, so the crumb is never
  empty (it was at t 0.45). At t 0.45 both read at 50%.
- **T23 chip.** No fixed width. The chip flies inside an `aria-hidden` clone of
  the frame-03 phone with everything but the head hidden, so the head keeps its
  own layout. Title, slot, slot pill and phone head are measured in the DOM with
  every effect seeked to the instant each leg starts or lands. At `f11e7f8` the
  chip started 9.8–13.2 px off the slot pill and was 8.6–11.7 px wider than the
  head; now both match to < 0.01 px.
- **Stagger.** Phone body 0.04 apart (blueprint); the last item ends at t 1.05.
- **Anchor.** With the pin eligible, `#como-funciona` lands at p = 0 (pre-roll
  complete), from a load or a link, via a `scroll-margin-top` held by a WAAPI
  effect (no inline style). Touch, tablet and reduced motion keep the native
  anchor of `0c6b4ff`.
- **Late webfonts.** Found during this round: with webfonts later than the
  400 ms bound, rail stops were up to 13.6 px off and the chip 3.2 px off. The
  workflow now re-measures on `loadingdone`.

Evidence at `93d4253` (Chromium headless):

- Dwells 01–06 equal the static frames at 1440×900, 1280×720 and 1024×768
  (max box delta 0.0125 px, opacity delta 0).
- Pin entry/sticky/exit, reverse identity, no R$ on the phone or the chip, no
  R$ 2.420 anywhere in the track, crumb never empty (minimum sum 1.0, minimum
  max 0.56), T23 FLIP < 0.01 px: 1440×900, 1366×768, 1280×800, 1280×720,
  1024×768; also after a resize 1440×900 → 1280×720 mid-T23 and with webfonts
  delayed 1500 ms.
- Reduced motion, coarse pointer 1280×800 / 1366×1024, tablet 768×1024, no-JS:
  equal to the baseline; hero matrix 0 raw pixels from `0c6b4ff` for no-JS,
  reduce, failing and blocked scripts at 7 sizes; hero behaviour 20/20.
- Scroll 01 → 03 → 01: 0 long tasks, motion CLS 0 (CPU 1× and 4×). Frame pacing
  in this run is noisier than the M10 record (p95 16.8 ms at 1×, up to 33 ms at
  4×, max 50–117 ms); the scheduler-only build measured the same way gives the
  same spread, so it is environment noise, not this round.
- Load, 7 paired runs against `f11e7f8`: LCP deltas −20…+48 ms; load CLS equal.
- A rebuild (load, resize, media change, late webfonts) is one long task at
  CPU 4× (≈ 170 ms, ≈ 125 ms at `f11e7f8`); none at 1×. It never runs while
  scrolling.

Open against amendment 1 at `7c5d2b7` (both closed afterwards; see the desktop
LCP closure and performance amendment 2 in `V32_HERO_VALIDATION.md`):
desktop LCP of the hero title is ≈ 1 s with motion vs ≈ 0.2 s at `0c6b4ff`
(+780–820 ms, the title clip reveal of M02; the mobile guard already removes it
at 390×844, +24 ms). Total load CLS is 0.033 at 1280×720 and 0.017 at 390×844
(font swap; `0c6b4ff` 0.047 and 0.020), above 0.01; elsewhere 0.002–0.005.

`motion-boot.js` + `motion.js` after the hardening: 8,602 B gzip (target
12 KB, ceiling 16 KB).

## M11–M14 (complete desktop narrative)

All five transitions are overlay transitions; T34, T45 and T56 follow the same
engine as T12/T23 (paused WAAPI effects seeked by the shared scheduler, carriers
measured in the DOM at the instant each leg starts and lands, no fixed widths).
Added to the engine: pseudo-element targets (`.app-dim::after`, the press
overlay, the history lines) and reversible time-based threshold swaps (T34 pill,
T56 token). FLIP heights now use unrounded boxes (`offsetHeight` rounding
misplaced the T45 code by up to 0.48 px; T12/T23 are unchanged in practice).

Evidence at the M11–M14 head (Chromium headless):

- Dwells D1–D6 equal the static frames at 1440×900, 1280×720 and 1024×768
  (max box delta 0.0125 px, opacity delta 0); D4 0.0032–0.0063, D5
  0.0031–0.0094, D6 0. 1366×768 and 1280×800 stay inside the stage.
- Reverse identity at 14 instants across T12–T56; no R$ in any phone, the T34
  phone copy or the chip, no visible R$ value over a visible phone, no
  R$ 2.420 in the track, crumb never empty (minimum sum 1.0), sampled every
  0.02 H from p 0.45 to 5.70 at all five pinned classes.
- FLIP < 0.002 px for T23, T45 (OS code, R$ 420) and T56 (OS title) at all
  five classes, after a resize mid-T23/T34/T45/T56 (each equal to a fresh load)
  and with webfonts delayed 1500 ms.
- M13: one grow (six effects) across 03→04→05, 05→04→05 and 05→06→05;
  bars held at the baseline before T45 t 0.60 and final afterwards.
- Scroll 03 → 06 → 03 (≈ 2 H/s): 0 long tasks, motion CLS 0, max one pending
  frame; p50 16.7 ms at CPU 1× and 4×; p95 16.8 ms at 1×, 33.4 ms at 4×;
  worst frame 33–50 ms.
- Anchors, fast-scroll cut, reduced motion, coarse pointer, tablet and no-JS
  unchanged; hero matrix 0 raw pixels at 7 sizes; hero LCP pair deltas −40 to
  −12 ms (desktop medians), title still LCP at first paint.
- `motion-boot.js` + `motion.js`: 11,388 B gzip (target 12 KB).

Known limits and debt:

- The build (load at ≈ 300 ms, resize, media change, late webfonts) grew with
  the new transitions: one long task of ≈ 60–74 ms at CPU 1× and ≈ 238 ms at
  CPU 4× (≈ 174 ms before). It never runs while scrolling; the late-font
  remeasurement debt is unchanged in kind and now larger.
- The press brightness is an 8% white overlay, not `filter: brightness()`
  (the F2 gate forbids animating `filter`).
- T34 needs an `aria-hidden` copy of the stage-03 phone inside stage 04: frames
  are separate sticky layers, so a transparent incoming phone would otherwise
  show the incoming window's content through it.
- Real-device pacing (laptops, Safari, trackpads) is still manual.

## Runtime budget amendment 2 (approved)

Applies from the M10 hardening. The 8 KB figure and the measurements taken
against it are kept as recorded.

| Criterion | Before | Amended |
|---|---|---|
| `motion-boot.js` + `motion.js`, gzip | at most 8 KB | **target ≤ 12 KB, hard ceiling 16 KB**; above 16 KB needs a new approval |
| Library | none | none: no motion library is allowed |

- Every runtime target stays: one passive scroll listener, at most one pending
  `requestAnimationFrame`, reads before writes, transform and opacity only,
  60 fps, no long task over 50 ms while scrolling the workflow.
- `motion-boot.js` alone stays under 1 KB.
- The size test in `scripts/tooling.test.mjs` fails above the 16 KB ceiling and
  reports the size against the 12 KB target.

## Acceptance

Acceptance uses performance amendments 1 and 2 (`V32_HERO_VALIDATION.md`):
motion-attributable CLS = 0; total page CLS ≤ 0.01 where `0c6b4ff` is ≤ 0.01,
otherwise ≤ the `0c6b4ff` value with no new layout-shift source; no LCP
regression above 200 ms that is causally attributable to motion. No long
task over 50 ms while scrolling the workflow; dwells equal the approved static
frames; no R$ on the phone and no R$ 2.420 in any frame or transition.

Reproduce as in `V32_HERO_VALIDATION.md`, then
`node scripts/validate-workflow.cjs [--video]`.
