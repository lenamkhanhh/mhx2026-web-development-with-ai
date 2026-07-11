# Design QA — Proof-of-Work Lab Console

Date: 2026-07-11  
Final result: passed

## Product direction

The former three-theme prototype has been replaced by one evidence-led portfolio at `/`. The design follows the selected Proof-of-Work Lab Console direction: a bright, precise living ledger rather than a dark sci-fi dashboard. Legacy routes `/paper`, `/observatory`, and `/index` redirect to `/`.

## Visual evidence

- Desktop, 1440 x 1024: `output/playwright/lab-console-qa/desktop-final.png`
- Mobile, 390 x 844: `output/playwright/lab-console-qa/output/playwright/lab-console-qa/mobile-final.png`
- Earlier interaction captures, including expanded project states, remain in `output/playwright/lab-console-qa/`.

## Visual review

### Typography and hierarchy — passed

- DM Sans carries the editorial display hierarchy; IBM Plex Mono identifies evidence, status, and sequence metadata.
- The opening scan order is name, research trajectory, short positioning statement, primary action, then quantified evidence.
- Mobile type and spacing were tightened so quantified evidence enters earlier without making the hero feel compressed.

### Grid, spacing, and density — passed

- Desktop uses an asymmetric evidence-led hero, a four-step trajectory rail, and a three-column project ledger.
- Mobile collapses into a single readable column with full-width project labels rather than forcing titles into narrow grid cells.
- Browser measurements reported `scrollWidth === clientWidth` at 390 px and no content overflow at desktop.

### Content and professional credibility — passed

- GPA, Codeforces rating, HCMUS Coding Challenge result, current artifacts, and Algorithms-to-AI direction are visible and prioritized.
- Status labels distinguish current work, early projects, and evolving notes.
- Interests are explicitly framed as study directions, not expertise, publications, employment, or research impact.
- No unsupported experience, publication, testimonial, star count, or lab claim is present.

### Imagery and motion — passed

- Project previews are restrained artifact diagrams tied to the underlying work; the retired theme raster assets are not rendered.
- Scroll motion progressively activates the learning trajectory while inactive nodes remain readable.
- Project selection changes the evidence detail panel without blocking reading or navigation.
- With `prefers-reduced-motion: reduce`, smooth scrolling is disabled and Playwright reported zero running animations.

## Browser and interaction verification

- Production preview opened and visually inspected at 1440 x 1024 and 390 x 844.
- `/paper`, `/observatory`, `/index`, and an unknown route all resolve to `/`.
- Project tabs expose `aria-selected`; the detail region is a labelled tab panel.
- Email, CV, GitHub, Codeforces, and project evidence destinations are present.
- Web fonts loaded successfully.
- Runtime console: 0 errors, 0 warnings.

## Engineering gates

- [x] Unit/content and atlas contract tests: 10 passed.
- [x] ESLint passed.
- [x] TypeScript `--noEmit` passed.
- [x] Production build passed (4,993 modules transformed).
- [x] Desktop visual QA passed.
- [x] Mobile visual QA passed.
- [x] Reduced-motion QA passed.
- [x] Console QA passed.

No P0, P1, or P2 issue remains at handoff.

## Academic Infrastructure Blueprint verification

The selected overall redesign replaces the animated Chromatic Research Field with a dense but static research-atlas background.

- Background layers are a static spectral wash plus four document-scale atlas slices; each slice carries four constellation clusters, broad topographic bands, coordinate marks, and technical annotations.
- Space Grotesk strengthens the infrastructure/editorial display system while IBM Plex Mono continues to carry metadata and status labels.
- Narrow ivory reading zones preserve headline, evidence, project-card, and section-label contrast without washing out entire sections.
- The atlas is decorative, pointer-inert, and hidden from assistive technology.
- The atlas subtree reports zero animations; there is no canvas, RAF, pointer listener, scroll hook, morph, or background state machine.
- The atlas height matches the 3,858 px production document height, so detail persists through hero, trajectory, projects, and interests instead of repeating one fixed viewport.
- Mobile retains all four document slices but reduces each slice to two constellation clusters; it has no horizontal overflow.
- `prefers-reduced-motion: reduce` reported zero running animations in production.
- Production desktop capture: `output/playwright/lab-console-qa/atlas-fidelity-desktop-final.png`.
- Production mobile capture: `output/playwright/lab-console-qa/atlas-fidelity-mobile-final.png`.
- Production console: 0 errors, 0 warnings.
- Desktop and 390 px mobile: no horizontal overflow.
