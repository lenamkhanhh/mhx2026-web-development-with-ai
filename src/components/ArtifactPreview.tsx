import { motion, useReducedMotion } from "motion/react";
import type { ArtifactKind } from "../content";

function TrainingPreview() {
  return (
    <div className="training-preview" aria-hidden="true">
      {["Training plan", "Topic task bank", "Verified anchors", "Audit reports", "Workbook"].map(
        (label, index) => (
          <div className="training-step" key={label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <b>{label}</b>
          </div>
        ),
      )}
    </div>
  );
}

function VoxelPreview() {
  return (
    <svg className="artifact-svg voxel-preview" viewBox="0 0 320 180" role="img" aria-label="Abstract voxel structure">
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M74 111 160 62l86 49-86 50Z" />
        <path d="M74 111v28l86 49 86-49v-28" />
        <path d="m117 86 86 50m-129 0 86-50 86 50m-129-25 86 50" opacity=".35" />
        <path d="M160 62v99m43-74v99m-86-99v99" opacity=".4" />
      </g>
      <g fill="currentColor">
        <rect x="145" y="46" width="30" height="30" opacity=".95" />
        <rect x="189" y="73" width="28" height="28" opacity=".45" />
        <rect x="102" y="98" width="28" height="28" opacity=".25" />
      </g>
    </svg>
  );
}

function FftPreview() {
  const reduce = useReducedMotion();
  const paths = [
    "M34 36 C104 36 108 144 178 144 S252 36 286 36",
    "M34 72 C104 72 108 108 178 108 S252 72 286 72",
    "M34 108 C104 108 108 72 178 72 S252 108 286 108",
    "M34 144 C104 144 108 36 178 36 S252 144 286 144",
  ];

  return (
    <svg className="artifact-svg fft-preview" viewBox="0 0 320 180" role="img" aria-label="FFT butterfly structure">
      {paths.map((path, index) => (
        <motion.path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          initial={reduce ? false : { pathLength: 0, opacity: 0.2 }}
          whileInView={reduce ? undefined : { pathLength: 1, opacity: 0.72 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.65, delay: index * 0.05 }}
          key={path}
        />
      ))}
      {[36, 72, 108, 144].flatMap((y) => [34, 178, 286].map((x) => (
        <circle cx={x} cy={y} r="4" fill="currentColor" key={`${x}-${y}`} />
      )))}
    </svg>
  );
}

export function ArtifactPreview({ kind }: { kind: ArtifactKind }) {
  if (kind === "training") return <TrainingPreview />;
  if (kind === "voxel") return <VoxelPreview />;
  return <FftPreview />;
}
