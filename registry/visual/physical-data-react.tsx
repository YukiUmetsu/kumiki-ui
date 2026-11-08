/** `PhysicalData`: a few values as stacks of real things. Each piece is a proof coin or a lacquered wooden block standing for
 * `unitValue`; pieces drop onto their columns one at a time and settle, and each column's number counts up as it grows. Height is the
 * value, so the comparison is felt before it is read (physical bar charts are recalled better weeks later than the same chart on a
 * screen: Stusak et al., CHI 2015). The highlighted value is gold among silver. Pure function of `frame`.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Group, InstancedMesh, Matrix4, MeshPhysicalMaterial, Quaternion, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import { paintTexture } from "../craft/canvas-texture";
import { createCoinFactory } from "../domains/finance-currency-3d";
import { FiberStage } from "./fiber-stage";
import { FiberHeroStudio, ShotCamera, useHeroAsset } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { easeInOut, orbitPose, span01 } from "./studio-shots";
import type { Vec3 } from "./studio-shots";
import { formatDataValue, physicalDataPieces } from "./story-3d-shots";
import type { PhysicalDataSpec } from "./story-3d-shots";

/** Sizes in metres: a 26 mm coin 1.95 mm thick, or a 50 mm block 20 mm tall, in columns about two pieces apart so labels never meet. */
const COIN = { radius: .013, pitch: .00195, gap: .052 }, BLOCK = { width: .05, pitch: .02, gap: .11 };
const FALL = 7;

function seeded(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

interface Piece { column: number; index: number; rest: Vec3; yaw: number; tilt: number; land: number }
interface Build { asset: HeroAsset; pieces: Piece[]; meshes: Array<{ mesh: InstancedMesh; ids: number[] }>; columns: Vec3[]; tops: number[]; pitch: number }

/** Every piece's resting place, with the small offsets of a hand-stacked pile, and the frame it lands. */
function buildData(spec: PhysicalDataSpec): Build {
  const res = createAssetResources(), group = new Group(), random = seeded(17), blocks = spec.pieces === "blocks";
  const counts = physicalDataPieces(spec), size = blocks ? BLOCK : COIN, pitch = size.pitch, gap = size.gap;
  const x0 = -(counts.length - 1) * gap / 2, interval = spec.interval ?? 3, pieces: Piece[] = [];
  counts.forEach((n, column) => {
    for (let index = 0; index < n; index++) pieces.push({ column, index, land: spec.dropStart + column * 4 + index * interval,
      rest: [x0 + column * gap + (random() - .5) * (blocks ? .002 : .0016), pitch * (index + .5), (random() - .5) * (blocks ? .002 : .0016)],
      yaw: blocks ? (random() - .5) * .08 : random() * Math.PI * 2, tilt: (random() - .5) * (blocks ? .01 : .03) });
  });
  const highlight = spec.series.findIndex(item => item.highlight), meshes: Build["meshes"] = [];
  if (blocks) {
    const grain = (base: string, seed: number) => res.own(paintTexture(256, 256, (ctx, w, h, r) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) { ctx.strokeStyle = `rgba(48,26,10,${.05 + r() * .13})`; ctx.lineWidth = .6 + r() * 2; ctx.beginPath(); const y = r() * h; for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y + Math.sin(x * .018 + i) * 5); ctx.stroke(); }
    }, { seed, repeat: true }));
    const geometry = res.own(new RoundedBoxGeometry(BLOCK.width, BLOCK.pitch * .97, BLOCK.width, 2, .003));
    const maple = res.own(new MeshPhysicalMaterial({ map: grain("#d2b084", 3), roughness: .55, clearcoat: .3, clearcoatRoughness: .4 }));
    const walnut = res.own(new MeshPhysicalMaterial({ map: grain("#6e4a30", 4), roughness: .5, clearcoat: .35, clearcoatRoughness: .35 }));
    for (const [material, own] of [[maple, (p: Piece) => p.column !== highlight], [walnut, (p: Piece) => p.column === highlight]] as const) {
      const ids = pieces.flatMap((p, i) => own(p) ? [i] : []); if (!ids.length) continue;
      meshes.push({ mesh: new InstancedMesh(geometry, material, ids.length), ids });
    }
  } else {
    // Gold for the value the scene is about, silver for the rest; all gold when nothing is highlighted.
    for (const metal of ["gold", "silver"] as const) {
      const ids = pieces.flatMap((p, i) => (highlight < 0 ? metal === "gold" : (p.column === highlight) === (metal === "gold")) ? [i] : []); if (!ids.length) continue;
      const coins = createCoinFactory(res, new Group(), { metal });
      meshes.push({ mesh: new InstancedMesh(coins.parts.top, coins.parts.front, ids.length), ids }, { mesh: new InstancedMesh(coins.parts.bottom, coins.parts.back, ids.length), ids });
    }
  }
  for (const { mesh } of meshes) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.name = "data-pieces"; group.add(mesh); }
  const columns = counts.map((_, i): Vec3 => [x0 + i * gap, 0, 0]), tops = counts.map(n => n * pitch);
  const half = (blocks ? BLOCK.width : COIN.radius * 2) / 2, tallest = Math.max(pitch * 6, ...tops);
  const asset: HeroAsset = { id: "physical-data", group, parts: res.parts, tier: "hero", metersPerUnit: 1, exposure: 1,
    bounds: { min: [x0 - half, 0, -half], max: [x0 + (counts.length - 1) * gap + half, tallest, half] }, studio: { palette: "graphite", keyAzimuth: -30 },
    craft: { materials: blocks ? ["lacquered maple and walnut"] : ["proof coins, gold and silver"], details: ["hand-stacked offsets", "one piece per unit"] }, dispose: res.dispose };
  return { asset, pieces, meshes, columns, tops, pitch };
}

const scratch = { m: new Matrix4(), q: new Quaternion(), e: new Quaternion(), p: new Vector3(), s: new Vector3() };
/** Places each piece at a frame: waiting above (hidden), falling with gravity, or resting in the stack. */
function placePieces(build: Build, spec: PhysicalDataSpec, frame: number) {
  const blocks = spec.pieces === "blocks", scale = blocks ? 1 : COIN.radius, drop = build.pitch * 14;
  for (const { mesh, ids } of build.meshes) {
    ids.forEach((id, slot) => {
      const piece = build.pieces[id], t = frame - (piece.land - FALL);
      if (t < 0) { scratch.m.makeScale(0, 0, 0); mesh.setMatrixAt(slot, scratch.m); return; }
      const fall = Math.min(1, t / FALL), lift = drop * (1 - fall * fall);
      scratch.p.set(piece.rest[0], piece.rest[1] + lift, piece.rest[2]);
      scratch.q.setFromAxisAngle(new Vector3(0, 1, 0), piece.yaw); scratch.e.setFromAxisAngle(new Vector3(1, 0, 0), piece.tilt * (1 - fall * .5)); scratch.q.multiply(scratch.e);
      scratch.s.setScalar(scale);
      mesh.setMatrixAt(slot, scratch.m.compose(scratch.p, scratch.q, scratch.s));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}

function DataScene({ build, spec, frame, onLabels }: { build: Build; spec: PhysicalDataSpec; frame: number; onLabels: (points: Array<{ x: number; y: number }>) => void }) {
  const size = useThree(state => state.size), camera = useThree(state => state.camera);
  const { bounds } = build.asset;
  // Framed with room under the stacks for the numbers on the table, and the open space above for the title.
  const center: Vec3 = [(bounds.min[0] + bounds.max[0]) / 2, (bounds.max[1]) * .42, 0];
  const radius = Math.hypot(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1], bounds.max[2] - bounds.min[2]) / 2 * 1.12;
  const view = spec.view ?? { yaw: 18, pitch: 16, fill: .95, offsetX: .16 }, drift = easeInOut(span01(frame, 0, spec.durationFrames));
  const pose = orbitPose(center, radius, { ...view, yaw: view.yaw - 6 + drift * 8, fill: (view.fill ?? .95) * (.94 + drift * .08) }, size.width / Math.max(1, size.height));
  useLayoutEffect(() => {
    placePieces(build, spec, frame);
    camera.updateMatrixWorld();
    const project = (p: Vec3) => { const v = new Vector3(...p).project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }; };
    const front = (spec.pieces === "blocks" ? BLOCK.width : COIN.radius * 2) * .7;
    onLabels(build.columns.map(c => project([c[0], 0, c[2] + front])));
  });
  return <ShotCamera pose={pose} />;
}

/** Values as stacks of coins or blocks, landing one piece at a time, each column counting up as it grows. */
export function PhysicalData({ spec, ...props }: Omit<StudioRecipeProps, "create"> & { spec: PhysicalDataSpec }) {
  const key = JSON.stringify([spec.series, spec.unitValue, spec.pieces, spec.dropStart, spec.interval]);
  const build = useMemo(() => buildData(spec), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const asset = useHeroAsset(() => build.asset, [build]);
  const bases = useRef<Array<HTMLDivElement | null>>([]);
  const onLabels = useCallback((points: Array<{ x: number; y: number }>) => points.forEach((p, i) => {
    const base = bases.current[i];
    if (base) { base.style.left = `${p.x * 100}%`; base.style.top = `${p.y * 100}%`; }
  }), []);
  const counts = physicalDataPieces(spec), ink = props.tone === "dark-on-light" ? "#13181f" : "#f4f6f9", accent = props.tone === "dark-on-light" ? "#8a5a00" : "#ffd27a";
  const shadow = props.tone === "dark-on-light" ? "0 1px 1px rgba(255,255,255,.5)" : "0 1px 2px rgba(0,0,0,.55), 0 0 18px rgba(0,0,0,.35)";
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...props.style }}>
    <FiberStage frame={props.frame} fps={props.fps} label={props.label ?? `Stacks of ${spec.pieces === "blocks" ? "blocks" : "coins"}: ${spec.series.map(item => `${item.label} ${formatDataValue(item.value, spec.format)}`).join(", ")}`} shadows style={{ position: "absolute", inset: 0 }}>
      <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
        <DataScene build={build} spec={spec} frame={props.frame} onLabels={onLabels} />
      </FiberHeroStudio>
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {props.children}
      {spec.series.map((item, i) => {
        // Each number stands on the table in front of its stack, over its label, where falling pieces never pass through it.
        const landed = build.pieces.filter(p => p.column === i && p.land <= props.frame).length, done = landed >= counts[i];
        const shown = done ? item.value : landed * spec.unitValue, colour = item.highlight ? accent : ink;
        return <div key={i} ref={node => { bases.current[i] = node; }} data-km-data-value={i} data-km-text-tracks="" style={{ position: "absolute", transform: "translate(-50%, 18%)", textAlign: "center", whiteSpace: "nowrap",
          opacity: Math.min(1, Math.max(0, (props.frame - spec.dropStart + 6) / 8)), color: colour, textShadow: shadow }}>
          {/* The number appears with the first piece, so a column never reads as zero before it starts. */}
          <div style={{ opacity: landed ? 1 : 0, font: `700 ${item.highlight ? 4.8 : 4.2}cqh/1.05 var(--km-font-display, var(--km-font-body, system-ui, sans-serif))`, fontVariantNumeric: "tabular-nums" }}>{formatDataValue(shown, spec.format)}</div>
          <div style={{ font: "600 2.7cqh/1.2 var(--km-font-body, system-ui, sans-serif)", opacity: .86 }}>{item.label}</div>
        </div>;
      })}
      {/* Stacks and their numbers fill the lower frame, so the title takes the open space above them. */}
      <StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} position="top" />
    </div>
  </div>;
}
