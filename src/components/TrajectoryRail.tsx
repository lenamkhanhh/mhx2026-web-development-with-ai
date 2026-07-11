import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { trajectory } from "../content";

function TrajectoryNode({
  index,
  progress,
}: {
  index: number;
  progress: MotionValue<number>;
}) {
  const start = Math.max(0, index * 0.28 - 0.06);
  const end = Math.min(1, start + 0.22);
  const opacity = useTransform(progress, [start, end], [0.64, 1]);
  const scale = useTransform(progress, [start, end], [0.86, 1]);
  const stage = trajectory[index];

  return (
    <motion.li style={{ opacity }} className="trajectory-node">
      <motion.span className="trajectory-marker" style={{ scale }}>
        {stage.marker}
      </motion.span>
      <div>
        <h3>{stage.title}</h3>
        <p>{stage.description}</p>
      </div>
    </motion.li>
  );
}

export function TrajectoryRail() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 55%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.25 });
  const staticProgress = useMotionValue(1);

  return (
    <section className="trajectory-section" id="trajectory" ref={ref}>
      <div className="section-label">
        <span>01</span>
        <p>Learning trajectory</p>
      </div>
      <div className="trajectory-track" aria-hidden="true">
        <motion.span
          className="trajectory-fill"
          style={reduce ? { scaleX: 1, scaleY: 1 } : { scaleX: progress, scaleY: progress }}
        />
      </div>
      <ol className="trajectory-list">
        {trajectory.map((stage, index) => (
          <TrajectoryNode
            index={index}
            progress={reduce ? staticProgress : progress}
            key={stage.title}
          />
        ))}
      </ol>
    </section>
  );
}
