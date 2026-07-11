---
type: brainstorm
feature: personal-portfolio
idea_slug: academic-interactive-portfolio
status: approved
lang: en
owner: "@lenamkhanhh"
created: 2026-07-11
updated: 2026-07-11
links:
  - https://github.com/lenamkhanhh
  - https://codeforces.com/profile/Average2k7
tags: [brainstorm, portfolio, academic, interactive]
stale_reason: ""
changelog:
  - 2026-07-11 | /brainstorm | initial approved brief from user interview and CV review
---

# Academic Interactive Portfolio - Brainstorm

> Feature: personal-portfolio | Idea: academic-interactive-portfolio

## 1. Idea Seed

Build an English-language personal portfolio for Le Nam Khanh, a first-year HCMUS Information Technology student applying for internships and opportunities in AI/CS research labs. The site should present academic potential honestly through competitive-programming results, university performance, competitions, selected technical work, research interests, and technical writing.

## 2. Context and Purpose

- Primary problem: the candidate has strong early evidence but little formal work experience, so a conventional experience-heavy portfolio would undersell him.
- Primary audience: AI/CS lab supervisors, research mentors, and technical intern recruiters.
- Positioning: a first-year student with unusually strong algorithmic foundations who is moving deliberately toward AI research.
- Current evidence: HCMUS GPA, Codeforces Expert rating, informatics awards, IELTS, public GitHub work, and an evolving ICPC training system.
- Why now: a credible public identity is needed for internship and lab applications, while future research notes can also attract readers and GitHub stars.

## 3. User Types and Access

| User type | Primary question | Primary need |
|---|---|---|
| Lab supervisor or mentor | Does this student show research potential and disciplined learning? | Fast access to academic evidence, interests, selected work, and contact details |
| Technical intern recruiter | Is the candidate technically strong enough for an early-career opportunity? | Verifiable achievements, skills, CV, and concise project outcomes |
| Developer or student reader | Is the work useful or interesting? | Project details, research notes, demos, source links, and GitHub links |

The public site requires no account. Visitors enter through the root URL, shared deep links, search results, GitHub, Codeforces, or the CV.

## 4. Capabilities Breakdown

### P0 - must have

- English-only landing experience with a concise academic positioning statement.
- Academic profile: HCMUS, Information Technology, first-year status, and GPA 7.95/10 after the first semester.
- Selected achievements with verifiable dates and results.
- Codeforces profile showing current/max rating 1796 and Expert rank.
- Curated project/work section linking to selected GitHub repositories and live demos where available.
- Downloadable CV.
- Public email and phone number as supplied in the Viettel AI Race CV.
- Responsive mobile and desktop presentation.
- Accessible keyboard navigation and reduced-motion behavior.
- Free deployment, initially targeting `lenamkhanh.netlify.app` if available.

### P1 - should have

- Dedicated Projects index and project-detail pages.
- Blog/research-notes index with individual article pages.
- Animated academic/research motifs and scroll-driven storytelling.
- GitHub and Codeforces data presented with a clear last-updated state or safe fallback.
- Open Graph metadata, sitemap, structured metadata, and shareable article cards.

### P2 - nice to have

- Publications and research timeline when real material exists.
- Interactive algorithm or ML visualizations tied to articles.
- Custom domain such as `lenamkhanh.dev`.
- Privacy-preserving analytics.

## 5. Core Flows (Happy Path)

### Flow A - Lab supervisor evaluates the candidate

1. Visitor opens the portfolio and immediately sees the candidate's name, academic position, and research direction.
2. The page establishes credibility with compact academic and competitive-programming evidence.
3. Visitor explores selected work and opens a project or research note for deeper evidence.
4. Visitor downloads the CV or uses the visible email/phone contact.

```text
[Shared link / search / CV]
            |
            v
[Academic hero + verified highlights]
            |
            v
[Achievements] -> [Selected work] -> [Project or research detail]
                                            |
                                            v
                                  [Download CV / Contact]
```

### Flow B - Developer discovers a project

1. Visitor enters through a project/article deep link or the homepage.
2. Visitor understands the problem, contribution, evidence, and current status.
3. Visitor opens the source repository, demo, or related note.
4. Visitor may star the repository or return to explore other work.

```text
[Project card / article]
          |
          v
[Problem -> approach -> evidence -> status]
          |
          +--> [Live demo]
          +--> [GitHub source / star]
          +--> [Related note]
```

## 6. System Behavior Deep Dive

### 6.1 Decision Points

| ID | Flow | Condition | Yes | No |
|---|---|---|---|---|
| D1 | Page motion | Visitor allows motion | Show enhanced transitions and interactive motion | Use stable reduced-motion presentation |
| D2 | External profile data | Fresh data is available | Show current rating/repository information | Show verified static snapshot without breaking the page |
| D3 | Project evidence | Project has a credible demo or write-up | Expose the relevant action | Omit the action instead of showing an empty placeholder |
| D4 | Image availability | A real approved image exists | Render the final image | Render an intentional replaceable placeholder |

### 6.2 Scenario Matrix

| Visitor state | Entry point | Motion preference | Expected result |
|---|---|---|---|
| First visit | Homepage | Standard | Clear positioning, evidence, selected work, and primary actions |
| Returning visit | Deep project link | Standard | Direct access to project evidence and source/demo actions |
| Any visit | Any page | Reduced motion | Complete content and interaction without movement-dependent meaning |
| Mobile visit | Shared link | Either | Readable, fast, touch-safe navigation and contact actions |

### 6.3 State Transitions

The initial portfolio has no user-owned transactional state. Content progresses through an editorial lifecycle outside the visitor experience: `draft -> reviewed -> published -> updated`.

### 6.4 Interrupted Transactions

Not applicable to the initial static portfolio. External navigation to GitHub, Codeforces, CV download, email, and phone must never block navigation within the site.

### 6.5 Other Edge Cases

- JavaScript unavailable: core content and links remain readable.
- GitHub or Codeforces unavailable: static verified evidence remains visible.
- Missing image: preserve layout with an intentional placeholder.
- Long project title or achievement: wrap without overlap or clipping.
- Very small screen: contact information remains usable without horizontal scrolling.
- Deployment subdomain unavailable: use a close temporary Netlify name and preserve the ability to attach a custom domain later.

## 7. Validation, Limits, and Wording

- Do not claim formal work experience that does not exist.
- Label current academic status precisely: first-year student; GPA 7.95/10 after the first semester.
- Show dates and award levels exactly as supported by the CV or later evidence.
- Do not present a repository as a polished project until its README and evidence support the claim.
- Animation must not convey information that disappears in reduced-motion mode.
- Primary working labels: `View selected work`, `Read research notes`, `Download CV`, `View on GitHub`, and `Contact me`.
- External-data fallback: `Verified profile snapshot. Live data is temporarily unavailable.`
- Empty blog state: `Research notes are being prepared. Selected work is available in the meantime.`
- Missing image state should be visual only and must not expose developer placeholder text to visitors.

## 8. System Context

- Public sources: GitHub profile/repositories and Codeforces profile.
- Static source: approved CV and portfolio content stored with the site.
- External actions: GitHub, Codeforces, email, phone, CV download, and optional live project demos.
- No login, payment, private user data collection, notifications, scheduled jobs, or real-time collaboration are required for the initial release.
- Hosting target: a free static deployment on Netlify, connected to a Git repository for automatic deployment.

## 9. Assumptions

- `lenamkhanh.netlify.app` availability is not guaranteed until site creation.
- Phone number and email from the submitted CV are intentionally public by user decision.
- Real portraits and project images will be supplied later.
- English is the only interface language for the initial release.
- Blog content can begin with a high-quality empty state and be populated incrementally.
- Repository cleanup and README improvements are separate changes requiring explicit approval before editing GitHub content.

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Heavy motion harms readability or performance | Occasional | Reviewers leave early or perceive the site as less serious | Keep content-first hierarchy, cap motion density, test reduced motion and mobile performance |
| Early-stage work appears overstated | Occasional | Loss of credibility with lab supervisors | Use evidence-led wording and clearly label work in progress |
| Public phone/email attracts spam | Occasional | Unwanted contact | Use deliberate display/link treatment and revisit obfuscation if abuse appears |
| GitHub profile weakens the portfolio story | Frequent initially | Visitors see uncurated repos after a strong landing page | Curate featured work and prepare a separate GitHub cleanup plan |
| External live metrics fail or become stale | Occasional | Broken credibility element | Prefer build-time/static snapshots with visible provenance and graceful fallback |

## 11. Success Criteria

- A lab supervisor can identify the candidate's academic direction and strongest evidence within 30 seconds.
- All CV, GitHub, Codeforces, email, phone, and project links work.
- Layout is polished on current mobile and desktop viewport sizes.
- Keyboard navigation, visible focus, semantic structure, contrast, and reduced-motion behavior are verified.
- Target Lighthouse scores are approximately 90 or higher for Performance, Accessibility, Best Practices, and SEO on the deployed landing page.
- The site deploys on a free Netlify URL and remains ready for a future custom domain.
- Content contains no fabricated experience, research, project impact, or metrics.

## 12. Open Questions

- [ ] Which real portrait and project images will replace the initial placeholders?
- [ ] Which repositories will be renamed, cleaned, documented, and pinned before public launch?
- [ ] Should the public phone number remain visible if spam becomes a problem?
- [ ] What is the first research note or technical article to publish?
- [ ] Is `lenamkhanh.netlify.app` available at deployment time?

## 13. Next Steps

1. Research highly regarded academic, developer, and interactive portfolios, including adoption signals such as GitHub stars where applicable.
2. Research motion techniques that support academic storytelling, accessibility, and performance.
3. Produce exactly three visual design directions and wait for selection.
4. Turn the selected direction into an implementation plan for approval.
5. Implement and verify the portfolio, then prepare a Netlify deployment checkpoint.
6. Prepare a separate evidence-based GitHub profile/repository cleanup proposal.
