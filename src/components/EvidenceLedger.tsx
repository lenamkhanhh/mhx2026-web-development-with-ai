import { ArrowUpRight, BracketsCurly, GraduationCap, Trophy } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { headlineEvidence } from "../content";
import { heroItem } from "../motion";

const icons = [GraduationCap, BracketsCurly, Trophy];

export function EvidenceLedger() {
  const reduce = useReducedMotion();

  return (
    <div className="evidence-ledger" aria-label="Verified highlights">
      {headlineEvidence.map((item, index) => {
        const Icon = icons[index];
        const body = (
          <>
            <span className="evidence-icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="evidence-copy">
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              <span>{item.context}</span>
            </span>
            {item.href && <ArrowUpRight className="evidence-arrow" aria-hidden="true" />}
          </>
        );

        return (
          <motion.div
            variants={reduce ? undefined : heroItem}
            className={`evidence-row tone-${item.tone}`}
            key={item.label}
          >
            {item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer">
                {body}
              </a>
            ) : (
              <div>{body}</div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
