# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Portfolio decisions

- The legacy prototype contained three themes: Living Research Paper, Algorithmic Observatory, and Kinetic Academic Index. The selected redesign replaces them in the visitor-facing runtime.
- All themes use one evidence-led English content source and must avoid fabricated experience or research claims.
- Motion is purposeful, must respect reduced-motion preferences, and cannot block reading or navigation.
- Real profile/project images may replace the generated abstract hero assets later without restructuring the layouts.
- Redesign selection (2026-07-11): replace the three-theme presentation with the Proof-of-Work Lab Console direction. Its final motion language should behave like a living proof ledger, not a dark sci-fi dashboard or cinematic scroll experience.
- Workspace migration (2026-07-11): the complete portfolio project and its personal-portfolio docs now live at `D:\Code\Code\portfolio web`, separate from the AI Account Switcher app.
- Motion expansion (2026-07-11): keep the Proof-of-Work Lab Console structure, but add a Chromatic Research Field with colorful contour/particle backgrounds and a small number of PowerPoint-Morph-like full-scene transitions. The approved sequence is hero field -> trajectory line -> project field -> contact collapse; avoid scroll hijacking, excessive neon, or motion that competes with evidence.
- Motion optimization (2026-07-11): replace the page-wide four-scene background state machine with one Sticky Aperture Zoom scoped to the hero. The field starts contained, zooms toward a full-viewport focal point, then settles as a quiet static background; no infinite blob drift, pointer parallax, or background state changes across later sections.
- Background direction refinement (2026-07-11): retire the morph/zoom concept in favor of a light technical-editorial background combining Academic Constellation and Topographic Blueprint. ProxyLLM is a preferred reference for typography, infrastructure-style detailing, sparse network atmosphere, and a background that fades in opacity/contrast as the page scrolls. Keep the portfolio light rather than copying ProxyLLM's dark terminal skin; use only a cheap scroll-linked opacity fade, no geometry movement, canvas loop on mobile, or section-to-section background state changes.
- Background density feedback (2026-07-11): the first Academic Infrastructure Blueprint mock feels too empty because constellation and contour details stay near the edges. Increase visual mass with a page-spanning research-atlas composition, denser clustered constellations, broader topographic bands, and a restrained spectral wash through the center, while preserving clear reading zones around evidence and headlines.
- Fidelity correction (2026-07-11): the generated dense-atlas mock is the source of truth; a viewport-fixed sparse SVG with highly opaque section washes is not an acceptable approximation. The implemented atlas must span the full document, repeat meaningful constellation/topographic detail through every light section, and retain substantially more visible linework behind translucent reading zones.
- Fixed-field correction (2026-07-12): replace the document-spanning atlas as the main atmosphere with a ProxyLLM-style fixed Canvas 2D constellation field behind scrolling content. Keep only a quiet fixed SVG blueprint overlay (grid, contours, coordinate marks); use no pointer input, scroll-driven geometry, morph, zoom, or scene transitions. Reduced motion and Save-Data render exactly one deterministic frame then stop RAF.
