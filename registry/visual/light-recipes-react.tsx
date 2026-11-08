/** Light recipes: show light doing something physical, as a pure function of `frame`.
 *
 * `LightThroughIt`: sun on a pool. A drop lands, its rings spread, and the bending surface focuses the light into moving lines on the
 * floor. The caustics are traced from the water's actual shape at that frame (see `caustics-three.ts`), so the light on the floor is
 * caused by the ripple you can see, not painted on.
 */
import { useLayoutEffect, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import {
  BoxGeometry, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SphereGeometry,
} from "three";
import type { Texture } from "three";
import type { RationalFps } from "../motion/types";
import { paintTexture } from "../craft/canvas-texture";
import { createStudioEnvironmentTexture } from "../craft/hero-studio";
import { FiberStage } from "./fiber-stage";
import { ShotCamera } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioTone } from "./studio-recipes-react";
import { easeInOut, orbitPose, span01 } from "./studio-shots";
import { applyCaustics, createCaustics } from "./caustics-three";
import { CALM_POOL, waterHeight } from "./light-shots";
import type { LightThroughSpec, WaterSurfaceSpec } from "./light-shots";

const FILL: CSSProperties = { position: "absolute", inset: 0 };
const POOL = { half: 2, depth: .62, water: .55, segments: 200 } as const;
/** Sun direction: high and a little behind the camera's left shoulder, so the caustics fall forward toward the viewer. */
const SUN: readonly [number, number, number] = [.32, -1, .22];

/** Pale mosaic: small tiles, a little colour variation per tile, darker grout. */
function mosaic(tiles: number, base: [number, number, number], seed: number): Texture {
  const texture = paintTexture(1024, 1024, (ctx, w, h, random) => {
    const size = w / tiles;
    ctx.fillStyle = "rgb(150,160,160)"; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < tiles; y++) for (let x = 0; x < tiles; x++) {
      const v = (random() - .5) * 14, tint = (random() - .5) * 8;
      ctx.fillStyle = `rgb(${base[0] + v - tint},${base[1] + v},${base[2] + v + tint})`;
      ctx.fillRect(x * size + size * .06, y * size + size * .06, size * .88, size * .88);
    }
  }, { seed, repeat: true });
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}
/** Warm travertine for the deck: large slabs with soft pits. */
function travertine(seed: number): Texture {
  const texture = paintTexture(1024, 1024, (ctx, w, h, random) => {
    ctx.fillStyle = "rgb(196,178,150)"; ctx.fillRect(0, 0, w, h);
    const slab = w / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = (random() - .5) * 18;
      ctx.fillStyle = `rgb(${200 + v},${182 + v},${154 + v})`; ctx.fillRect(x * slab + 2, y * slab + 2, slab - 4, slab - 4);
      for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(120,100,80,${.06 + random() * .1})`; ctx.beginPath(); ctx.ellipse(x * slab + random() * slab, y * slab + random() * slab, 2 + random() * 9, 1 + random() * 3, random() * 3, 0, 7); ctx.fill(); }
    }
  }, { seed, repeat: true });
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

function PoolScene({ spec, frame, fps }: { spec: LightThroughSpec; frame: number; fps: RationalFps }) {
  const scene = useThree(state => state.scene), gl = useThree(state => state.gl), size = useThree(state => state.size);
  const built = useMemo(() => {
    const group = new Group(), owned: Array<{ dispose(): void }> = [];
    const floorMap = mosaic(64, [176, 214, 216], 11), wallMap = mosaic(16, [206, 228, 230], 12), deckMap = travertine(13);
    owned.push(floorMap, wallMap, deckMap);
    const floorMat = new MeshStandardMaterial({ map: floorMap, roughness: .82, envMapIntensity: .25 }), wallMat = new MeshStandardMaterial({ map: wallMap, roughness: .7, envMapIntensity: .3 }), deckMat = new MeshStandardMaterial({ map: deckMap, roughness: .9, envMapIntensity: .3 });
    wallMap.repeat.set(4, 1.2); deckMap.repeat.set(3, 3);
    owned.push(floorMat, wallMat, deckMat);
    const floor = new Mesh(new PlaneGeometry(POOL.half * 2, POOL.half * 2), floorMat);
    floor.rotation.x = -Math.PI / 2; group.add(floor); owned.push(floor.geometry);
    // Four walls and a deck with a hole: the pool is sunk into the ground, the way the eye expects to look into one.
    for (let i = 0; i < 4; i++) {
      const wall = new Mesh(new BoxGeometry(POOL.half * 2 + .4, POOL.depth + .2, .2), wallMat);
      const a = i * Math.PI / 2; wall.position.set(Math.sin(a) * (POOL.half + .1), POOL.depth / 2 - .1, Math.cos(a) * (POOL.half + .1)); wall.rotation.y = a;
      group.add(wall); owned.push(wall.geometry);
      const deck = new Mesh(new PlaneGeometry(40, 20), deckMat);
      deck.rotation.x = -Math.PI / 2; deck.rotation.z = a; deck.position.set(Math.sin(a) * (POOL.half + .2 + 10), POOL.depth, Math.cos(a) * (POOL.half + .2 + 10));
      group.add(deck); owned.push(deck.geometry);
    }
    const water = new Mesh(new PlaneGeometry(POOL.half * 2, POOL.half * 2, POOL.segments, POOL.segments), new MeshPhysicalMaterial({
      color: "#e9fbff", transmission: 1, roughness: .02, ior: 1.33, thickness: .5, attenuationColor: new Color("#7cc8d2"), attenuationDistance: 3.2, specularIntensity: 1, envMapIntensity: .9,
    }));
    water.rotation.x = -Math.PI / 2; water.position.y = POOL.water; group.add(water); owned.push(water.geometry, water.material);
    const drop = new Mesh(new SphereGeometry(.03, 24, 16), new MeshPhysicalMaterial({ color: "#ffffff", transmission: 1, roughness: 0, ior: 1.33, thickness: .05 }));
    drop.scale.set(1, 1.25, 1); group.add(drop); owned.push(drop.geometry, drop.material);
    const sky = new HemisphereLight("#cfe4f5", "#7d6f5c", .2);
    const sun = new DirectionalLight("#fff3df", 1.7); sun.position.set(-SUN[0] * 10, -SUN[1] * 10, -SUN[2] * 10);
    group.add(sky, sun);
    const caustics = createCaustics({ light: SUN, floorY: 0, area: { x: 0, z: 0, half: POOL.half }, ior: 1.33, dispersion: .012, resolution: 1024, grid: 320 });
    caustics.addCaster(water);
    // The floor's sunlight arrives only through the water, as caustics; its direct sun term would double it.
    applyCaustics(floorMat, caustics, { intensity: 1.05, color: "#fff1dc", replaceDirect: true });
    const environment = createStudioEnvironmentTexture(512, "softbox");
    owned.push(environment, { dispose: () => caustics.dispose() });
    return { group, water, drop, caustics, environment, dispose: () => owned.forEach(o => o.dispose()) };
  }, []);
  useLayoutEffect(() => {
    const prior = { environment: scene.environment, background: scene.background };
    scene.add(built.group); scene.environment = built.environment; scene.environmentIntensity = .55; scene.background = new Color("#8fa4ac");
    return () => { scene.remove(built.group); scene.environment = prior.environment; scene.background = prior.background; built.dispose(); };
  }, [built, scene]);
  useLayoutEffect(() => {
    const fpsValue = fps.num / fps.den, seconds = frame / fpsValue;
    const surface: WaterSurfaceSpec = { swells: spec.swells ?? CALM_POOL, drops: spec.drop ? [{ ...spec.drop }] : [] };
    const position = built.water.geometry.getAttribute("position");
    // The plane lies in its local XY and is turned flat, so local y is world -z and local z is height.
    for (let i = 0; i < position.count; i++) position.setZ(i, waterHeight(surface, position.getX(i), -position.getY(i), seconds, fpsValue));
    position.needsUpdate = true;
    built.water.geometry.computeVertexNormals();
    built.water.geometry.computeBoundingBox();
    built.water.updateMatrixWorld(true);
    // The drop falls under gravity onto its landing point and disappears into the water.
    if (spec.drop) {
      const fall = .42, t = (spec.drop.frame - frame) / fpsValue;
      built.drop.visible = t > 0 && t < fall;
      built.drop.position.set(spec.drop.x, POOL.water + 4.9 * t * t, spec.drop.z);
    } else built.drop.visible = false;
    built.caustics.update(gl, scene);
  });
  const turn = easeInOut(span01(frame, 0, spec.durationFrames)) * (spec.orbit ?? 6);
  return <ShotCamera pose={orbitPose([0, POOL.depth * .2, 0], POOL.half * 1.25, { ...spec.view, yaw: spec.view.yaw + turn }, size.width / Math.max(1, size.height))} />;
}

export interface LightThroughItProps {
  frame: number;
  fps: RationalFps;
  spec: LightThroughSpec;
  tone?: StudioTone;
  label?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
/** Sun on a pool: a drop lands, its rings spread, and the surface focuses the light into moving caustics on the floor. */
export function LightThroughIt({ frame, fps, spec, tone = "light-on-dark", label, style, children }: LightThroughItProps) {
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...style }}>
    <FiberStage frame={frame} fps={fps} label={label ?? "Sunlight through rippling water, focused into moving lines on a pool floor"} style={FILL}>
      <PoolScene spec={spec} frame={frame} fps={fps} />
    </FiberStage>
    <div style={{ ...FILL, pointerEvents: "none" }}>{children}<StudioCaption beat={spec.title} frame={frame} tone={tone} /></div>
  </div>;
}
