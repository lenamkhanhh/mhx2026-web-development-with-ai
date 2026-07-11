import { useEffect, useRef } from "react";
import {
  buildConstellationTopology,
  CONSTELLATION_SEED,
  createConstellationNodes,
  getConstellationProfile,
  nodePosition,
  TOPOLOGY_INTERVAL_MS,
  type ConstellationNode,
} from "../constellation";

type ConnectionLikeNavigator = Navigator & { connection?: { saveData?: boolean } };

const colors = { cobalt: "#2458dd", violet: "#7857cf", coral: "#d77b66", olive: "#849450" } as const;

function createGlowSprite() {
  const sprite = document.createElement("canvas");
  sprite.width = 24;
  sprite.height = 24;
  const context = sprite.getContext("2d");
  if (!context) return sprite;
  const gradient = context.createRadialGradient(12, 12, 1, 12, 12, 12);
  gradient.addColorStop(0, "rgba(32, 82, 222, .42)");
  gradient.addColorStop(0.38, "rgba(32, 82, 222, .12)");
  gradient.addColorStop(1, "rgba(32, 82, 222, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 24, 24);
  return sprite;
}

export function LivingConstellationField({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    const saveData = (navigator as ConnectionLikeNavigator).connection?.saveData === true;
    let profile = getConstellationProfile({ width: window.innerWidth, reducedMotion, saveData });
    let nodes: ConstellationNode[] = [];
    let topology: number[][] = [];
    let width = 1;
    let height = 1;
    let animationFrame: number | undefined;
    let lastFrame = -Infinity;
    let lastTopology = -Infinity;
    let isVisible = document.visibilityState === "visible";
    let isIntersecting = true;
    let disposed = false;
    const sprite = createGlowSprite();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      profile = getConstellationProfile({ width, reducedMotion, saveData });
      nodes = createConstellationNodes(CONSTELLATION_SEED, profile.nodeCount);
      topology = buildConstellationTopology(nodes, width, height, 0, profile.radius);
      lastTopology = 0;
      if (profile.mode === "static") draw(0);
    };

    const draw = (time = 0) => {
      const seconds = time / 1000;
      const positions = nodes.map((node) => nodePosition(node, width, height, seconds));
      context.clearRect(0, 0, width, height);
      context.beginPath();
      topology.forEach((neighbours, index) => neighbours.forEach((neighbour) => {
        if (neighbour <= index) return;
        context.moveTo(positions[index].x, positions[index].y);
        context.lineTo(positions[neighbour].x, positions[neighbour].y);
      }));
      context.strokeStyle = "rgba(37, 86, 211, .24)";
      context.lineWidth = 0.75;
      context.stroke();

      nodes.forEach((node, index) => {
        const point = positions[index];
        const twinkle = 0.64 + (Math.sin(seconds * (Math.PI * 2 / node.twinklePeriod) + node.twinklePhase) + 1) * 0.18;
        context.globalAlpha = twinkle;
        context.drawImage(sprite, point.x - 12, point.y - 12);
        context.beginPath();
        context.arc(point.x, point.y, node.accent === "cobalt" ? 1.7 : 2.7, 0, Math.PI * 2);
        context.fillStyle = colors[node.accent];
        context.fill();
      });
      context.globalAlpha = 1;
    };

    const stop = () => {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
    };

    const schedule = () => {
      if (!disposed && profile.mode === "animated" && isVisible && isIntersecting && animationFrame === undefined) animationFrame = requestAnimationFrame(frame);
    };

    const frame = (time: number) => {
      animationFrame = undefined;
      if (profile.mode !== "animated" || !isVisible || !isIntersecting || disposed) return;
      if (time - lastFrame >= 1000 / profile.fps) {
        if (time - lastTopology >= TOPOLOGY_INTERVAL_MS) {
          topology = buildConstellationTopology(nodes, width, height, time / 1000, profile.radius);
          lastTopology = time;
        }
        draw(time);
        lastFrame = time;
      }
      schedule();
    };

    const onVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
      if (isVisible) schedule();
      else stop();
    };
    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting) schedule();
      else stop();
    });

    resize();
    if (profile.mode === "animated") draw(0);
    observer.observe(canvas);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule();

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="living-constellation-field" aria-hidden="true" data-testid="living-constellation-field" />;
}
