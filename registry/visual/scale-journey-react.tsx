/** `ScaleJourney`: how big things are, felt rather than told. Crafted objects stand in a row from smallest to largest, a coin to a
 * bank, at their real sizes. The camera holds on each in turn and pulls back to the next in log space, so every jump in size takes the
 * same time; each stop shows its real size and how many times larger it is than the one before. Earlier stops stay in frame beside the
 * current one, and a 1.75 m scale figure stands in the row, as architects place one in a model: the fix for the classic zoom, which
 * loses its sense of size once the last object shrinks out of view. Pure function of `frame`.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { CanvasTexture, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Shape, Vector3 } from "three";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import { FINANCE_HERO_BUILDERS } from "../domains/finance-hero-3d";
import { createPadlock } from "../domains/privacy-3d";
import { createLaptop, createServerRack, createSmartphone } from "../domains/technology-3d";
import { FiberStage } from "./fiber-stage";
import { FiberHeroStudio, ShotCamera, useHeroAsset, useStudio } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { easeInOut, orbitPose, span01 } from "./studio-shots";
import type { Vec3 } from "./studio-shots";
import { SCALE_MOVE, scaleStopFrames } from "./story-3d-shots";
import type { ScaleJourneySpec, ScaleKind } from "./story-3d-shots";
import { posedObject } from "./tabletop-story-react";
import type { Item } from "./tabletop-story-react";

/** How each object stands in the row: a coin on its edge, a card on its long edge, the rest as built. */
const KINDS: Record<ScaleKind, { create: () => HeroAsset; pose?: Vec3 }> = {
  coin: { create: () => FINANCE_HERO_BUILDERS.coins({ count: 1 }), pose: [Math.PI / 2, 0, 0] },
  "credit-card": { create: () => FINANCE_HERO_BUILDERS["credit-card"]({ secondCard: false }), pose: [-Math.PI / 2, 0, 0] },
  smartphone: { create: () => createSmartphone({ id: "phone" }) },
  padlock: { create: () => createPadlock({ withKey: false }) },
  laptop: { create: () => createLaptop({ id: "laptop" }) },
  "gold-bars": { create: () => FINANCE_HERO_BUILDERS["gold-bars"]() },
  "money-bag": { create: () => FINANCE_HERO_BUILDERS["money-bag"]({ coins: 3 }) },
  "server-rack": { create: () => createServerRack() },
  bull: { create: () => FINANCE_HERO_BUILDERS["bull-market"]({ plinth: false }) },
  bank: { create: () => FINANCE_HERO_BUILDERS.bank() },
};

/** A 1.75 m architectural scale figure: a standing outline in matte card, its arms at its sides. */
function scaleFigure(res: ReturnType<typeof createAssetResources>): Mesh {
  const half: Array<[number, number]> = [[.06, 1.5], [.2, 1.45], [.25, 1.37], [.265, .92], [.22, .86], [.185, .95], [.165, .52], [.15, .07], [.17, 0], [.035, 0], [.04, .55], [0, .82]];
  const outline = new Shape();
  outline.moveTo(-half[0][0], half[0][1]);
  for (const [x, y] of half) outline.lineTo(x, y);
  for (const [x, y] of [...half].reverse()) outline.lineTo(-x, y);
  const head = new Shape(); head.absarc(0, 1.635, .105, 0, Math.PI * 2, false);
  const geometry = res.own(new ExtrudeGeometry([outline, head], { depth: .03, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 2, curveSegments: 24 }));
  geometry.translate(0, 0, -.015);
  const mesh = new Mesh(geometry, res.own(new MeshStandardMaterial({ color: "#a29b90", roughness: .92 })));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = "scale-figure";
  return mesh;
}

/** A soft contact shadow under one object, at any scale: the studio's key shadow is fitted to the whole row and too coarse for a coin. */
export function contactShadow(res: ReturnType<typeof createAssetResources>, width: number, depth: number): Mesh {
  const canvas = typeof document === "undefined" ? null : document.createElement("canvas");
  let map: CanvasTexture | null = null;
  const ctx = canvas?.getContext("2d");
  if (canvas && ctx) {
    canvas.width = canvas.height = 128; const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,.62)"); g.addColorStop(.55, "rgba(0,0,0,.22)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    map = res.own(new CanvasTexture(canvas));
  }
  const blob = new Mesh(res.own(new PlaneGeometry(width * 1.7, depth * 1.7)), res.own(new MeshBasicMaterial({ map, color: "#000000", transparent: true, depthWrite: false, opacity: map ? 1 : 0 })));
  blob.rotation.x = -Math.PI / 2; blob.position.y = Math.max(.0004, width * .002); blob.renderOrder = 1;
  return blob;
}

function build(spec: ScaleJourneySpec) {
  const res = createAssetResources(), group = new Group(), items: Item[] = [];
  let x = 0;
  spec.stops.forEach((stop, i) => {
    const item = posedObject(KINDS[stop.kind].create(), stop.id, KINDS[stop.kind].pose);
    item.asset.group.traverse(object => { const mesh = object as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
    // About 3.4 of the last object's radii apart: far enough that the next, larger object stays out of frame until the camera goes to
    // it, close enough that the last one is still in frame beside it.
    if (i) { const prev = items[i - 1]; x += prev.size[0] / 2 + 3.4 * Math.max(...prev.size) / 2 + item.size[0] / 2; }
    item.holder.position.set(x, 0, 0);
    item.holder.add(contactShadow(res, item.size[0], item.size[2]));
    items.push(item); group.add(item.holder);
  });
  // The figure stands in the row just after the first object of about a person's size or larger, so it is beside that stop and in
  // frame, small, at every larger one. Before that, a person would fill the background with legs.
  let figure: Mesh | undefined;
  if (spec.person ?? true) {
    const index = items.findIndex(item => Math.max(...item.size) > 1), host = items[index >= 0 ? index : items.length - 1];
    figure = scaleFigure(res);
    figure.position.set(host.holder.position.x + host.size[0] / 2 + .4, 0, 0);
    figure.add(contactShadow(res, .45, .3));
    group.add(figure);
  }
  const last = items[items.length - 1], first = items[0];
  const asset: HeroAsset = { id: "scale-journey", group, parts: res.parts, tier: "hero", metersPerUnit: 1, exposure: 1,
    bounds: { min: [first.holder.position.x - first.size[0], 0, -last.size[2]], max: [last.holder.position.x + last.size[0] / 2, Math.max(...items.map(i => i.size[1])), last.size[2] / 2] },
    studio: { palette: "graphite", keyAzimuth: -30 },
    craft: { materials: ["catalog objects at real size", "matte card scale figure"], details: ["per-object contact shadows", "log-space camera"] },
    dispose: () => { for (const item of items) item.asset.dispose(); res.dispose(); } };
  return { asset, items, figure };
}

/** Readable sizes: centimetres under a metre, metres above. */
export function formatSize(metres: number): string {
  return metres < 1 ? `${Math.round(metres * 100 * (metres < .1 ? 10 : 1)) / (metres < .1 ? 10 : 1)} cm` : `${metres < 10 ? metres.toFixed(1).replace(/\.0$/, "") : Math.round(metres)} m`;
}

function JourneyScene({ built, spec, frame, fps, onReadout }: { built: ReturnType<typeof build>; spec: ScaleJourneySpec; frame: number; fps: number; onReadout: (p: { x: number; y: number }) => void }) {
  const size = useThree(state => state.size), camera = useThree(state => state.camera), studio = useStudio(), aspect = size.width / Math.max(1, size.height);
  const frames = scaleStopFrames(spec, fps), starts = frames.map((_, i) => frames.slice(0, i).reduce((a, b) => a + b, 0));
  let stop = 0; starts.forEach((start, i) => { if (frame >= start) stop = i; });
  const shot = (i: number) => {
    const item = built.items[i], h = item.size[1], r = Math.max(...item.size) / 2;
    return { center: [item.holder.position.x, h * .48, 0] as Vec3, radius: Math.max(r, h * .5) };
  };
  const t = stop ? easeInOut(span01(frame, starts[stop], starts[stop] + SCALE_MOVE)) : 1, a = shot(Math.max(0, stop - 1)), b = shot(stop);
  const radius = Math.exp(Math.log(a.radius) + (Math.log(b.radius) - Math.log(a.radius)) * t);
  // The centre moves with the size, so the camera rides the log scale instead of sliding sideways at the end.
  const k = a.radius === b.radius ? t : (radius - a.radius) / (b.radius - a.radius);
  const center: Vec3 = [a.center[0] + (b.center[0] - a.center[0]) * k, a.center[1] + (b.center[1] - a.center[1]) * k, 0];
  const hold = span01(frame, starts[stop] + (stop ? SCALE_MOVE : 0), starts[stop] + frames[stop]);
  // Small things are seen from a little above, as they are on a table, which also keeps the horizon out of frame; large things from
  // near eye level. Nearly frontal, so perspective does not shrink the earlier, farther objects.
  const small = Math.min(1, Math.max(0, 1 - Math.log10(radius / .02) / 2.3));
  const pose = orbitPose(center, radius, { yaw: 10 - hold * 2, pitch: 8 + small * 14, fill: .5 * (1 + hold * .03), offsetX: .3 }, aspect);
  useLayoutEffect(() => {
    // The studio's single blob is sized for the whole row; each object has its own contact shadow instead.
    const blob = studio.studio.group.getObjectByName("contact-occlusion"); if (blob) blob.visible = false;
    camera.updateMatrixWorld();
    const item = built.items[stop], v = new Vector3(item.holder.position.x, item.size[1] * 1.04, 0).project(camera);
    onReadout({ x: (v.x + 1) / 2, y: (1 - v.y) / 2 });
  });
  return <ShotCamera pose={pose} />;
}

/** Objects from smallest to largest; the camera steps back from each to the next, and each shows its real size. */
export function ScaleJourney({ spec, ...props }: Omit<StudioRecipeProps, "create"> & { spec: ScaleJourneySpec }) {
  const key = JSON.stringify([spec.stops.map(s => [s.id, s.kind]), spec.person]);
  const built = useMemo(() => build(spec), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const asset = useHeroAsset(() => built.asset, [built]);
  const fps = props.fps.num / props.fps.den, frames = scaleStopFrames(spec, fps), starts = frames.map((_, i) => frames.slice(0, i).reduce((a, b) => a + b, 0));
  let stop = 0; starts.forEach((start, i) => { if (props.frame >= start) stop = i; });
  const readout = useRef<HTMLDivElement | null>(null);
  const onReadout = useCallback((p: { x: number; y: number }) => { if (readout.current) { readout.current.style.left = `${p.x * 100}%`; readout.current.style.top = `${p.y * 100}%`; } }, []);
  const item = built.items[stop], biggest = Math.max(...item.size), before = stop ? Math.max(...built.items[stop - 1].size) : 0;
  const arrived = props.frame - starts[stop] - (stop ? SCALE_MOVE : 0), on = Math.min(1, Math.max(0, (arrived + 4) / 10)) * Math.min(1, (starts[stop] + frames[stop] - props.frame) / 6 + (stop === spec.stops.length - 1 ? 1 : 0));
  const ink = props.tone === "dark-on-light" ? "#13181f" : "#f4f6f9", accent = props.tone === "dark-on-light" ? "#8a5a00" : "#ffd27a";
  const shadow = props.tone === "dark-on-light" ? "0 1px 1px rgba(255,255,255,.5)" : "0 1px 2px rgba(0,0,0,.6), 0 0 16px rgba(0,0,0,.4)";
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...props.style }}>
    <FiberStage frame={props.frame} fps={props.fps} label={props.label ?? `Objects from smallest to largest: ${spec.stops.map(s => s.kind).join(", ")}`} shadows style={{ position: "absolute", inset: 0 }}>
      <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
        <JourneyScene built={built} spec={spec} frame={props.frame} fps={fps} onReadout={onReadout} />
      </FiberHeroStudio>
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {props.children}
      <div ref={readout} data-km-scale-readout={stop} data-km-text-tracks="" style={{ position: "absolute", transform: `translate(-50%, calc(-100% + ${(1 - on) * 8}px))`, opacity: on, textAlign: "center", whiteSpace: "nowrap", color: ink, textShadow: shadow }}>
        {stop > 0 && <div style={{ font: "700 3.2cqh/1 var(--km-font-display, var(--km-font-body, system-ui, sans-serif))", color: accent }}>×{Math.round(biggest / before * 10) / 10}</div>}
        <div style={{ font: "700 5cqh/1.05 var(--km-font-display, var(--km-font-body, system-ui, sans-serif))", fontVariantNumeric: "tabular-nums" }}>{formatSize(biggest)}</div>
      </div>
      {spec.stops.map((s, i) => s.caption && <StudioCaption key={s.id} position="top" beat={{ text: s.caption, enter: starts[i] + (i ? SCALE_MOVE - 6 : 4), exit: i < spec.stops.length - 1 ? starts[i] + frames[i] + 4 : spec.title ? spec.title.enter : spec.durationFrames + 20 }} frame={props.frame} tone={props.tone} />)}
      <StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} />
    </div>
  </div>;
}
