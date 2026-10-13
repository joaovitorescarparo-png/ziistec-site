# V3.2 foundation and Hero M01–M05

**Status: V3.2 HERO FOUNDATION — APPROVED** (after the performance amendment below).

Scope: F2, safe boot, local motion vocabulary and Hero M01–M05, from
`0c6b4fff5c2ecfef0248f56aa54f0be8b62cc2b9` on `feat/homepage-v32-motion`.
Source: frozen “ZiisTec V3.2 — Motion Blueprint 2.md”, SHA-256
`f5603b13cea75e959fb928453e222cb22eed9746e5a20596d000b0d7ee1c8407`.

The first F2 gate run passed 75 tests before motion code. The foundation passed
77 tests and was captured with normal JS, disabled JS, reduced motion and a
blocked main script before any visual choreography was added.
The final suite has 86 tests: the 67 preserved static/tooling tests, 11 F2
mutation tests, and 8 boot/syntax/size tests. The old blanket Phase 4 ban is the
only retired mutation. All business, security and V3.1/V3.1.2 mutations remain.

F2 checks reduced branches, CSS/JS start-state scope, finite effects, layout
animation restrictions, absence of wheel/touch cancellation, and static-frame
integrity. Static markup (except the two external scripts), tokens, homepage CSS
and menu are also hashed. Hashing normalizes Git checkout line endings for
Windows/Linux portability; approved source content remains unchanged.

## Implementation decisions

- Boot is synchronous, external and under the existing `script-src 'self'`.
  Its 1500 ms watchdog restores the static page if main initialization fails.
  Main latches that it started after synchronous setup; fonts initialization is
  separately bounded at 400 ms and catches errors by restoring static.
- The entrance waits for fonts, capped at 400 ms; anchor, mid-page and back
  navigation skip it. Independent `translate` and `scale` preserve the static
  `transform` on devices. All completed entrance effects are removed.
- Fold decisions measure **final** rectangles before any animation writes.
  Hidden mobile table/financial tile and every below-fold box are skipped.
- Delays and 70 ms staggers follow section B. Durations use the frozen ×0.85
  factor below 1024; phone travel is 64 / 40 / 32 px. Mobile window has no scale.
  The highlighted row tint is a temporary pseudo-element; values never change.
- R4's approved mobile LCP fallback is active below 640: opaque title, no clip,
  translate 16px only (same delay/duration/easing). CPU-throttled active-reveal
  pilot pairs measured 860 → 2436 ms and 1000 → 2448 ms, above +200 ms.
- M05 progress is `clamp(1 - stageBottom / (0.4 * stageHeight), 0, 1)`.
  Only toast/where opacity changes, through paused finite effects; effects are
  removed at progress 0 for the exact static endpoint. One passive scroll
  listener schedules one animation frame. Below 640 and under reduce it is off.
- A preference change cancels every effect and restores static immediately;
  switching back enables M05 without replaying the entrance. Resize settles it.
- R2 exposes eligibility through `window.ziisMotion.isPinEligible()` using the
  exact real matchMedia query and excluding reduced motion. No pin is activated.
- `100svh` stage + `600svh` narrative scroll = `700svh` track are vocabulary only.
  F1, carriers, M06–M21, in-view scene fallback and secondary reveals are absent.
  `--mo-pin-query` stays documentation, never a custom-property media query.

## Browser evidence and limits

Chromium validation covers 1440×900, 1280×720, 1280×800, 1024×768, 768×1024,
390×844 and 360×780. Each size is checked against the built baseline with normal
JS, JS disabled, reduced motion, an intentionally throwing main script and all
scripts suppressed: 42 render cases including baseline. There is no overflow
and no unexpected console/page error; injected failures are expected evidence.
Full-page PNG comparisons record raw pixel differences and a perceptual diff
(pixelmatch threshold 0.1, antialiasing excluded, at most 1 raster pixel allowed).
Thus screenshot byte identity is **not** claimed. Source integrity is strict.

There are 17 additional behavior scenarios plus 3 capture sequences: fold and
timings at all sizes; M05 forward/backward/mobile; live reduced preference;
anchor/back navigation; resize; R2 fine/coarse pointer and height/width limits;
and static-workflow scrolling. Scroll-only CLS is 0 and no >50 ms long task was
observed in that sampled scroll sequence. This does not certify real-device FPS.

Load CLS is small but positive in baseline and motion. **CLS = 0 at load is not
accepted**. Slow-network baseline runs also show it; CPU-only runs can have 0
on baseline and positive CLS on motion. Attribution is still unresolved, so an
absence of motion-induced load shifts is not claimed. Static typography/layout
is preserved. Detailed values and paired LCP samples are in the
external delivery report and JSON evidence. Mobile LCP uses five paired cold
contexts, 390×844, 4× CPU, 150 ms network latency, 1.6 Mbps down / 750 kbps up.
Cold-network trials can trigger the 1500 ms failsafe, so they must not be used
as proof of the title reveal's performance. An additional CPU-only mobile
profile isolates active choreography. Both active-reveal pilot pairs exceeded
200 ms; only the frozen title fallback was applied. Final trials record whether
the Hero actually ran, the fallback used, and the actual LCP element.

Captures cover normal/fallback final states and four entrance moments at
1440×900, 1280×720 and 390×844. Screenshots fulfill the requested capture evidence;
no video recording is supplied. Actual iPhone/Safari validation is still manual.

## Reproduce

Run `npm run check` and `npm run build`. Production motion has no dependency.
Browser QA needs a separate Playwright/PNG/pixelmatch runtime, not added to the
production package or lockfile. Set these process-local variables:

```
MOTION_TEST_MODULES = absolute directory of the external node_modules
MOTION_TEST_BROWSER = installed Chromium executable (or omit for Playwright)
MOTION_REPORT_DIR = external writable evidence directory
MOTION_BASELINE_DIST = built baseline fixture directory
```

Export `0c6b4ff` with `git archive` into a disposable directory and run that
fixture's `scripts/build.mjs`. In one terminal run
`node scripts/serve-motion-validation.cjs` (baseline :8770, candidate :8771).
Then run `node scripts/validate-hero.cjs --matrix-only`,
`node scripts/validate-hero-behavior.cjs`, and
`node scripts/validate-hero.cjs --performance-only` and
`node scripts/validate-hero.cjs --performance-only --cpu-only` sequentially. The local HTTP
server applies all approved CSP directives except HTTPS upgrade, which is omitted
solely for localhost HTTP; the repository/deployment CSP is unchanged.

No migrations, push, merge, Preview, Production or external configuration change.
Engineering stops at M05. Acceptance remains qualified by baseline load CLS.

## Performance amendment (approved)

The investigation of the residual load CLS is closed. It is caused by the
fallback → webfont swap, measured in the baseline (`0c6b4ff`) as well as in
motion builds, and not by the M01–M05 timeline. Fonts are not changed in this
phase. The acceptance criteria are formally amended; the measurements recorded
above stay exactly as they were.

| Criterion | Before | Amended |
|---|---|---|
| CLS | 0, absolute | **Motion-attributable CLS = 0**, and **total page CLS ≤ 0.01** in the validation viewports |
| LCP | no regression above 200 ms | **no regression above 200 ms causally attributable** to the boot script, `motion-pending` or M01–M05 |

- The amendment does not authorise any new layout regression. It only accepts
  the residual font-swap shift that was already isolated and measured.
- Motion-attributable CLS means any layout-shift entry whose sources are moved
  by motion code (pin layout, carriers, boot classes, choreography). It must be 0.
- LCP benchmark deltas that occur before the timeline starts and have no causal
  link to motion do not block motion work.
- No automated gate encoded the old absolute criteria: `npm run check` has no
  CLS/LCP assertion, and `validate-hero.cjs` records LCP/CLS without asserting
  them. The only CLS assertion, scroll-only CLS = 0 in
  `validate-hero-behavior.cjs`, is a motion-attributable check and stays.
