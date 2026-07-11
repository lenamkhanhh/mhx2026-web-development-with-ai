# Portfolio and Motion Landscape

Generated: 2026-07-11  
Scope: academic portfolio structure, developer-portfolio presentation, open-source adoption, interaction patterns, accessibility, and suitability for Le Nam Khanh's internship/lab applications.

## Executive Summary

The strongest direction is not to install a popular template unchanged. High-adoption academic themes provide excellent information architecture but tend to look generic and publication-heavy for a first-year student. Highly starred developer portfolios provide clearer narrative pacing and stronger project presentation, but many prioritize engineering employment over academic credibility. The recommended synthesis is an original, content-first academic portfolio with a restrained interactive layer: editorial typography, verifiable evidence, a clear transition from competitive programming to AI research, and motion that helps visitors understand hierarchy.

GitHub stars below are live snapshots retrieved from the GitHub API on 2026-07-11. Stars indicate adoption and interest, not design quality on their own.

## 1. Open-source Landscape

| Repository | Stars | What it does well | Limitation for this portfolio | Decision |
|---|---:|---|---|---|
| [Academic Pages](https://github.com/academicpages/academicpages.github.io) | 17,280 | Familiar academic navigation, publications, talks, teaching, CV | Optimized for established academics; can emphasize empty sections for a first-year student | Borrow information hierarchy only |
| [al-folio](https://github.com/alshedivat/al-folio) | 15,840 | Clean academic typography, projects, news, repositories, social previews | Common visual identity; Jekyll complexity is unnecessary for this custom interactive direction | Borrow evidence-led project and note structure |
| [Bartosz Jarocki CV](https://github.com/BartoszJarocki/cv) | 9,674 | Dense, scannable CV presentation and strong print sensibility | Too resume-like for narrative research positioning | Borrow concise evidence density |
| [Brittany Chiang v4](https://github.com/bchiang7/v4) | 8,260 | Strong personal narrative, focused calls to action, memorable visual system | Developer-career framing and widely copied layout | Borrow pacing, not visual styling |
| [developerFolio](https://github.com/saadpasta/developerFolio) | 6,586 | Easy customization and comprehensive developer sections | Template-like card inventory; risks generic output | Reject as a direct base |
| [Hugo Academic CV](https://github.com/HugoBlox/theme-academic-cv) | 4,988 | Research-oriented data model, Markdown ownership, free deployment | More machinery than current content needs; default presentation is conventional | Borrow future extensibility concepts |
| [DevPortfolio](https://github.com/RyanFitzgerald/devportfolio) | 4,930 | Simple, approachable starter and clear section order | Limited differentiation and academic depth | Reject as a direct base |

[HugoBlox's official Academic theme page](https://hugoblox.com/hugo-academic) reports a broader Hugo Academic ecosystem with more than 9,000 stars and explicitly supports free GitHub Pages/Netlify deployment. This supports the durability of Markdown-first academic content, but it does not require choosing Hugo for this implementation.

## 2. What Lab Supervisors Need to See

This is an inference from the candidate's goal and available evidence, informed by the recurring information architecture of the academic themes above:

1. Identity and research direction immediately.
2. Verifiable academic and competition evidence before broad skill lists.
3. A small number of selected works with problem, method, contribution, and current status.
4. Evidence of disciplined learning and technical communication.
5. A frictionless CV and contact path.

The site should not manufacture publications, professional experience, impact metrics, or testimonials. Empty conventional sections weaken the story. “Research interests” and “current explorations” are more credible than “research experience” until actual work exists.

## 3. Recommended Narrative

The homepage should tell one story:

> Strong algorithmic foundations -> disciplined competitive-programming evidence -> deliberate transition into AI/ML research -> selected technical work and writing -> invitation to discuss an internship or lab opportunity.

Recommended sequence:

1. Academic hero and concise thesis.
2. Evidence strip: HCMUS, GPA, Codeforces Expert 1796, selected award.
3. Research direction expressed as questions or topics, not inflated expertise.
4. Selected work with honest status and concrete evidence.
5. Achievement timeline.
6. Research notes/blog.
7. CV and direct contact.

## 4. Motion and Interaction Research

### Recommended techniques

- **Progressive text reveal:** short hero phrases appear by line or word, preserving readable HTML underneath.
- **Scroll-triggered evidence transitions:** achievements and project details enter with small opacity and vertical transforms.
- **Connected research map:** a subtle interactive line/particle field connects Algorithms, ML, NLP, CV, and LLM interests without pretending to be a data visualization.
- **Sticky project narrative:** on larger screens, project context remains visible while evidence changes; mobile falls back to normal document flow.
- **Magnetic micro-interactions:** only on primary actions, with very small pointer displacement.
- **Shared-layout transitions:** opening a project/note preserves spatial context where supported.
- **Number emphasis:** ratings and results animate once into place, but the final value exists in static markup and does not depend on animation.

### Accessibility and performance constraints

- Motion must respect `prefers-reduced-motion`. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility) documents this user preference for reducing non-essential animation, and [Motion's `useReducedMotion`](https://motion.dev/docs/react-use-reduced-motion) provides an application-level implementation path.
- Prefer opacity and transform animation; avoid repeated layout-changing animation.
- Use scroll animation to reinforce reading order, not trap or hijack scrolling.
- Avoid custom cursors, long preloader sequences, autoplay audio, excessive WebGL, and horizontal scroll that hides normal page structure.
- If GSAP is selected for one complex sequence, use it narrowly. Its official [ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) emphasizes synchronized, optimized scroll updates, but a full animation stack is unnecessary for routine reveals.
- Keep meaningful content accessible without JavaScript and without motion.

## 5. Visual Direction Principles

- Editorial serif or humanist display type paired with a precise sans-serif body face.
- Warm neutral or paper-like base rather than a generic black developer theme.
- One technical accent color, used for links, focus, graph nodes, and selected evidence.
- Large whitespace and asymmetric academic-grid composition.
- Thin rules, labels, footnote-like metadata, and figure numbering as academic visual language.
- Avoid a page made entirely of rounded cards.
- Use real imagery when supplied; until then, use abstract generated research textures rather than exposed placeholder boxes.

## 6. Three Directions to Explore

### Living Research Paper

A warm editorial page resembling a contemporary research paper or conference microsite. Motion reveals annotations, citations, and a connected research diagram. Best fit for lab credibility.

### Algorithmic Observatory

A deep ink interface with precise luminous graph traces and code/algorithm motifs. Stronger competitive-programming identity, but must remain restrained enough for academic use.

### Kinetic Academic Index

A high-contrast typographic index with oversized section numbers, a vertical evidence timeline, and fluid layout transitions. Most contemporary and expressive while retaining readability.

## 7. Recommendation

Start from **Living Research Paper**, then borrow the graph interaction from **Algorithmic Observatory** and the typographic pacing from **Kinetic Academic Index** if the chosen mock benefits from them. Use a custom Astro/React implementation rather than installing an academic theme unchanged. This keeps content Markdown-friendly, supports a future blog, enables selective motion, and remains straightforward to deploy on Netlify.

## Methodology

- Compared high-adoption academic and developer portfolio repositories through GitHub API metadata.
- Reviewed official theme positioning and deployment support.
- Reviewed official accessibility and animation documentation from MDN, Motion, and GSAP.
- Used GitHub stars as one adoption signal, cross-checked against audience fit and current content; stars were not treated as a quality ranking.

## 2026-07-11 Motion and Type Polish Addendum

The first implementation pass was visually faithful but read as static because motion was limited to subtle page fades, below-the-fold reveals, and slow image drift. The polish pass therefore adopted a more legible motion hierarchy:

1. A staggered hero entrance establishes reading order.
2. Pointer-linked spring parallax makes each hero artwork visibly interactive.
3. A scroll-linked progress rule gives continuous page feedback.
4. Observatory orbit pulses reinforce its computational trajectory without hijacking scroll.
5. Work rows retain stateful expansion and directional arrow response.

Type scales were narrowed with `clamp()` bounds so display text remains expressive without dominating the evidence and primary actions. Motion remains limited to transforms and opacity where possible, and the existing reduced-motion fallback remains mandatory.

Additional primary references:

- [Motion scroll animations](https://motion.dev/docs/react-scroll-animations)
- [web.dev animation performance](https://web.dev/articles/animations-and-performance)
- [web.dev responsive typography](https://web.dev/learn/design/typography/)
