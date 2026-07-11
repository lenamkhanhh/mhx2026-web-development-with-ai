import { useState } from "react";
import { ArrowRight, GithubLogo } from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { work } from "../content";
import { layoutTransition } from "../motion";
import { ArtifactPreview } from "./ArtifactPreview";

export function ProjectEvidence() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const selected = work[active];

  return (
    <section className="work-section" id="work">
      <div className="section-heading">
        <div className="section-label">
          <span>02</span>
          <p>Selected evidence</p>
        </div>
        <div>
          <h2>Work in public, without inflated claims.</h2>
          <p>
            Three current artifacts that show how I structure learning, build early ideas, and explain algorithms.
          </p>
        </div>
      </div>

      <LayoutGroup>
        <div className="project-tabs" role="tablist" aria-label="Selected work">
          {work.map((item, index) => (
            <motion.button
              layout
              transition={reduce ? { duration: 0 } : layoutTransition}
              className={active === index ? "project-tab active" : "project-tab"}
              onClick={() => setActive(index)}
              role="tab"
              id={`project-tab-${index}`}
              aria-selected={active === index}
              aria-controls="selected-project-detail"
              key={item.title}
            >
              <span className="project-tab-topline">
                <b>0{index + 1}</b>
                <small>{item.status}</small>
              </span>
              <span className="project-preview">
                <ArtifactPreview kind={item.artifactKind} />
              </span>
              <span className="project-tab-title">{item.title}</span>
              <span>{item.focus}</span>
              {active === index && (
                <motion.span className="active-rule" layoutId="active-project-rule" />
              )}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            layout
            id="selected-project-detail"
            className="project-detail"
            role="tabpanel"
            aria-labelledby={`project-tab-${active}`}
            aria-live="polite"
            key={selected.title}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={reduce ? { duration: 0 } : layoutTransition}
          >
            <div className="project-detail-index">0{active + 1}</div>
            <div className="project-detail-copy">
              <span className="status-pill">{selected.status}</span>
              <h3>{selected.title}</h3>
              <p>{selected.detail}</p>
            </div>
            <div className="artifact-ledger">
              <small>Current artifact</small>
              <p>{selected.artifact}</p>
            </div>
            <a className="project-link" href={selected.href} target="_blank" rel="noreferrer">
              <GithubLogo aria-hidden="true" />
              {selected.action}
              <ArrowRight aria-hidden="true" />
            </a>
          </motion.article>
        </AnimatePresence>
      </LayoutGroup>
    </section>
  );
}
