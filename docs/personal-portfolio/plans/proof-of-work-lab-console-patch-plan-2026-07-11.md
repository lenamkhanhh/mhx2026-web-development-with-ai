# Proof-of-Work Lab Console: Patch Plan

Date: 2026-07-11  
Status: awaiting approval  
Implementation scope: `D:/Code/Code/portfolio web` only.

## 1. Outcome

Replace the current three-theme portfolio presentation with one evidence-led English portfolio based on the selected **Proof-of-Work Lab Console** mock.

The final site must help a lab supervisor or technical recruiter identify, within 20-30 seconds:

1. Lê Nam Khánh is a first-year HCMUS Information Technology student.
2. His strongest verified evidence is GPA 7.95/10, Codeforces Expert 1796, and HCMUS Coding Challenge Champion 2026.
3. His trajectory is Algorithms -> Competitive Programming -> AI foundations/current research interests.
4. His current work is honest, early-stage, and inspectable.
5. CV, GitHub, Codeforces, email, and phone are easy to reach.

No experience, publication, research impact, live metric, solved count, benchmark, technology choice, or project capability may be added without evidence already present in the approved content.

## 2. Route Decision

- `/` becomes the single final portfolio.
- `/paper`, `/observatory`, and `/index` become compatibility redirects to `/`.
- The theme gallery and theme switch are removed from the visitor experience.
- Unknown routes continue to redirect to `/`.
- Netlify SPA fallback remains unchanged unless browser verification finds a routing issue.

This preserves old shared links while presenting one coherent identity.

## 3. Proposed File Patch

### `portfolio/src/content.ts`

Replace the loose arrays with a typed, evidence-first content model:

- `profile`: name, role, school, degree, thesis, intro, verified contact links.
- `headlineEvidence`: GPA, Codeforces, challenge result, provenance/status labels.
- `trajectory`: Algorithms, Competitive Programming, AI Foundations, Current Interests.
- `work`: title, honest status, type, focus, short description, evidence URL, artifact kind.
- `interests`: Machine Learning, NLP, Computer Vision, Large Language Models.
- `contact`: CV, email, phone, GitHub, Codeforces.

Add TypeScript literal types for status and artifact kind so unsupported labels cannot be introduced accidentally.

### `portfolio/src/App.tsx`

Reduce App to:

- MotionConfig with `reducedMotion="user"`.
- Route declaration and legacy redirects.
- One `PortfolioPage` composition.
- No theme-specific conditionals or duplicated page trees.

Remove:

- `Paper`, `Observatory`, `IndexTheme`, `ThemeGallery`, and `ThemeSwitch`.
- Universal artwork parallax.
- Generic top scroll-progress bar.
- Old repeated evidence/contact structures.

### New `portfolio/src/components/PortfolioPage.tsx`

Own the semantic page structure:

1. compact header/navigation;
2. hero identity and evidence ledger;
3. trajectory rail;
4. selected evidence/work;
5. current interests;
6. CV/contact end state.

Use semantic `header`, `main`, `section`, `article`, `nav`, and `footer`.

### New `portfolio/src/components/EvidenceLedger.tsx`

- Render the three strongest facts above the fold.
- Keep exact values in static DOM text.
- Link Codeforces evidence directly to the verified profile.
- Use labels and rules instead of count-up animation.
- Provide a compact mobile stack.

### New `portfolio/src/components/TrajectoryRail.tsx`

- Render four real narrative stages.
- Use a code-native SVG/CSS rail; no raster network art.
- Track local section progress with one `useScroll` source.
- Derive line fill and active-node state with `useTransform` and `useSpring`.
- Treat AI as current direction/interests, never achieved research impact.
- Mobile fallback is normal-flow numbered steps with no sticky positioning.

### New `portfolio/src/components/ProjectEvidence.tsx`

- Render three project rows/modules.
- One selected project expands in place using `layout`, `layoutId`, `LayoutGroup`, and `AnimatePresence`.
- Expanded anatomy:
  - honest status;
  - current problem or purpose;
  - current artifact/approach;
  - evidence link;
  - no invented outcome.
- Keyboard-operable button with `aria-expanded` and `aria-controls`.
- Mobile behaves as an accessible accordion.

### New `portfolio/src/components/ArtifactPreview.tsx`

Create deterministic code-native previews:

- ICPC system: Training plan -> Topic task bank -> Verified anchors -> Audit reports -> Workbook generator.
- VoxelCode: restrained early-project placeholder based only on “C++ · Visual learning”.
- FFT notes: simple butterfly/derivation diagram based on the verified note topic.

No generated dashboard, fake terminal output, solved count, performance graph, or repository activity metric.

### New `portfolio/src/components/ContactPanel.tsx`

- Direct CV, email, phone, GitHub, and Codeforces actions.
- Copy aimed at internship/lab conversations.
- No generic giant slogan that dominates the evidence.

### New `portfolio/src/motion.ts`

Centralize:

- entrance timings;
- evidence stagger;
- project expansion transition;
- SVG path transition;
- reduced-motion-safe alternatives.

Keep the main entrance stable within 700ms. Avoid a reusable “animate everything upward” preset.

### `portfolio/src/styles.css`

Rewrite rather than layer more overrides.

Visual system:

- off-white background;
- near-black structure;
- electric cobalt primary accent;
- optional signal lime used only for honest status;
- restrained 12-column desktop grid;
- one workhorse sans plus a compact mono for data/code;
- no decorative display serif;
- no rounded-card dashboard inventory;
- thin evidence rules and explicit alignment.

Responsive behavior:

- desktop target: 1440 x 1024;
- tablet breakpoint: approximately 768-1024px;
- mobile target: 390 x 844;
- metrics visible early;
- no horizontal narrative or overflow;
- no sticky/pinned sequence on mobile.

Accessibility:

- visible `:focus-visible`;
- minimum touch target approximately 44px;
- sufficient contrast for muted labels;
- content order remains meaningful without CSS grid;
- reduced-motion CSS disables smooth scrolling and ambient animation.

### `portfolio/index.html`

- Update title/description/Open Graph copy to the single selected portfolio.
- Keep English-only metadata.
- Preserve favicon unless a code-native replacement is introduced.

### `portfolio/src/content.test.ts`

Update and extend truth-contract tests:

- verified name/contact;
- GPA and Codeforces exact values;
- verified challenge result;
- three evidence URLs are non-empty HTTPS destinations;
- no empty project status;
- no publication, employment, testimonial, research-impact, live-performance, solved-count, or benchmark fields.

Do not add a new testing dependency unless the implementation exposes behavior that cannot be verified through existing Vitest plus browser QA.

### `portfolio/package.json` / lockfile

- Keep Motion 12.42.2.
- Do not add GSAP, smooth-scroll, WebGL, animation presets, or another UI framework.
- Change only if an implementation blocker is found and reported before proceeding.

### Assets

- Stop using `paper-network.png`, `observatory-path.png`, and `index-flow.png` in the rendered portfolio.
- Do not delete them in the first patch unless removal is necessary; keeping source edits separate from cleanup reduces risk.
- The selected mock remains a design reference, not a runtime image.

## 4. Motion Patch

### Initial paint

- Core text is visible before animation.
- Identity, trajectory statement, and evidence settle in 450-700ms.
- Evidence stagger is 40-70ms.
- No loader, boot sequence, typewriter, or fake command output.

### Trajectory

- Section-local scroll fills a single rail.
- Active node changes color/opacity and at most 8-12px position.
- No global parallax.
- At most one subtle active-node pulse; pause when offscreen and disable on mobile/reduced-motion.

### Project interaction

- Shared-layout expansion maintains spatial context.
- Project pipeline path draws once when the expanded evidence enters view.
- Hover and focus highlight the same path.
- Rapid repeated clicks must remain interruptible and leave one valid expanded state.

### Reduced motion

- `MotionConfig reducedMotion="user"`.
- `useReducedMotion` disables SVG drawing, rail travel, ambient pulse, and transform-based entrance.
- Preserve opacity, color, focus, and instant state changes.
- All content remains present.

### View Transitions

- Not required for the first homepage patch.
- If project-detail routes are added later, use `document.startViewTransition` only with feature detection and a synchronous fallback.

## 5. Implementation Order

1. Lock content types and truth-contract tests.
2. Build semantic static page with no motion.
3. Rewrite the responsive visual system to match the selected mock.
4. Add evidence ledger and artifact previews.
5. Add trajectory rail motion.
6. Add shared-layout project expansion.
7. Add reduced-motion and mobile behavior.
8. Update metadata and remove old theme navigation from runtime.
9. Run automated verification.
10. Run desktop/mobile browser QA and fix findings until clean.

## 6. Verification Gates

All gates must pass before completion is reported.

### Automated

Run from `D:/Code/Code/portfolio web`:

1. `npm.cmd test`
2. `npm.cmd run lint`
3. `npx.cmd tsc --noEmit`
4. `npm.cmd run build`

Report the exact command and outcome of each.

### Desktop browser QA

Playwright/real-browser check at 1440 x 1024:

- hero identity and all three strongest evidence items visible;
- first project begins within or immediately after the first viewport;
- trajectory rail fills and activates correct nodes;
- each project expands/collapses correctly;
- keyboard navigation and focus states work;
- CV and external evidence destinations are correct;
- legacy routes redirect to `/`;
- no clipped text or horizontal overflow;
- console has zero errors and zero warnings.

Capture:

- initial viewport;
- expanded project;
- trajectory/current-interests state;
- contact/footer state.

### Mobile browser QA

Playwright/real-browser check at 390 x 844:

- no sticky/pinned narrative;
- evidence visible early;
- no horizontal overflow;
- accordion and actions are touch-safe;
- diagrams remain within viewport;
- contact links wrap cleanly;
- fast scrolling does not produce blank content.

Capture initial, expanded-project, and contact states.

### Reduced-motion QA

Emulate `prefers-reduced-motion: reduce`:

- no transform entrance;
- no SVG path drawing;
- no pulse/parallax/smooth scroll;
- project state and focus remain understandable;
- all content remains visible.

### Runtime and visual diagnostics

- inspect console and failed network requests;
- verify Google Fonts or replace with stable fallbacks if loading is unreliable;
- test with 4x CPU slowdown for jank in trajectory and project expansion;
- verify no source uses old abstract assets at runtime.

## 7. Scope and Git Guardrails

- Do not modify files outside `D:/Code/Code/portfolio web`.
- Preserve unrelated dirty files in the git root.
- Do not stage, commit, push, or open a PR.
- Screenshots and QA outputs remain separate from source edits.
- If verified content is missing, omit the field or show an honest status; never invent it.

## 8. Approval Boundary

Implementation starts only after this plan is approved.

Any later change that introduces fabricated evidence, a new dependency, a new route model, or a materially different visual direction requires a new approval checkpoint.
