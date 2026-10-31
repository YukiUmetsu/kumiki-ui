/**
 * WebGL host for the bending-page book. Decodes the authored PBR maps and HDRI
 * before the first draw (never draws a placeholder), builds the rig once per
 * input set, then renders exactly once per host frame. The canvas reports the
 * frame it last drew in `data-km-gl-frame` so capture can wait for it.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ACESFilmicToneMapping, PCFShadowMap, PMREMGenerator, SRGBColorSpace, WebGLRenderer } from "three";
import type { DataTexture, Texture } from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import type { SurfaceMaps } from "../scene-templates";
import { createPageTurnBook } from "./page-turn-book";
import type { PageTurnBook, SurfaceImages } from "./page-turn-book";
import { loadImage } from "./page-turn-story-stage";
import type { PageTurnRendererProps } from "./page-turn-story-stage";

interface Loaded { cover?: SurfaceImages; desk?: SurfaceImages; hdr?: DataTexture }
const hdrCache = new Map<string, Promise<DataTexture>>();
function loadHdr(src: string): Promise<DataTexture> {
  let job = hdrCache.get(src);
  if (!job) { job = new HDRLoader().loadAsync(src); hdrCache.set(src, job); job.catch(() => hdrCache.delete(src)); }
  return job;
}
async function loadMaps(m?: SurfaceMaps): Promise<SurfaceImages | undefined> {
  if (!m) return undefined;
  const [color, normal, roughness] = await Promise.all([m.color, m.normal, m.roughness].map(a => a ? loadImage(a.src) : undefined));
  return { color, normal, roughness, repeat: m.repeat };
}

export function PageTurnBookCanvas({ spec, shape, painted, state, frame, pixelWidth, pixelHeight, onUnavailable }: PageTurnRendererProps) {
  const c = spec.content;
  const host = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const rig = useRef<{ renderer: WebGLRenderer; book: PageTurnBook; env?: Texture } | null>(null);
  const latest = useRef({ state, frame }); latest.current = { state, frame };
  const mapsKey = JSON.stringify([c.cover?.maps, c.environment?.surface?.maps, c.environment?.hdri?.src]);
  const [loaded, setLoaded] = useState<{ key: string; value?: Loaded; error?: string }>({ key: "" });
  useEffect(() => {
    let live = true;
    Promise.all([loadMaps(c.cover?.maps), loadMaps(c.environment?.surface?.maps), c.environment?.hdri ? loadHdr(c.environment.hdri.src) : undefined])
      .then(([cover, desk, hdr]) => live && setLoaded({ key: mapsKey, value: { cover, desk, hdr } }),
        e => live && setLoaded({ key: mapsKey, error: e instanceof Error ? e.message : String(e) }));
    return () => { live = false; };
    // mapsKey captures every asset read here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey]);
  const ready = loaded.key === mapsKey ? loaded.value : undefined;
  const failed = loaded.key === mapsKey ? loaded.error : undefined;
  useEffect(() => { if (failed) onUnavailable(failed); }, [failed, onUnavailable]);

  useEffect(() => {
    if (!host.current || !ready) return;
    // A fresh canvas per rig: a context released by forceContextLoss() cannot be reused.
    const el = document.createElement("canvas");
    el.width = pixelWidth; el.height = pixelHeight; el.setAttribute("aria-hidden", "true"); el.setAttribute("data-km-book-canvas", "");
    Object.assign(el.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
    host.current.appendChild(el); canvas.current = el;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ canvas: el, antialias: true, preserveDrawingBuffer: true, alpha: false, powerPreference: "high-performance" }); }
    catch (e) { el.remove(); onUnavailable(e instanceof Error ? e.message : "WebGL unavailable"); return; }
    renderer.setPixelRatio(1); renderer.setSize(pixelWidth, pixelHeight, false);
    renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFShadowMap;
    let env: Texture | undefined;
    if (ready.hdr) { const pm = new PMREMGenerator(renderer); env = pm.fromEquirectangular(ready.hdr).texture; pm.dispose(); }
    const l = c.environment?.light ?? {};
    const book = createPageTurnBook({
      shape, side: c.direction === "right" ? -1 : 1, faces: painted.faces, edgeCanvas: painted.edge, paper: { normal: painted.paperNormal },
      cover: { color: c.cover?.color ?? "#2b4a3a", roughness: c.cover?.roughness ?? .82, maps: ready.cover, headband: c.cover?.headband, material: c.cover?.material ?? "cloth" },
      desk: { color: c.environment?.surface?.color ?? "#7a5236", roughness: c.environment?.surface?.roughness ?? .55, maps: ready.desk },
      light: { azimuth: l.azimuth ?? 320, elevation: l.elevation ?? 52, warmth: l.warmth ?? 3200, intensity: l.intensity ?? 1 },
      environment: env, backdrop: c.environment?.backdrop ?? "#0d0906", shadowOpacity: c.paper?.shadowOpacity ?? .55,
    });
    rig.current = { renderer, book, env };
    book.update(latest.current.state); renderer.render(book.scene, book.camera);
    el.setAttribute("data-km-gl-frame", String(latest.current.frame));
    return () => { rig.current = null; canvas.current = null; book.dispose(); env?.dispose(); renderer.dispose(); renderer.forceContextLoss(); el.remove(); };
    // Rebuild only when the inputs that shape the rig change; per-frame state flows through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, painted, shape, pixelWidth, pixelHeight]);
  useLayoutEffect(() => {
    const r = rig.current;
    if (!r || !canvas.current) return;
    r.book.update(state); r.renderer.render(r.book.scene, r.book.camera);
    canvas.current.setAttribute("data-km-gl-frame", String(frame));
  });
  return <div ref={host} data-km-book-frame={frame} style={{ position: "absolute", inset: 0 }}/>;
}
