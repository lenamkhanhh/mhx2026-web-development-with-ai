import { ArrowDown, DownloadSimple, GithubLogo } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { contact, interests, profile } from "../content";
import { heroGroup, heroItem } from "../motion";
import { ContactPanel } from "./ContactPanel";
import { ResearchAtlasBackground } from "./ResearchAtlasBackground";
import { EvidenceLedger } from "./EvidenceLedger";
import { ProjectEvidence } from "./ProjectEvidence";
import { TrajectoryRail } from "./TrajectoryRail";

export function PortfolioPage() {
  const reduce = useReducedMotion();

  return (
    <main className="portfolio-shell">
      <ResearchAtlasBackground reducedMotion={Boolean(reduce)} />
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Le Nam Khanh, back to top">
          <span>NK</span>
          <b>LÊ NAM KHÁNH</b>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#work">Work</a>
          <a href="#trajectory">Trajectory</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="header-cv" href={contact.cv.href} download>
          <DownloadSimple aria-hidden="true" />
          CV
        </a>
      </header>

      <section className="hero" id="top">
        <motion.div
          className="hero-copy"
          variants={reduce ? undefined : heroGroup}
          initial={reduce ? false : "hidden"}
          animate="visible"
        >
          <motion.p variants={reduce ? undefined : heroItem} className="overline">
            {profile.degree} · {profile.school}
          </motion.p>
          <motion.h1 variants={reduce ? undefined : heroItem}>{profile.name}</motion.h1>
          <motion.p variants={reduce ? undefined : heroItem} className="hero-thesis">
            {profile.thesis}
          </motion.p>
          <motion.p variants={reduce ? undefined : heroItem} className="hero-intro">
            {profile.intro}
          </motion.p>
          <motion.div variants={reduce ? undefined : heroItem} className="hero-actions">
            <a className="button button-primary" href="#work">
              View project evidence
              <ArrowDown aria-hidden="true" />
            </a>
            <a className="text-link" href={contact.github.href} target="_blank" rel="noreferrer">
              <GithubLogo aria-hidden="true" />
              GitHub profile
            </a>
          </motion.div>
        </motion.div>
        <motion.div
          variants={reduce ? undefined : heroGroup}
          initial={reduce ? false : "hidden"}
          animate="visible"
        >
          <EvidenceLedger />
        </motion.div>
      </section>

      <TrajectoryRail />
      <ProjectEvidence />

      <section className="interests-section" aria-labelledby="interests-title">
        <div className="section-label">
          <span>03</span>
          <p>Current interests</p>
        </div>
        <div>
          <h2 id="interests-title">Questions I am building toward.</h2>
          <p className="interests-intro">
            These are directions of study—not claims of expertise or published research.
          </p>
          <div className="interest-list">
            {interests.map((interest, index) => (
              <div key={interest}>
                <span>0{index + 1}</span>
                <strong>{interest}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContactPanel />
    </main>
  );
}
