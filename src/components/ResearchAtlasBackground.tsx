import { LivingConstellationField } from "./LivingConstellationField";

export function ResearchAtlasBackground({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="research-atlas" aria-hidden="true" data-motion={reducedMotion ? "static" : "ambient"}>
      <div className="atlas-spectral-wash" />
      <LivingConstellationField reducedMotion={reducedMotion} />
      <svg className="blueprint-overlay" viewBox="0 0 1440 1024" preserveAspectRatio="none">
        <defs>
          <pattern id="blueprint-grid" width="72" height="72" patternUnits="userSpaceOnUse">
            <path d="M 72 0 L 0 0 0 72" fill="none" />
          </pattern>
        </defs>
        <rect width="1440" height="1024" fill="url(#blueprint-grid)" />
        <g className="blueprint-contours">
          {[0, 1, 2, 3, 4].map((index) => <path key={index} transform={`translate(${index * 17} ${index * 11})`} d="M-30 816C132 700 192 852 344 728C506 596 614 748 768 624C902 516 1050 632 1216 498C1304 426 1376 468 1472 372" />)}
          {[0, 1, 2, 3].map((index) => <path key={index} transform={`translate(${-index * 18} ${index * 14})`} d="M442 -22C554 82 620 4 716 120C806 228 902 138 998 252C1094 364 1186 278 1294 384C1372 460 1412 440 1480 520" />)}
        </g>
        <g className="blueprint-marks">
          <path d="M54 92H82M68 78V106M1322 164H1350M1336 150V178M114 872H142M128 858V886M1288 884H1316M1302 870V898" />
          <path d="M82 996H248M1192 996H1358M24 236V378M1416 604V746" />
          <text x="84" y="112">FIELD / 49374</text>
          <text x="1182" y="976">COORD 10° 50′ N</text>
          <text x="108" y="854">ALGORITHMS → AI</text>
        </g>
      </svg>
    </div>
  );
}
