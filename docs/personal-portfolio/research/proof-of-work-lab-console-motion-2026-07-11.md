# Proof-of-Work Lab Console: Motion Research

Generated: 2026-07-11  
Status: direction selected; research complete; implementation not started.

## Decision

Use the existing Motion 12.42.2 dependency. Do not add GSAP or another animation runtime for the initial redesign.

The selected direction should feel like a **living proof ledger**: animation clarifies reading order, evidence relationships, project state, and the transition from Algorithms to AI research. It should not imitate a terminal, game HUD, or sci-fi control room.

## Why Motion Is Sufficient

- useScroll, useTransform, and useSpring support section-local scroll-linked progress without React state updates on every scroll tick.
- layout, layoutId, LayoutGroup, and AnimatePresence support project expansion and shared-element continuity using transform-based layout animation.
- SVG pathLength supports line drawing for real project pipelines and the Algorithms-to-AI trajectory.
- MotionConfig reducedMotion="user" and useReducedMotion provide site-wide and component-level reduced-motion behavior.
- The native View Transition API can be used later as progressive enhancement for project-detail navigation, with feature detection and an immediate fallback.

GSAP ScrollTrigger is capable of pin, scrub, snap, and long timelines, but those features are unnecessary for the chosen interaction model. Adding it would increase conceptual and dependency cost while encouraging pinned cinematic behavior that competes with evidence.

## Motion Principles

1. Every animation must explain order, relationship, state, or evidence.
2. Verified values never count up from zero; they resolve as exact static text.
3. Core content is visible without animation or JavaScript.
4. Entrance motion is short and runs once.
5. No scroll hijacking, horizontal story, custom cursor, or mandatory scrub.
6. Mobile uses normal document flow; sticky and pinned scenes are desktop-only and should remain rare.
7. Reduced motion removes transforms, parallax, path drawing, and ambient pulses while preserving opacity, color, focus, and state.

## Recommended Motion System

| Surface | Purpose | Standard behavior | Mobile | Reduced motion |
|---|---|---|---|---|
| Initial shell | Establish reading order | Page frame paints immediately; identity, trajectory, and evidence settle within 450-700 ms | Shorter stagger or none | Content appears immediately or via 120 ms opacity |
| Evidence ledger | Signal verified proof | Label appears first; exact value resolves with a small opacity/clip reveal | Stacked rows visible early | Exact value is static |
| Trajectory rail | Connect Algorithms to current AI direction | Section-local useScroll fills a line and activates the currently read node | Normal-flow numbered steps; color/opacity state only | Static line and active labels |
| Project list | Reveal depth without navigation loss | Selected row expands in place using layout/layoutId; adjacent content reflows | Accessible accordion anatomy | Instant expand/collapse |
| Project pipeline | Explain a real mechanism | SVG path draws input -> method -> artifact; hover and focus highlight the same path | Simplified diagram within viewport | Fully drawn static SVG |
| Tabs/filters | Preserve spatial context | Shared underline moves 160-240 ms; item reflow uses layout animation | Same, with larger touch targets | Instant state change or opacity |
| Route/detail continuity | Reduce cognitive reset | Optional native View Transition with feature detection | Short crossfade only | Immediate navigation |
| Buttons/links | Confirm interaction | Icon translates 2-3 px; rule/accent responds to hover and focus-visible | Pressed state, no hover dependency | Color/focus only |
| Ambient state | Add restrained life | At most one active-node opacity pulse, 3-4 s, stopped offscreen or after interaction | Disabled | Disabled |

## Desktop Storyboard

### 0-700 ms: Evidence boot

- No loader or fake command prompt.
- Shell and all readable text paint immediately.
- Identity enters first, followed by the trajectory statement.
- GPA, Codeforces, and the verified challenge result settle with a 40-70 ms stagger.
- The screen is stable after approximately 700 ms.

### Scroll 0-25%: Foundations

- The trajectory line fills from Algorithms to Competitive Programming.
- The associated evidence packet changes accent and moves no more than 8-12 px.
- The first project begins entering before the hero fully leaves the viewport.

### Scroll 25-55%: Proof of work

- Work rows reveal once as a group.
- Opening a row performs shared-layout expansion.
- The expanded region shows problem, current approach, artifact, honest status, and evidence link.
- A small SVG pipeline draws only when the project explanation becomes visible.

### Scroll 55-80%: Current direction

- The rail advances from competitive programming toward AI foundations and current interests.
- Wording and animation must make clear that this is a direction of study, not claimed research impact.
- Machine Learning, NLP, Computer Vision, and LLMs appear as interests, never as expertise scores.

### Scroll 80-100%: Conversion

- CV, GitHub, Codeforces, email, and lab/internship contact settle into a calm, static end state.
- Replace the generic top progress bar with a small trajectory marker if continuous progress feedback is still useful.

## Mobile Storyboard

- No sticky or pinned section.
- Hero is a compact stack with GPA and Codeforces visible early.
- Trajectory becomes four normal-flow steps.
- Project modules use accessible accordions with a static preview.
- Diagrams never exceed viewport width.
- Staggers are shortened or removed so fast scrolling never produces blank sections.
- Contact and CV remain reachable without decorative content preceding them.

## Accessibility and Performance Guardrails

- Wrap the app in MotionConfig reducedMotion="user".
- Use useReducedMotion for SVG drawing, ambient state, and any behavior requiring a semantic alternative.
- Favor transform and opacity.
- Avoid manual height animation where Motion layout animation can perform transform-based reflow.
- Avoid continuous blur, filter, box-shadow, background-position, and large clip-path animation.
- Use one useScroll source per major narrative section and derive visual values with motion values.
- Pause offscreen SVG and ambient animation.
- Test at 4x CPU slowdown and on a mid-tier mobile viewport.
- Validate keyboard focus, touch behavior, reduced motion, rapid scroll, back/forward navigation, and content availability before hydration.

## Explicit Anti-Patterns

- Fake terminal typing, command spam, boot sequence, or artificial loading.
- Count-up GPA, rating, awards, solved problems, or fabricated live metrics.
- Scroll hijacking, mandatory scrub, snap, or long pinned hero.
- Horizontal scrolling chapters on mobile.
- Pointer-follow spotlight, magnetic CTA, custom cursor, or full-canvas parallax.
- Particle field, moving grid, WebGL, or perpetual decorative noise.
- Applying the same rise/fade preset to every section.
- Motion-only information or hover-only evidence.

## Primary Sources

- Motion scroll animation: https://motion.dev/docs/react-scroll-animations
- Motion useScroll: https://motion.dev/docs/react-use-scroll
- Motion layout animation: https://motion.dev/docs/react-layout-animations
- Motion SVG animation: https://motion.dev/docs/react-svg-animation
- Motion reduced motion: https://motion.dev/docs/react-use-reduced-motion
- Motion configuration: https://motion.dev/docs/react-motion-config
- MDN View Transition API: https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- Chrome same-document View Transitions: https://developer.chrome.com/docs/web-platform/view-transitions/same-document
- W3C Animation from Interactions: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions
- GSAP ScrollTrigger: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Bartosz Ciechanowski, Mechanical Watch: https://ciechanow.ski/mechanical-watch/
- Distill: https://distill.pub/
- Nicky Case, Explorable Explanations: https://blog.ncase.me/explorable-explanations/
