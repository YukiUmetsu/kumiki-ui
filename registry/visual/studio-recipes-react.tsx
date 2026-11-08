/** Studio video recipes: finished product shots for explainers, each a pure function of `frame`.
 *
 * - `ProductHeroTurn`: a slow turn that lands on the hero angle, holds, and earns one claim.
 * - `PartSpotlight`: push in on one named part, outline it, dim the rest, and name it with a leader line.
 * - `ExplodedView`: parts slide apart along their assembly axes, hold to be read, and nest back.
 * - `FinishCompare`: two versions side by side under identical light and camera.
 * - `TwoAngleProof`: one moment from two cameras at once.
 *
 * Each takes a `create` function for any `HeroAsset` (see `registry/domains/hero-catalog.ts`), runs inside Kumiki's product studio,
 * and keeps its text in measured regions away from the subject. Timing rules live in `studio-shots.ts`; check a spec with
 * `inspectStudioShot` before rendering.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { Box3, Vector3 } from "three";
import type { Object3D } from "three";
import type { HeroAsset } from "../craft/hero-asset";
import type { HeroStudioOptions } from "../craft/hero-studio";
import type { RationalFps } from "../motion/types";
import { FiberStage } from "./fiber-stage";
import { AssetPose, CompareViews, FiberHeroStudio, PartHighlightFiber, ScreenAnchor, ShotCamera, Turntable, partBounds, useHeroAsset, useStudio } from "./studio-fiber";
import { easeInOut, easeOut, span01, stackLabels, mix3, turntablePoint, boundsCenter, boundsRadius, compareShot, explodeAmount, explodePlan, explodeView, heroTurnShot, orbitPose, paneRects, partSpotlightState, screenAliveState, textBeatState } from "./studio-shots";
import type { CompareSpec, ExplodeSpec, HeroTurnSpec, PartSpotlightSpec, ScreenAliveSpec, TextBeat, Vec3 } from "./studio-shots";
import { bindScreenSurface } from "../craft/screen-surface";
import type { ScreenContent } from "../craft/screen-surface";

export type StudioTone = "light-on-dark" | "dark-on-light";
export interface StudioRecipeProps {
  frame: number;
  fps: RationalFps;
  /** Builds the subject. Called once per `assetKey`. */
  create: () => HeroAsset;
  /** Changes when `create` would build a different subject. @default "default" */
  assetKey?: string;
  /** Studio look, palette and key angle; merged over the asset's own hints. */
  studio?: Partial<Omit<HeroStudioOptions, "bounds">>;
  exposure?: number;
  /** Text colour against the backdrop. Pale palettes and the high-key look need `dark-on-light`. @default "light-on-dark" */
  tone?: StudioTone;
  label?: string;
  style?: CSSProperties;
  /** Drawn over the picture, under the recipe's own text. */
  children?: ReactNode;
}

const FILL: CSSProperties = { position: "absolute", inset: 0 };
const ink = (tone: StudioTone = "light-on-dark") => tone === "light-on-dark"
  ? { color: "#f4f6f9", soft: "rgba(232,238,245,.78)", shadow: "0 1px 2px rgba(0,0,0,.55), 0 0 18px rgba(0,0,0,.35)", line: "rgba(244,246,249,.9)" }
  : { color: "#13181f", soft: "rgba(28,36,46,.78)", shadow: "0 1px 1px rgba(255,255,255,.5)", line: "rgba(19,24,31,.85)" };

/** A claim or title in the lower-left safe region: large line, optional smaller line, rising softly in. Sizes follow the frame height. */
export function StudioCaption({ beat, frame, tone, align = "left" }: { beat?: TextBeat; frame: number; tone?: StudioTone; align?: "left" | "center" }) {
  const { opacity, rise } = textBeatState(beat, frame), c = ink(tone);
  if (!beat || opacity <= 0) return null;
  return <div style={{ position: "absolute", left: align === "left" ? "7%" : "50%", bottom: "10%", width: align === "left" ? "44%" : "70%", transform: `translate(${align === "left" ? 0 : "-50%"}, ${rise}px)`, textAlign: align, opacity, pointerEvents: "none" }}>
    <div style={{ font: "650 5.4cqh/1.12 var(--km-font-display, var(--km-font-body, system-ui, sans-serif))", letterSpacing: "-.01em", color: c.color, textShadow: c.shadow, textWrap: "balance" }}>{beat.text}</div>
    {beat.sub && <div style={{ marginTop: "1.2cqh", font: "450 2.7cqh/1.4 var(--km-font-body, system-ui, sans-serif)", color: c.soft, textShadow: c.shadow, textWrap: "pretty" }}>{beat.sub}</div>}
  </div>;
}

function Shell({ children, overlay, style, frame, fps, label }: { children: ReactNode; overlay?: ReactNode; style?: CSSProperties; frame: number; fps: RationalFps; label?: string }) {
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...style }}>
    <FiberStage frame={frame} fps={fps} label={label} shadows style={FILL}>{children}</FiberStage>
    {overlay && <div style={{ ...FILL, pointerEvents: "none" }}>{overlay}</div>}
  </div>;
}
const useAspect = () => { const size = useThree(state => state.size); return size.width / Math.max(1, size.height); };

// ------------------------------------------------------------------ 1. Product Hero Turn

function HeroTurnCamera({ asset, spec, frame }: { asset: HeroAsset; spec: HeroTurnSpec; frame: number }) {
  const aspect = useAspect(), shot = heroTurnShot(spec, frame, boundsCenter(asset.bounds), boundsRadius(asset.bounds), aspect);
  return <><Turntable yaw={shot.turn} /><ShotCamera pose={shot.pose} /></>;
}
/** A slow turn under studio light that decelerates onto the hero angle, holds with a trace of drift, and then shows one claim. */
export function ProductHeroTurn({ spec, action, ...props }: StudioRecipeProps & { spec: HeroTurnSpec; action?: { id: string; startFrame?: number } }) {
  const asset = useHeroAsset(props.create, [props.assetKey ?? "default"]);
  const state = { id: action?.id ?? null, frame: Math.max(0, props.frame - (action?.startFrame ?? 0)), fps: props.fps.num / props.fps.den };
  return <Shell frame={props.frame} fps={props.fps} label={props.label ?? `${asset.id}, turning to its best angle`} style={props.style}
    overlay={<>{props.children}<StudioCaption beat={spec.claim} frame={props.frame} tone={props.tone} /></>}>
    <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
      <AssetPose asset={asset} state={state} />
      <HeroTurnCamera asset={asset} spec={spec} frame={props.frame} />
    </FiberHeroStudio>
  </Shell>;
}

// ------------------------------------------------------------------ 2. Part Spotlight

interface AnchorRefs { dot: HTMLDivElement | null; line: SVGLineElement | null; label: HTMLDivElement | null }
function SpotlightScene({ asset, spec, frame, onAnchor, onSubject, highlightColor }: { asset: HeroAsset; spec: PartSpotlightSpec; frame: number; onAnchor: (x: number, y: number, inFront: boolean) => void; onSubject: (rects: Rect[]) => void; highlightColor?: string }) {
  const aspect = useAspect(), studio = useStudio();
  // The part's bounds at rest, before any turn, so the plan does not depend on which frame was drawn first.
  const part = useMemo(() => { studio.turn(0); return partBounds(asset.group, spec.part); }, [asset, spec.part, studio]);
  const center = boundsCenter(asset.bounds), state = partSpotlightState(spec, frame, { center, radius: boundsRadius(asset.bounds) }, part, aspect);
  return <>
    <Turntable yaw={state.turn} />
    <ShotCamera pose={state.pose} />
    <PartHighlightFiber asset={asset} part={spec.part} highlight={state.highlight} dim={state.dim} color={highlightColor} />
    <ScreenAnchor point={turntablePoint(part.center, center, state.turn)} onAnchor={onAnchor} />
    <SubjectRects asset={asset} onRects={onSubject} />
  </>;
}
export interface Rect { left: number; top: number; right: number; bottom: number }
/** Projects every mesh of the subject to the screen, as rectangles in 0..1 of the canvas, after the camera is set. Text placement is
 * checked against these, so a label can be proved clear of the subject at the rendered size. */
function SubjectRects({ asset, onRects }: { asset: HeroAsset; onRects: (rects: Rect[]) => void }) {
  const camera = useThree(state => state.camera);
  useLayoutEffect(() => {
    camera.updateMatrixWorld(); asset.group.updateMatrixWorld(true);
    const rects: Rect[] = [], box = new Box3(), v = new Vector3();
    asset.group.traverse(object => {
      const mesh = object as Object3D & { isMesh?: boolean; geometry?: { boundingBox: Box3 | null; computeBoundingBox(): void } };
      if (!mesh.isMesh || object.userData.kmHighlightHull || !object.visible || !mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.copy(mesh.geometry.boundingBox!).applyMatrix4(object.matrixWorld);
      let left = 1, top = 1, right = 0, bottom = 0, front = false;
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
        if (v.z < 1) front = true;
        left = Math.min(left, (v.x + 1) / 2); right = Math.max(right, (v.x + 1) / 2); top = Math.min(top, (1 - v.y) / 2); bottom = Math.max(bottom, (1 - v.y) / 2);
      }
      if (front && right > 0 && left < 1 && bottom > 0 && top < 1) rects.push({ left, top, right, bottom });
    });
    onRects(rects);
  });
  return null;
}
/** Push in on one named part, outline it, dim the rest of the subject, and name it with a label joined to the part by a leader line.
 * The label sits in the third of the frame the part is not in (set by `spec.close.offsetX`), so it never covers the subject. */
export function PartSpotlight({ spec, highlightColor, ...props }: StudioRecipeProps & { spec: PartSpotlightSpec; highlightColor?: string }) {
  const asset = useHeroAsset(props.create, [props.assetKey ?? "default"]);
  const refs = useRef<AnchorRefs>({ dot: null, line: null, label: null }), c = ink(props.tone);
  const labelLeft = (spec.close.offsetX ?? 0) >= 0, { opacity, rise } = textBeatState(spec.label, props.frame);
  // Moves the leader line and dot straight from the projected point, without a React render per frame.
  // Rendered-bounds check: the label's box against every projected mesh of the subject. The result is published on the label as
  // `data-km-text-overlap` so automated checks can fail a shot whose text covers the subject.
  const onSubject = useCallback((rects: Rect[]) => {
    const label = refs.current.label, box = label?.parentElement?.getBoundingClientRect();
    if (!label || !box?.width) return;
    const own = label.getBoundingClientRect(), l = (own.left - box.left) / box.width, r = (own.right - box.left) / box.width, t = (own.top - box.top) / box.height, b = (own.bottom - box.top) / box.height;
    const hit = rects.some(rect => rect.left < r && rect.right > l && rect.top < b && rect.bottom > t);
    label.dataset.kmTextOverlap = String(hit);
  }, []);
  const onAnchor = useCallback((x: number, y: number, inFront: boolean) => {
    const { dot, line, label } = refs.current;
    if (dot) { dot.style.left = `${x * 100}%`; dot.style.top = `${y * 100}%`; dot.style.visibility = inFront ? "visible" : "hidden"; }
    if (line && label) {
      const box = label.parentElement?.getBoundingClientRect(), own = label.getBoundingClientRect();
      const lx = box && box.width ? ((labelLeft ? own.right + 10 : own.left - 10) - box.left) / box.width : (labelLeft ? .38 : .62);
      const ly = box && box.height ? (own.top + own.height * .32 - box.top) / box.height : .5;
      line.setAttribute("x1", String(lx * 100)); line.setAttribute("y1", String(ly * 100));
      line.setAttribute("x2", String(x * 100)); line.setAttribute("y2", String(y * 100));
    }
  }, [labelLeft]);
  return <Shell frame={props.frame} fps={props.fps} label={props.label ?? `${asset.id}, the ${spec.part} highlighted`} style={props.style}
    overlay={<>
      {props.children}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ ...FILL, width: "100%", height: "100%", overflow: "visible", opacity }} aria-hidden>
        <line ref={node => { refs.current.line = node; }} stroke={c.line} strokeWidth={1.4} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </svg>
      <div ref={node => { refs.current.dot = node; }} aria-hidden style={{ position: "absolute", width: "1.3cqh", height: "1.3cqh", borderRadius: "50%", transform: "translate(-50%,-50%)", background: c.line, boxShadow: "0 0 0 .5cqh rgba(255,255,255,.14)", opacity }} />
      {spec.label && <div ref={node => { refs.current.label = node; }} style={{ position: "absolute", top: "38%", [labelLeft ? "left" : "right"]: "7%", width: "27%", opacity, transform: `translateY(${rise}px)`, textAlign: labelLeft ? "left" : "right" }}>
        <div style={{ font: "650 4.4cqh/1.15 var(--km-font-display, var(--km-font-body, system-ui, sans-serif))", color: c.color, textShadow: c.shadow, textWrap: "balance" }}>{spec.label.text}</div>
        {spec.label.sub && <div style={{ marginTop: "1cqh", font: "450 2.5cqh/1.4 var(--km-font-body, system-ui, sans-serif)", color: c.soft, textShadow: c.shadow, textWrap: "pretty" }}>{spec.label.sub}</div>}
      </div>}
    </>}>
    <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
      <SpotlightScene asset={asset} spec={spec} frame={props.frame} onAnchor={onAnchor} onSubject={onSubject} highlightColor={highlightColor} />
    </FiberHeroStudio>
  </Shell>;
}

// ------------------------------------------------------------------ 3. Exploded View

/** Named parts that contain no other named part: the pieces that can actually come apart. */
export function leafParts(asset: HeroAsset): string[] {
  const roles = new Map<string, Object3D[]>();
  asset.group.traverse(object => { const role = object.userData.partRole; if (typeof role === "string") roles.set(role, [...(roles.get(role) ?? []), object]); });
  return [...roles.keys()].filter(role => !roles.get(role)!.some(object => { let nested = false; object.traverse(child => { if (child !== object && typeof child.userData.partRole === "string" && child.userData.partRole !== role) nested = true; }); return nested; }));
}
function ExplodeScene({ asset, spec, frame, onLabels }: { asset: HeroAsset; spec: ExplodeSpec; frame: number; onLabels?: (anchors: Array<{ x: number; y: number }>) => void }) {
  const aspect = useAspect(), studio = useStudio(), camera = useThree(state => state.camera);
  const rig = useMemo(() => {
    studio.turn(0);
    asset.group.updateMatrixWorld(true);
    const pieces = (spec.parts ?? leafParts(asset)).map(entry => typeof entry === "string" ? [entry] : [...entry]);
    const objects = pieces.map(names => {
      const list: Object3D[] = [];
      // The outermost object carrying a role moves; its children ride along.
      asset.group.traverse(object => { const role = object.userData.partRole; if (names.includes(role) && !(object.parent && object.parent.userData.partRole === role)) list.push(object); });
      return list;
    });
    // Real geometry, not the authored bounds, which carry padding for the studio.
    const extents = new Box3();
    asset.group.traverse(object => { if ((object as { isMesh?: boolean }).isMesh && !object.userData.kmHighlightHull) extents.expandByObject(object); });
    const info = pieces.map((names, i) => { const box = new Box3(); objects[i].forEach(o => box.expandByObject(o)); const c = box.getCenter(new Vector3()); return { name: names.join("+"), center: [c.x, c.y, c.z] as Vec3 }; });
    const plan = explodePlan(info, { min: extents.min.toArray(), max: extents.max.toArray() }, { gap: spec.gap, axis: spec.axis });
    const center = extents.getCenter(new Vector3()), radius = extents.getSize(new Vector3()).length() / 2;
    // The exploded extents: every piece's box, moved by its full offset. Framing grows to this, not to an inflated sphere.
    const spread = extents.clone();
    plan.forEach((item, i) => objects[i].forEach(o => spread.union(new Box3().setFromObject(o).translate(new Vector3(...item.offset)))));
    const exploded = spread.getSize(new Vector3()).length() / 2, explodedCenter = spread.getCenter(new Vector3());
    const moves = plan.flatMap((item, i) => objects[i].map(object => {
      const rest = object.position.clone(), world = object.getWorldPosition(new Vector3()), parent = object.parent!;
      const local = parent.worldToLocal(world.clone().add(new Vector3(...item.offset))).sub(parent.worldToLocal(world.clone()));
      return { object, rest, local, order: item.order };
    }));
    const labelled = (spec.labels ?? []).map(label => objects[pieces.findIndex(names => names[0] === label.piece)] ?? []);
    return { moves, labelled, center: [center.x, center.y, center.z] as Vec3, explodedCenter: [explodedCenter.x, explodedCenter.y, explodedCenter.z] as Vec3, radius, exploded };
  }, [asset, spec.parts, spec.gap, spec.axis, spec.labels, studio]);
  useLayoutEffect(() => () => { for (const { object, rest } of rig.moves) object.position.copy(rest); }, [rig]);
  useLayoutEffect(() => { for (const { object, rest, local, order } of rig.moves) object.position.copy(rest).addScaledVector(local, explodeAmount(spec, order, frame)); });
  const { view, radius } = explodeView(spec, frame, rig.radius, rig.exploded), open = (radius - rig.radius) / Math.max(1e-6, rig.exploded - rig.radius);
  const pivot = turntablePoint(mix3(rig.center, rig.explodedCenter, open), boundsCenter(asset.bounds), view.yaw);
  return <><Turntable yaw={view.yaw} /><ShotCamera pose={orbitPose(pivot, radius, { ...view, yaw: 0 }, aspect)} />
    {onLabels && rig.labelled.length > 0 && <PieceAnchors pieces={rig.labelled} camera={camera} onLabels={onLabels} />}</>;
}
/** Each labelled piece's centre on screen, after the turntable and camera have been set for the frame. */
function PieceAnchors({ pieces, camera, onLabels }: { pieces: Object3D[][]; camera: import("three").Camera; onLabels: (anchors: Array<{ x: number; y: number }>) => void }) {
  useLayoutEffect(() => {
    camera.updateMatrixWorld();
    onLabels(pieces.map(list => {
      const box = new Box3(); list.forEach(o => { o.updateMatrixWorld(true); box.expandByObject(o); });
      // Near the top edge, not the centre: stacked layers share a centre on screen, but their top edges are staggered and distinct.
      const c = box.getCenter(new Vector3()), p = box.isEmpty() ? new Vector3() : new Vector3(c.x, box.max.y - (box.max.y - box.min.y) * .1, c.z).project(camera);
      return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
    }));
  });
  return null;
}
/** Parts slide apart along the axis each one sits on, outermost first, hold so the construction can be read, then nest back. */
export function ExplodedView({ spec, ...props }: StudioRecipeProps & { spec: ExplodeSpec }) {
  const asset = useHeroAsset(props.create, [props.assetKey ?? "default"]);
  const labels = useRef<Array<{ box: HTMLDivElement | null; line: SVGLineElement | null }>>([]), c = ink(props.tone), right = (spec.labelSide ?? "right") === "right";
  // Labels are shown while every piece is apart: from the end of the spread to the start of the return.
  const shown = Math.min(easeOut(span01(props.frame, spec.explodeEnd + 6, spec.explodeEnd + 16)), spec.reassembleStart === undefined ? 1 : 1 - easeInOut(span01(props.frame, spec.reassembleStart - 10, spec.reassembleStart)));
  const onLabels = useCallback((anchors: Array<{ x: number; y: number }>) => {
    // Slots are taken in order of each anchor's angle seen from the label column, so leader lines fan out without crossing.
    const edge = right ? .74 : .26, angle = (a: { x: number; y: number }) => Math.atan2(a.y - .5, Math.abs(edge - a.x));
    const order = anchors.map((_, i) => i).sort((p, q) => angle(anchors[p]) - angle(anchors[q]));
    const slots = stackLabels([...anchors.map(a => a.y)].sort((p, q) => p - q)), ys: number[] = new Array(anchors.length);
    order.forEach((index, k) => { ys[index] = slots[k]; });
    anchors.forEach((a, i) => {
      const entry = labels.current[i]; if (!entry?.box || !entry.line) return;
      entry.box.style.top = `${ys[i] * 100}%`;
      entry.line.setAttribute("x1", String(edge * 100)); entry.line.setAttribute("y1", String(ys[i] * 100));
      entry.line.setAttribute("x2", String(a.x * 100)); entry.line.setAttribute("y2", String(a.y * 100));
    });
  }, [right]);
  return <Shell frame={props.frame} fps={props.fps} label={props.label ?? `${asset.id}, its parts separating to show how it is built`} style={props.style}
    overlay={<>
      {props.children}
      {spec.labels && <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: shown }}>
        {spec.labels.map((label, i) => <line key={label.piece} ref={node => { (labels.current[i] ??= { box: null, line: null }).line = node; }} stroke={c.line} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />)}
      </svg>}
      {spec.labels?.map((label, i) => <div key={label.piece} ref={node => { (labels.current[i] ??= { box: null, line: null }).box = node; }}
        style={{ position: "absolute", [right ? "left" : "right"]: "75.5%", transform: "translateY(-50%)", opacity: shown, whiteSpace: "nowrap",
          font: "600 2.9cqh/1.2 var(--km-font-body, system-ui, sans-serif)", color: c.color, textShadow: c.shadow }}>{label.text}</div>)}
      <StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} />
    </>}>
    <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
      <ExplodeScene asset={asset} spec={spec} frame={props.frame} onLabels={spec.labels ? onLabels : undefined} />
    </FiberHeroStudio>
  </Shell>;
}

// ------------------------------------------------------------------ 4 and 5. Compare views

function CompareScene({ assets, spec, frame, solo }: { assets: readonly HeroAsset[]; spec: CompareSpec; frame: number; solo: boolean }) {
  const size = useThree(state => state.size), studio = useStudio(), rects = paneRects(spec.panes.length), lead = assets[0];
  const panes = rects.map((rect, i) => {
    const aspect = rect.w * size.width / Math.max(1, rect.h * size.height), mine = assets[solo ? 0 : i] ?? lead;
    const shot = compareShot(spec, i, frame, boundsCenter(mine.bounds), boundsRadius(mine.bounds), aspect);
    // Each pane turns its own subject on the turntable and shows only that subject, so every pane faces the same studio.
    return { rect, pose: shot.pose, before: () => { studio.turn(shot.turn, assets); if (!solo) assets.forEach((a, j) => { a.group.visible = j === i; }); }, after: solo ? undefined : () => assets.forEach(a => { a.group.visible = true; }) };
  });
  return <CompareViews panes={panes} />;
}
function PaneLabels({ spec, tone }: { spec: CompareSpec; tone?: StudioTone }) {
  const c = ink(tone);
  return <>{paneRects(spec.panes.length).map((rect, i) => <div key={i} style={{ position: "absolute", left: `${(rect.x + .025) * 100}%`, top: `${(rect.y + .04) * 100}%`, maxWidth: `${rect.w * 80}%`,
    font: "600 2.9cqh/1.2 var(--km-font-body, system-ui, sans-serif)", letterSpacing: ".01em", color: c.color, textShadow: c.shadow }}>{spec.panes[i].label}</div>)}</>;
}
/** Two versions of a subject side by side under identical light and an identical, synchronised camera: an honest comparison. */
export function FinishCompare({ spec, variants, ...props }: Omit<StudioRecipeProps, "create"> & { spec: CompareSpec; variants: ReadonlyArray<{ create: () => HeroAsset }> }) {
  const key = props.assetKey ?? "default";
  const a = useHeroAsset(variants[0].create, [key, 0]), b = useHeroAsset((variants[1] ?? variants[0]).create, [key, 1]);
  const assets = useMemo(() => [a, b], [a, b]), extra = useMemo(() => [b], [b]);
  return <Shell frame={props.frame} fps={props.fps} label={props.label ?? `${spec.panes.map(p => p.label).join(" beside ")}`} style={props.style}
    overlay={<>{props.children}<PaneLabels spec={spec} tone={props.tone} /><StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} align="center" /></>}>
    <FiberHeroStudio asset={a} extra={extra} studio={props.studio} exposure={props.exposure}>
      <CompareScene assets={assets} spec={spec} frame={props.frame} solo={false} />
    </FiberHeroStudio>
  </Shell>;
}
/** One moment seen from two or more cameras at once, so a mechanism reads in depth. Each pane sets its own angle in `spec.panes[i].view`. */
export function TwoAngleProof({ spec, action, ...props }: StudioRecipeProps & { spec: CompareSpec; action?: { id: string; startFrame?: number } }) {
  const asset = useHeroAsset(props.create, [props.assetKey ?? "default"]);
  const assets = useMemo(() => [asset], [asset]);
  const state = { id: action?.id ?? null, frame: Math.max(0, props.frame - (action?.startFrame ?? 0)), fps: props.fps.num / props.fps.den };
  return <Shell frame={props.frame} fps={props.fps} label={props.label ?? `${asset.id} from ${spec.panes.length} angles at once`} style={props.style}
    overlay={<>{props.children}<PaneLabels spec={spec} tone={props.tone} /><StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} align="center" /></>}>
    <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
      <AssetPose asset={asset} state={state} />
      <CompareScene assets={assets} spec={spec} frame={props.frame} solo />
    </FiberHeroStudio>
  </Shell>;
}

// ------------------------------------------------------------------ 8. Screen Comes Alive

function ScreenScene({ asset, spec, frame, paint }: { asset: HeroAsset; spec: ScreenAliveSpec; frame: number; paint: Extract<ScreenContent, { kind: "paint" }>["draw"] }) {
  const aspect = useAspect(), studio = useStudio();
  const display = useMemo(() => { studio.turn(0); return partBounds(asset.group, spec.part); }, [asset, spec.part, studio]);
  const surface = useMemo(() => bindScreenSurface(asset, { part: spec.part, content: { kind: "paint", draw: (ctx, w, h, f) => paint(ctx, w, h, f) }, designWidth: 390 }), [asset, spec.part, paint]);
  useLayoutEffect(() => () => surface.dispose(), [surface]);
  // While the screen is the subject, its glass takes an anti-reflective coat: a softbox mirrored across the interface washes it grey,
  // which product films avoid by treating the screen separately. Restored when the recipe unmounts.
  useLayoutEffect(() => {
    type Coated = { envMapIntensity?: number; clearcoat?: number; specularIntensity?: number; emissiveIntensity?: number };
    const display = surface.display, material = display && !Array.isArray(display.material) ? display.material as Coated : undefined;
    if (!material) return;
    const prior = { env: material.envMapIntensity, coat: material.clearcoat, spec: material.specularIntensity, glow: material.emissiveIntensity };
    Object.assign(material, { envMapIntensity: .06, clearcoat: .04, specularIntensity: .12, emissiveIntensity: 1.15 });
    return () => { Object.assign(material, { envMapIntensity: prior.env, clearcoat: prior.coat, specularIntensity: prior.spec, emissiveIntensity: prior.glow }); };
  }, [surface]);
  useLayoutEffect(() => {
    const hidden: Object3D[] = [];
    asset.group.traverse(object => { if ((spec.hide ?? []).includes(object.userData.partRole) && object.visible) { object.visible = false; hidden.push(object); } });
    return () => hidden.forEach(object => { object.visible = true; });
  }, [asset, spec.hide]);
  const center = boundsCenter(asset.bounds), state = screenAliveState(spec, frame, { center, radius: boundsRadius(asset.bounds) }, display, aspect);
  useLayoutEffect(() => { surface.paintAt(state.uiFrame); });
  return <><Turntable yaw={state.turn} /><ShotCamera pose={state.pose} /></>;
}
/** Push into a device's screen, let its interface perform, and pull back. `paint` draws the interface for a local frame, in design
 * pixels (390 wide, the display's own aspect): it must be a pure function of that frame. */
export function ScreenComesAlive({ spec, paint, ...props }: StudioRecipeProps & { spec: ScreenAliveSpec; paint: (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) => void }) {
  const asset = useHeroAsset(props.create, [props.assetKey ?? "default"]);
  return <Shell frame={props.frame} fps={props.fps} label={props.label ?? `${asset.id}, its screen coming to life`} style={props.style}
    overlay={<>{props.children}<StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} /></>}>
    <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
      <ScreenScene asset={asset} spec={spec} frame={props.frame} paint={paint} />
    </FiberHeroStudio>
  </Shell>;
}
