# Portfolio Redesign Audit and New Visual Directions

Generated: 2026-07-11  
Scope: read-only UI/source audit, fresh desktop/mobile browser evidence, current portfolio research, and three pre-implementation visual directions.

## Decision

The current implementation is technically functional but not ready to represent a serious AI/CS lab candidate. It passes basic responsive and console checks, yet the visual system still reads as three styled hero posters sharing the same generic content skeleton. The redesign should stop treating the existing Paper, Observatory, and Index layouts as the default solution.

No portfolio UI source was changed during this audit.

## Fresh Browser Evidence

The original Vite app was run from `D:/Code/Code/ai-switcher/portfolio` and audited at `http://127.0.0.1:4174` before the project moved to `D:/Code/Code/portfolio web`.

Desktop viewport: 1440 x 1024.  
Mobile viewport: 390 x 844.

Evidence folder:

- `portfolio/output/playwright/audit-current/gallery-desktop-viewport.png`
- `portfolio/output/playwright/audit-current/gallery-mobile-viewport.png`
- `portfolio/output/playwright/audit-current/paper-desktop-viewport.png`
- `portfolio/output/playwright/audit-current/paper-mobile-viewport.png`
- `portfolio/output/playwright/audit-current/observatory-desktop-viewport.png`
- `portfolio/output/playwright/audit-current/observatory-mobile-viewport.png`
- `portfolio/output/playwright/audit-current/index-desktop-viewport.png`
- `portfolio/output/playwright/audit-current/index-mobile-viewport.png`
- Full-page captures for every route use the same filenames with `-full`.

Runtime checks:

- All four routes rendered with fonts loaded.
- No console errors or warnings were reported after each route navigation.
- No horizontal overflow was found at 1440 x 1024 or 390 x 844.
- These checks confirm implementation hygiene, not visual quality.

## Prioritized UI Audit

### P1 - The three themes are skins, not three convincing information architectures

All routes reuse the same `Actions`, `WorkList`, `EvidenceSection`, `Contact`, reveal variant, and accordion anatomy. The visible difference is concentrated in the hero, palette, and generated raster. After the hero, the experience converges into the same ruled list and oversized contact statement. The gallery therefore promises three distinct stories but delivers three visual treatments of one skeleton.

Source evidence: `portfolio/src/App.tsx` lines 38-73 and `portfolio/src/styles.css` lines 23-44.

### P1 - The hierarchy overvalues the name and decorative concept art

At desktop, every hero devotes roughly half the viewport to a large generated image and an unusually large name treatment. GPA, Codeforces rank, achievements, and work evidence are visually secondary even though they are the strongest reasons a lab supervisor should continue reading. At mobile, the name still occupies several lines and pushes the hero artwork or evidence below the fold.

The result is a fashion/editorial poster hierarchy rather than a candidate-evaluation hierarchy.

### P1 - Content density is simultaneously sparse and repetitive

The page repeats the same three facts in the hero and later evidence grid, but project proof remains thin: three one-line rows, one paragraph for the open item, and no screenshots, problem framing, contribution, constraints, status, or next step. A recruiter sees visual confidence without enough substance; a lab supervisor sees interests without a concrete learning/research trail.

The current full pages are 3,121-3,231 CSS pixels tall on desktop and 3,396-3,792 pixels on mobile, but much of that length is padding or reveal-reserved space rather than useful evidence.

### P1 - Mobile is a compressed desktop poster

Paper retains a crowded brand plus three-item theme switch in the top row, an approximately 25vw display name, large hero copy, three separate evidence rows, and two large CTAs before the image. Observatory retains the same dense stat table and long trajectory line. Index places decorative art behind evidence and copy, reducing clarity.

The mobile routes are technically non-overflowing, but they do not reprioritize for a narrow, fast-scanning context. Primary proof, work, and contact should move up; decorative concepts should reduce or disappear.

### P2 - Typography has too many voices without a strong role model

Four external font families are loaded: DM Sans, IBM Plex Mono, Instrument Serif, and Newsreader. Instrument Serif and Newsreader are similar editorial signals, while IBM Plex Mono is applied broadly to labels and navigation. This creates a designed-looking surface, but the pairing lacks clear semantic discipline.

- Paper mixes a high-contrast display serif, reading serif, geometric sans, and mono microcopy in one viewport.
- Observatory pairs a neutral sans name, Newsreader slogan, DM Sans body, and mono metrics; the aesthetic shifts between sci-fi dashboard and literary editorial.
- Index uses sans for the name and serif for the thesis, but the oversized `01` competes with both.

The font system should be reduced to one display family plus one workhorse family, with mono reserved only for data/code.

Source evidence: `portfolio/src/styles.css` lines 1, 15, 24, 29, 39-40, 49, 63, 69, and 102-104.

### P2 - Grid and spacing create weak reading rhythm

The desktop heroes are balanced geometrically but not narratively: left copy and right artwork have similar visual mass, so the eye oscillates instead of following a clear proof sequence. Global `110px` section padding and large minimum hero heights create abrupt changes from dense hero to sparse sections. The evidence and interests sections can look nearly empty in full-page capture until `whileInView` content is triggered.

The next design should use a content grid with explicit reading order: identity -> strongest proof -> trajectory -> selected work -> contact.

### P2 - Imagery is polished but generic and untrustworthy as evidence

The three raster assets are large generated abstractions (1.23-2.32 MB each). They communicate “research/technology” but show nothing about Khanh's real work, process, or character. Network, constellation, and flow-field imagery is a familiar AI visual cliché and can make an early-career portfolio feel more inflated, not more credible.

Until real portraits are available, imagery should come from honest artifacts: workbook excerpts, code, diagrams, project UI, training notes, contest evidence, and small abstract system graphics that are clearly decorative.

### P2 - Motion is ornamental and nearly identical across themes

Every hero uses the same stagger, vertical rise, opacity, and clip-path reveal. Every artwork uses the same pointer parallax. Every page uses the same scroll progress rule. Observatory adds orbit pulses, but they do not explain evidence or trajectory.

Motion should communicate state and reading order: expand a real project case study, connect an algorithms milestone to a current AI question, or reveal annotations on an artifact. It should not be the same animation preset applied to three skins.

The accordion also animates `height`, which incurs layout work; web.dev recommends favoring transform and opacity where possible.

Source evidence: `portfolio/src/App.tsx` lines 8-35 and 42-49.

### P2 - The gallery creates decision fatigue and looks like an internal design review

The root route says “Choose a direction” and exposes all three themes. That is useful during development but inappropriate for a final recruiter-facing site. A lab supervisor should encounter one coherent identity, not a theme picker that asks them to evaluate the designer's process.

### P3 - Calls to action are generic

“View selected work” and “Download CV” are valid but generic. The stronger information scent is “See project evidence,” “Read the ICPC training system,” or “Discuss a lab opportunity.” Contact copy such as “Let's explore a difficult problem” is memorable but not anchored to a specific value proposition.

## Research Synthesis

GitHub stars were retrieved from the GitHub API on 2026-07-11. They are adoption signals, not design scores.

| Reference | Stars | What is worth borrowing | What not to copy |
|---|---:|---|---|
| [Academic Pages](https://github.com/academicpages/academicpages.github.io) | 17,281 | predictable academic information architecture and Markdown ownership | publication-heavy default structure for an established academic |
| [al-folio](https://github.com/alshedivat/al-folio) | 15,840 | evidence-led projects, notes, CV, and repository integration | its common theme identity and broad academic section inventory |
| [Brittany Chiang v4](https://github.com/bchiang7/v4) | 8,260 | clear project pacing and focused calls to action | the widely copied navy/green developer-portfolio look |
| [Lee Robinson's Next MDX portfolio/blog](https://github.com/leerob/next-mdx-blog) | 7,570 | compact writing/project system and restrained product polish | over-minimalism that assumes existing reputation |
| [Craftzdog homepage](https://github.com/craftzdog/craftzdog-homepage) | 2,457 | personal voice, small interaction details, and approachable density | playful decoration that could weaken lab credibility |
| [Anthony Fu](https://github.com/antfu/antfu.me) | 1,060 | modular identity, open-source proof, and a content-rich personal ecosystem | an inventory of achievements Khanh does not yet have |
| [Maggie Appleton](https://maggieappleton.com/) | current site repo 151 | honest “digital garden” maturity, visual explanations, and strong personal authorship | illustration volume that requires real content production |
| [Amelia Wattenberger](https://2019.wattenberger.com/) | archived site repo 191 | artifact-led case studies and demonstrated technical thinking | long narrative depth unsupported by current project evidence |

Design-quality cross-checks:

- The Academic Designer's 2023 contest judged academic sites across content, design and organization, about, portfolio, and contact information; judges explicitly valued clear structure, personality, and discoverable depth rather than platform sophistication.
- Distill's editorial standard treats interactive media as a tool for outstanding communication and human understanding, with scientific integrity and transparent weaknesses. This is a better model than adding motion for spectacle.
- web.dev recommends readable line length, intentional line height, and responsive typography rather than merely fitting text into the viewport.
- web.dev recommends transform and opacity for performance-sensitive motion.
- W3C technique C39 supports suppressing non-essential motion through `prefers-reduced-motion`.

## Three New Visual Directions

### 1. Research Candidate Dossier

Positioning: the most credible choice for lab supervisors and technical recruiters.

- Neutral mineral-gray and warm-white palette with one cobalt signal color.
- Compact 12-column institutional grid, not a giant editorial poster.
- Header immediately states HCMUS, first-year status, algorithms-to-AI direction, CV, GitHub, and contact.
- A right-side evidence ledger surfaces GPA, Codeforces rating, and achievements above the fold.
- Selected work is shown as three proof modules with status, contribution, artifact, and next question.
- Imagery is limited to real evidence thumbnails and small diagrammatic marks.
- Motion: ledger rows lock into place; project evidence expands in context; no ambient parallax.

Risk: can feel too formal unless the writing retains a human voice.

### 2. Proof-of-Work Lab Console

Positioning: the strongest bridge between competitive programming and AI systems.

- Bright off-white interface with black structure, electric cobalt, and restrained signal-lime accents; explicitly avoids the current dark sci-fi treatment.
- A horizontal trajectory model connects Algorithms -> Competitive Programming -> ML Foundations -> AI Research Questions.
- Hero is compact; the first project case study begins within the initial viewport.
- Metrics appear as traceable “evidence packets,” not decorative counters.
- Project modules expose problem, approach, artifact, status, and repository.
- Motion: scrub or scroll advances the trajectory and swaps real artifacts, with a static reduced-motion equivalent.

Risk: must avoid looking like a SaaS dashboard or inventing live data.

### 3. Annotated Learning Atlas

Positioning: the most distinctive and human direction, emphasizing disciplined growth rather than fake seniority.

- Warm canvas, graphite type, vermilion annotations, and deep-blue technical marks.
- A vertical map follows the real path from informatics awards to Codeforces, HCMUS, structured ICPC training, and current AI questions.
- Real artifacts become the visual language: workbook cells, code excerpts, FFT diagrams, project UI, and note fragments.
- Typography uses one humanist serif for narrative and one rigorous sans for labels/data; handwriting appears only as sparse annotation.
- Motion: annotations draw in, artifacts pin briefly during explanation, and the trajectory line grows with scroll.

Risk: without curated real artifacts it can become scrapbook-like; the first implementation must use only verified material.

## Recommendation Before Selection

Do not choose solely from style preference. Evaluate each mock against three questions:

1. Can a lab supervisor identify identity, strongest evidence, and research direction within 20-30 seconds?
2. Does the first viewport contain proof, not only branding?
3. Can every visual claim be backed by a real artifact or clearly marked as decorative?

No implementation patch plan should be written until one direction is selected.

## Sources

- https://github.com/academicpages/academicpages.github.io
- https://github.com/alshedivat/al-folio
- https://github.com/bchiang7/v4
- https://github.com/leerob/next-mdx-blog
- https://github.com/craftzdog/craftzdog-homepage
- https://github.com/antfu/antfu.me
- https://maggieappleton.com/
- https://2019.wattenberger.com/
- https://theacademicdesigner.com/2023/winners-of-the-2023-best-personal-academic-websites-contest/
- https://distill.pub/journal/
- https://web.dev/learn/design/typography/
- https://web.dev/articles/animations-and-performance
- https://www.w3.org/WAI/WCAG22/Techniques/css/C39
