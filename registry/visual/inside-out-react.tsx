/** `InsideOut`: what is inside, shown by taking the cover away. The subject turns slowly in the studio, seen from behind; a cut sweeps
 * across its back from top to bottom with a thin line of light at its edge, and the cover (a back glass, the camera plateau) is gone
 * wherever it has passed, showing the battery, the board, the coil and the modules in place. Then the parts are named one at a time,
 * with leader lines in two measured columns either side of the subject. Pure function of `frame`.
 *
 * Any asset with a `cutaway` works: it shows its internal parts and swaps a solid stand-in for its hollow construction, and names the
 * cover parts the cut removes.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { AdditiveBlending, Box3, DoubleSide, Mesh, MeshBasicMaterial, Plane, PlaneGeometry, Vector3 } from "three";
import type { Material, Object3D } from "three";
import type { HeroAsset } from "../craft/hero-asset";
import { FiberStage } from "./fiber-stage";
import { FiberHeroStudio, ShotCamera, Turntable, partBounds, useHeroAsset } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { boundsCenter, boundsRadius, easeInOut, orbitPose, span01 } from "./studio-shots";
import type { Vec3 } from "./studio-shots";
import { insideOutLabelFrame } from "./story-3d-shots";
import type { InsideOutSpec } from "./story-3d-shots";

/** The cut's direction in the asset's own space: falling from top to bottom, tilted a little, as a hand-drawn wipe is. */
const SWEEP = new Vector3(.22, 1, 0).normalize();

function belongs(object: Object3D, roles: ReadonlySet<string>, root: Object3D) {
  for (let node: Object3D | null = object; node; node = node.parent) { if (roles.has(node.userData.partRole)) return true; if (node === root) break; }
  return false;
}

interface LabelPoint { x: number; y: number; lx: number; ly: number; side: "left" | "right" }

function InsideScene({ asset, spec, frame, onLabels }: { asset: HeroAsset; spec: InsideOutSpec; frame: number; onLabels: (points: LabelPoint[]) => void }) {
  const gl = useThree(state => state.gl), size = useThree(state => state.size), camera = useThree(state => state.camera), aspect = size.width / Math.max(1, size.height);
  const plane = useMemo(() => new Plane(), []);
  // Open the subject, and give each cover mesh its own clipped copy of its material, so nothing else that shares it is cut.
  const sweep = useMemo(() => {
    const cutaway = asset.cutaway;
    if (!cutaway) throw new Error(`"${asset.id}" has no cutaway, so InsideOut has nothing to show.`);
    const roles = new Set(cutaway.cover), swapped: Array<[Mesh, Material | Material[]]> = [];
    asset.group.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !belongs(mesh, roles, asset.group)) return;
      swapped.push([mesh, mesh.material]);
      const clip = (m: Material) => { const c = m.clone(); c.clippingPlanes = [plane]; c.clipShadows = true; return c; };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clip) : clip(mesh.material);
    });
    // The sweep's extent: every point of the subject's bounds measured along the cut direction.
    const { min, max } = asset.bounds, along = [min[0], max[0]].flatMap(x => [min[1], max[1]].map(y => SWEEP.x * x + SWEEP.y * y));
    cutaway.open(true);
    const radius = boundsRadius(asset.bounds);
    // The line runs on the cover itself: its back face, in the asset's own space.
    asset.group.updateMatrixWorld(true);
    const box = new Box3();
    asset.group.traverse(object => { if ((object as Mesh).isMesh && belongs(object, roles, asset.group)) box.expandByObject(object); });
    const corners = [box.min, box.max].flatMap(a => [box.min, box.max].flatMap(b => [box.min, box.max].map(c => asset.group.worldToLocal(new Vector3(a.x, b.y, c.z)))));
    const back = Math.min(...corners.map(v => v.z)), xs = corners.map(v => v.x), middle = (Math.min(...xs) + Math.max(...xs)) / 2;
    // A thin line of light on the cut's edge, across the cover's width, drawn from either side.
    const width = (Math.max(...xs) - Math.min(...xs)) / SWEEP.y;
    const line = new Mesh(new PlaneGeometry(width, radius * .007), new MeshBasicMaterial({ color: "#ffe9c7", transparent: true, opacity: .9, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide }));
    line.rotation.z = Math.atan2(-SWEEP.x, SWEEP.y); line.renderOrder = 3;
    asset.group.add(line);
    return { swapped, middle, from: Math.max(...along) + radius * .02, to: Math.min(...along) - radius * .02, line, back, dispose() {
      cutaway.open(false); asset.group.remove(line); line.geometry.dispose(); (line.material as Material).dispose();
      for (const [mesh, material] of swapped) { (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => m.dispose()); mesh.material = material; }
    } };
  }, [asset, plane]);
  useLayoutEffect(() => () => sweep.dispose(), [sweep]);
  const view = spec.view ?? { yaw: 205, pitch: 16, fill: .84 }, turn = view.yaw + easeInOut(span01(frame, 0, spec.durationFrames)) * (spec.orbit ?? 12);
  const center = boundsCenter(asset.bounds), radius = boundsRadius(asset.bounds);
  const cut = easeInOut(span01(frame, spec.cutStart, spec.cutEnd)), at = sweep.from + (sweep.to - sweep.from) * cut;
  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
    asset.group.updateMatrixWorld(true);
    // Everything above the cut, in the asset's own space, is gone; carried into world space with the turntable.
    plane.set(SWEEP.clone().negate(), at).applyMatrix4(asset.group.matrixWorld);
    sweep.line.visible = cut > 0 && cut < 1;
    // The point of the cut's edge above the cover's middle.
    sweep.line.position.set(sweep.middle, (at - SWEEP.x * sweep.middle) / SWEEP.y, sweep.back - .004 * radius);
    // Labels: each part's centre, projected, then laid in a column on its side, spaced so no two meet.
    camera.updateMatrixWorld();
    const labels = spec.labels ?? [], subject = new Vector3(...center).applyMatrix4(asset.group.matrixWorld).project(camera);
    // The subject's measured screen extent, so the label columns stand just clear of it.
    const { min, max } = asset.bounds, xs = [min[0], max[0]].flatMap(x => [min[1], max[1]].flatMap(y => [min[2], max[2]].map(z => new Vector3(x, y, z).applyMatrix4(asset.group.matrixWorld).project(camera).x)));
    const left = (Math.min(...xs) + 1) / 2, right = (Math.max(...xs) + 1) / 2;
    const points = labels.map(label => {
      const b = partBounds(asset.group, label.part), p = new Vector3(...b.center).project(camera);
      return { x: (p.x + 1) / 2, y: (1 - p.y) / 2, side: (p.x < subject.x ? "left" : "right") as LabelPoint["side"] };
    });
    const gap = .085, out: LabelPoint[] = points.map(p => ({ ...p, lx: 0, ly: p.y }));
    for (const side of ["left", "right"] as const) {
      const column = out.filter(p => p.side === side).sort((a, b) => a.y - b.y);
      column.forEach((p, i) => { p.ly = Math.max(p.y, i ? column[i - 1].ly + gap : .1); });
      for (let i = column.length - 1; i >= 0; i--) column[i].ly = Math.min(column[i].ly, i < column.length - 1 ? column[i + 1].ly - gap : .9);
      column.forEach(p => { p.lx = side === "left" ? left - .02 : right + .02; });
    }
    onLabels(out);
  });
  return <><Turntable yaw={turn} /><ShotCamera pose={orbitPose(center as Vec3, radius, { ...view, yaw: 0 }, aspect)} /></>;
}

/** A cut across the back takes the cover away and shows the parts inside, which are then named. */
export function InsideOut({ spec, ...props }: StudioRecipeProps & { spec: InsideOutSpec }) {
  const asset = useHeroAsset(props.create, [props.assetKey ?? "default"]);
  const labels = spec.labels ?? [], rows = useRef<Array<HTMLDivElement | null>>([]), lines = useRef<Array<SVGLineElement | null>>([]);
  const onLabels = useCallback((points: LabelPoint[]) => points.forEach((p, i) => {
    const row = rows.current[i], line = lines.current[i];
    if (row) { row.style.left = `${p.lx * 100}%`; row.style.top = `${p.ly * 100}%`; row.style.transform = `translate(${p.side === "left" ? "-100%" : "0"}, -50%)`; row.style.textAlign = p.side === "left" ? "right" : "left"; }
    if (line) { line.setAttribute("x1", `${(p.lx + (p.side === "left" ? .008 : -.008)) * 100}%`); line.setAttribute("y1", `${p.ly * 100}%`); line.setAttribute("x2", `${p.x * 100}%`); line.setAttribute("y2", `${p.y * 100}%`); }
  }), []);
  const ink = props.tone === "dark-on-light" ? "#13181f" : "#f4f6f9", shadow = props.tone === "dark-on-light" ? "0 1px 1px rgba(255,255,255,.5)" : "0 1px 2px rgba(0,0,0,.6), 0 0 14px rgba(0,0,0,.4)";
  const on = (i: number) => Math.min(1, Math.max(0, (props.frame - insideOutLabelFrame(spec, i)) / 8));
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...props.style }}>
    <FiberStage frame={props.frame} fps={props.fps} label={props.label ?? `${asset.id}, cut open to show ${labels.map(l => l.text).join(", ") || "the parts inside"}`} shadows style={{ position: "absolute", inset: 0 }}>
      <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
        <InsideScene asset={asset} spec={spec} frame={props.frame} onLabels={onLabels} />
      </FiberHeroStudio>
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {props.children}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-hidden="true">
        {labels.map((label, i) => <line key={label.part + i} ref={node => { lines.current[i] = node; }} stroke={ink} strokeOpacity={.8 * on(i)} strokeWidth={1.5} />)}
      </svg>
      {labels.map((label, i) => <div key={label.part + i} ref={node => { rows.current[i] = node; }} data-km-inside-label={label.part} style={{ position: "absolute", opacity: on(i), whiteSpace: "nowrap",
        font: "600 3cqh/1.15 var(--km-font-body, system-ui, sans-serif)", color: ink, textShadow: shadow, padding: "0 .6cqh" }}>{label.text}</div>)}
      <StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} />
    </div>
  </div>;
}
