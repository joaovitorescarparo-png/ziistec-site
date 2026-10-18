# V3.2 secondary motion — M18–M21 validation

Scope: the last functional motion layer before the final hardening. M01–M17 are
frozen; no line of their code, CSS or markup changed (`git diff 14e1171 --
site/index.html site/script.js site/v4/01-tokens.css site/v4/02-home.css` is
empty; the M15 gate now counts the scenes observer by its rootMargin).

## What runs

- **M18 secondary reveals** (`motion.js`, fourth IIFE). One shared
  `IntersectionObserver`, `rootMargin: '0px 0px -15% 0px'` (line at 85%),
  WAAPI only: no scroll listener, no `requestAnimationFrame`, no CSS start
  state. Problem (title; each row before → arrow → after, 70 ms), Results (item
  rises 16 px, its title and text 70 ms later, the number never counts),
  Audience (rows rise 12 px, their rule draws scaleX from the left), Growth
  (steps 160 ms apart, avatars scale 0.8 → 1, 70 ms; ≤ 0.85 s), Testimonials
  (mark, lead quote 520 ms, byline +240 ms, cards 70 ms), Pricing (Essencial,
  Profissional +160 ms / 32 px / 520 ms emphasis, badge 0.96 → 1 at +680 ms,
  Equipe +320 ms; no card above scale 1, no shadow animation).
  Blocks of one group that reach the line in the same row share the stagger;
  stacked blocks (mobile) trigger on their own, in document order.
- **Once, never hidden.** A block plays only when it rises from below into the
  line; on screen, passed, unreachable or hidden by the layout at init → final;
  passed by a jump or met from above → final; a resize or a jump that moves a
  held block above the line without an entry → final (sweep on every callback
  and on resize); keyboard focus inside a section → its pending reveals final;
  reduced motion → everything final, observer disconnected. Layout is read
  before any write (callback and init), so no reveal forces a sync layout.
- **M19 FAQ** (CSS only). Native `<details>/<summary>`; `::details-content`
  block-size 240 ms with `interpolate-size: allow-keywords` inside `@supports`
  (instant elsewhere); answer fades in 160 ms; plus/minus turns 90° in 160 ms.
- **M20 final CTA** on the same observer: title clip reveal 640 ms emphasis
  (below the fold; JS-only, never a CSS start state), lead +240 ms, button
  +310 ms. The rail replays once in 900 ms (time-based): fill scaleX 0 → 1,
  each stop held "not done" until the fill passes it (180 ms per stage), token
  slides first → last stage. No scheduler, pin or carrier; final wherever the
  static layout hides it (< 1024) and under reduced motion.
- **M21 microinteractions** (CSS, `html.motion` + no-preference). Buttons time
  the approved static hover states in 160 ms (arrow +2 px on primary/dark,
  faint tint on secondary), press 0.98 in 90 ms; focus ring 2 px, offset 2 px,
  appears in 90 ms and is never transitioned away. Desktop nav underline
  scaleX from the left, 160 ms. Mobile menu opens 240 ms from −8 px, closes in
  160 ms, only once a visitor uses the page (`[data-mo-menu]`, cleared on a
  1024/640 breakpoint change, so a resize/rotation never fades the panel).
  FAQ summary colour 160 ms. Pricing cards never react; storytelling controls
  are not hit-tested and not focusable.

## Divergences from the blueprint (deliberate)

- Focus ring colour: `--zt-brand-strong` on dark buttons (as specified); on
  light buttons the approved `--zt-brand-deep` is kept, because brand-strong on
  white is ≈ 1.5:1 (WCAG 1.4.11 needs 3:1). Same colours as the static ring.
- "Background one step lighter" on hover: the approved static hover colours
  are kept and only timed (primary hover is the approved, darker
  `--zt-brand-deep-hover`); no pseudo-element shadow exists, so none is added.
- Results has four items in the frozen markup (the brief says ×3): all four
  reveal with the same rule.
- Problem arrow: the desktop arrow draws scaleX from the left; the mobile
  down-arrow draws scaleY from the top (same timing).
- Audience rows: the row content rises; the rule is a pseudo line on the exact
  pixels of the static border so it can draw independently.
- Equipe card (unspecified): +320 ms, 16 px, 420 ms.

## Evidence (Chromium 141, `scripts/validate-sections.cjs`)

- Once, no replay (read down, up, down): 1440×900 and 1280×720 75 targets,
  768×1024 and 390×844 58 targets (no rail), every target exactly once; one
  section observer, 0 targets observed at the end; residue 0.
- Fast scroll (12 jumps), reload inside each of the 8 sections (on-screen
  opacity never below 1, i.e. no blink), anchors `#planos #duvidas #para-quem`
  and an in-page jump, at 1440×900 and 390×844: nothing held on screen.
- Breakpoint 1440 → 390 → 1440 mid-page, then a full read: residue 0, no replay.
- Reduced motion (1440, 390): 0 plays, 0 holds. Switched on during the Pricing
  reveal: 4 running → 0 animations, `html.motion` removed, residue 0.
- No-JS (1440, 390), `motion.js` blocked (boot failsafe), JS error thrown
  inside the Results and CTA reveals: residue 0.
- Keyboard: 27 stops at 1440, 22 at 390 (nav, header CTA, hero, pricing ×3,
  FAQ, six summaries, final CTA, footer); every stop visible (opacity 1), on
  screen, `:focus-visible` with a ring. Enter/Space on `<summary>`, several
  open. Mobile menu at 390 and 768: same focus sequence as `0c6b4ff`.
- Full homepage scroll, Hero → Footer (80 px wheel steps), candidate vs
  `14e1171`:

| Viewport | CPU | p50 | p95 | worst | long tasks | motion CLS | max pending RAF |
|---|---|---|---|---|---|---|---|
| 1440×900 | 1× | 16.7 | 16.8 (16.8) | 50.1 (33.4) | 0 (0) | 0 | 1 |
| 1440×900 | 4× | 16.7 | 33.3 (16.8) | 66.7 (66.7) | 0 (0) | 0 | 1 |
| 390×844 | 1× | 16.7 | 16.7 (16.8) | 33.4 (33.4) | 0 (0) | 0 | 1 |
| 390×844 | 4× | 16.7 | 16.8 (16.8) | 66.7 (50) | 0 (0) | 0 | 1 |

  Observers: 2 at 1440 (workflow fallback + sections), 3 at 390 (+ scenes);
  at most 23 section targets, 0 at the end. At 1440 CPU 4× the p95 rises
  because frames that start the reveals run the full paint/layerize lifecycle
  on the main thread (traced; identical with no holds at all); scroll stays on
  the compositor, there is no long task, and the frames outside the reveals
  match `14e1171`. The workflow (03 → 06 → 03, p95 16.8/33.4 at 1×/4×) and the
  scenes (paired with `14e1171`: identical) are unchanged.
- Earlier suites rerun sequentially: hero matrix within the 1-pixel tolerance in all
  modes and sizes (secondary blocks finalised through the page's own focus
  path before the full-page capture), hero behaviour 20/20, hero LCP paired
  (title is the LCP element everywhere, deltas ≤ +36 ms p75), workflow and
  scenes passed (money nowrap, History clearance 32/26.37/30.12 px, no R$ on
  the phone, no R$ 2.420).

## Budget

`motion-boot.js` + `motion.js` gzip: **15,906 B** (LF), 15,990 B with CRLF;
hard ceiling 16,384 B, now also enforced by `check.mjs`. The 12 KB target was
already exceeded and documented (amendment 2).

Reproduce: serve as in `V32_HERO_VALIDATION.md`, then
`node scripts/validate-sections.cjs [--performance-only] [--previous <port>]`.
