/**
 * Host renderer for the 3D jungle (Three.js). The recipe provides it through
 * NatureWorldRendererContext; the foundation stage stays free of three.
 * The canvas draws the host's frame and reports it in data-km-gl-frame.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createNatureWorld3D } from "./nature-world-3d";
import type { NatureWorld3D } from "./nature-world-3d";
import type { NatureWorldRendererProps } from "./nature-world-identity-reveal-stage";

export function NatureWorldCanvas({ config, frame, pixelWidth, pixelHeight, onError }: NatureWorldRendererProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const world = useRef<NatureWorld3D | null>(null);
  const latest = useRef(frame);
  latest.current = frame;
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const key = JSON.stringify(config);
  useEffect(() => {
    let live = true;
    const el = canvas.current;
    if (!el) return;
    setState("loading");
    createNatureWorld3D(el, JSON.parse(key), pixelWidth, pixelHeight).then(w => {
      if (!live) { w.dispose(); return; }
      world.current = w; size.current = { w: pixelWidth, h: pixelHeight }; w.render(latest.current); el.setAttribute("data-km-gl-frame", String(latest.current)); setState("ready");
    }, error => { if (live) { setState("error"); onError?.(error instanceof Error ? error.message : String(error)); } });
    return () => { live = false; world.current?.dispose(); world.current = null; };
    // The serialized config captures every input the scene reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const size = useRef({ w: pixelWidth, h: pixelHeight });
  useLayoutEffect(() => {
    if (!world.current || !canvas.current) return;
    // Resize before drawing, so the first frame after an aspect change is drawn at the new size.
    if (size.current.w !== pixelWidth || size.current.h !== pixelHeight) { world.current.resize(pixelWidth, pixelHeight); size.current = { w: pixelWidth, h: pixelHeight }; }
    world.current.render(frame);
    canvas.current.setAttribute("data-km-gl-frame", String(frame));
  });
  return <canvas ref={canvas} width={pixelWidth} height={pixelHeight} aria-hidden="true" data-km-terrain-state={state}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}/>;
}
