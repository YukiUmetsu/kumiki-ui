/** Frame-addressable, genuinely geometric cave sign. No WebGL or DOM is required to author the model. */
import {
  BoxGeometry, CatmullRomCurve3, CylinderGeometry, Group, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, TorusGeometry, TubeGeometry,
  Vector3,
} from "three";
import type { Texture } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t); };

export function caveSignPoseAtFrame(frame: number) {
  const f = Math.max(0, frame);
  const travel = smooth((f - 26) / 110);
  const afterImpact = Math.max(0, f - 111);
  return {
    y: 6.35 - 4.72 * travel,
    swing: travel * (0.105 * Math.exp(-afterImpact / 67) * Math.sin(afterImpact * .095)
      + (1 - travel) * .08),
    turn: (1 - travel) * -.11 + Math.sin(afterImpact * .061) * .018 * Math.exp(-afterImpact / 78),
    opacity: smooth((f - 12) / 30) * (1 - smooth((f - 272) / 27)),
  };
}

export function caveCameraAtFrame(frame: number) {
  const f = Math.max(0, frame);
  const push = smooth(f / 240);
  return {
    position: [0.65 - .52 * push, 0.28 + .10 * push, 10.15 - 2.24 * push] as const,
    target: [0, -.25 + .08 * push, 0] as const,
    fov: 36,
  };
}

function roundedPlank(width: number, height: number, depth: number) {
  // RoundedBoxGeometry supplies coherent per-face UVs, so photographs don't shear at the sign centre.
  return new RoundedBoxGeometry(width, height, depth, 4, .055);
}

export interface CaveWoodTextures { diffuse?: Texture; normal?: Texture; roughness?: Texture; lettering?: Texture }

/** Real beveled wood, two hanging cords, metal suspension rings, and individual bolt heads. */
export function createCaveSignModel(textures: CaveWoodTextures = {}): Group {
  const pivot = new Group();
  pivot.name = "cave-sign-pivot";
  const board = new Group();
  pivot.add(board);
  const wood = new MeshStandardMaterial({
    color: "#ddb895", map: textures.diffuse ?? null, normalMap: textures.normal ?? null,
    roughnessMap: textures.roughness ?? null, roughness: .94, metalness: 0,
  });
  const endGrain = new MeshStandardMaterial({ color: "#4b2c17", roughness: .9 });
  const slats = new Group();
  slats.name = "wood-slats";
  board.add(slats);
  for (let i = 0; i < 4; i++) {
    const plank = new Mesh(roundedPlank(5.75 + [.03, -.11, .05, -.03][i], .55, .22), wood);
    plank.position.set([-.02, .035, -.027, .012][i], -1.46 - i * .535, i % 2 ? -.025 : 0);
    plank.rotation.z = [.005, -.006, .002, -.009][i];
    plank.castShadow = true;
    plank.receiveShadow = true;
    slats.add(plank);
  }
  // Behind the horizontal boards, two structural rails join the four pieces.
  for (const x of [-2.42, 2.42]) {
    const rail = new Mesh(new BoxGeometry(.20, 2.32, .18), endGrain);
    rail.position.set(x, -2.25, -.19);
    board.add(rail);
  }
  const bronze = new MeshPhysicalMaterial({ color: "#735d49", metalness: .83, roughness: .51, clearcoat: .18 });
  const ropeMat = new MeshStandardMaterial({ color: "#29221c", roughness: .75, metalness: .35 });
  const bolts = new Group();
  bolts.name = "brass-bolts";
  board.add(bolts);
  for (const x of [-2.50, 2.50]) for (let row = 0; row < 4; row++) {
    const bolt = new Mesh(new CylinderGeometry(.067, .067, .045, 12), bronze);
    bolt.position.set(x, -1.45 - row * .535, .28);
    bolt.rotation.x = Math.PI / 2;
    bolts.add(bolt);
  }
  for (const [name, x] of [["suspension-left", -2.1], ["suspension-right", 2.1]] as const) {
    const curve = new CatmullRomCurve3([
      new Vector3(x, -.04, .05), new Vector3(x + Math.sign(x) * .07, -.35, .06),
      new Vector3(x, -.86, .11), new Vector3(x, -1.30, .10),
    ]);
    const rope = new Mesh(new TubeGeometry(curve, 28, .045, 9, false), ropeMat);
    rope.name = name;
    rope.castShadow = true;
    pivot.add(rope);
    // Alternating chain links break the synthetic straight-rope silhouette.
    for (let i = 0; i < 10; i++) {
      const link = new Mesh(new TorusGeometry(.082, .022, 7, 14), ropeMat);
      link.position.set(x, -.115 - i * .126, .085);
      link.rotation.y = i % 2 ? Math.PI / 2 : 0;
      link.castShadow = true;
      pivot.add(link);
    }
    for (const y of [-.04, -1.28]) {
      const ring = new Mesh(new TorusGeometry(.14, .037, 10, 22), bronze);
      ring.position.set(x, y, .12);
      pivot.add(ring);
    }
  }
  if (textures.lettering) {
    const words = new Mesh(new BoxGeometry(5.38, 1.86, .001), new MeshStandardMaterial({
      map: textures.lettering, transparent: true, depthWrite: false, roughness: .9,
      metalness: .06, polygonOffset: true, polygonOffsetFactor: -1,
    }));
    words.name = "engraved-lettering";
    words.position.set(0, -2.25, .19);
    pivot.add(words);
  }
  return pivot;
}
