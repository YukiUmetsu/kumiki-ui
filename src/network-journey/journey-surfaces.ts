/** Deterministic, license-free micro-surface maps for the Network Journey reference world.
 *  DataTexture works during camera-target precompilation (no DOM/canvas required).
 *  One texture per material family; do not generate texture assets per object/frame.
 */
import {
  DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping,
  RGBAFormat, UnsignedByteType,
} from "three";

export type JourneySurfaceKind = "brushed" | "polymer" | "ceramic" | "floor";

function hash(x: number, y: number, seed: number): number {
  let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263) ^ Math.imul(seed, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function sample(kind: JourneySurfaceKind, x: number, y: number): number {
  const fine = hash(x, y, 19);
  const coarse = hash(Math.floor(x / 8), Math.floor(y / 8), 43);
  switch (kind) {
    case "brushed": {
      // Parallel machining marks plus subdued isotropic microvariation.
      const stroke = .5 + .5 * Math.sin(y * 2.7 + 1.2 * Math.sin(x * .035));
      return .49 + stroke * .34 + fine * .12 + coarse * .05;
    }
    case "polymer":
      return .61 + fine * .17 + coarse * .17 + .05 * Math.sin(x * .31) * Math.sin(y * .27);
    case "ceramic":
      return .77 + fine * .08 + coarse * .08;
    case "floor": {
      // Subtle industrial floor joints and mottled matte paint.
      const joint = x % 32 < 2 || y % 32 < 2;
      return (joint ? .39 : .70) + fine * .10 + coarse * .12;
    }
  }
}

function makeMap(kind: JourneySurfaceKind, size = 128): DataTexture {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = Math.max(0, Math.min(255, Math.round(sample(kind, x, y) * 255)));
      const index = (y * size + x) * 4;
      pixels[index] = v;
      pixels[index + 1] = v;
      pixels[index + 2] = v;
      pixels[index + 3] = 255;
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat, UnsignedByteType);
  texture.name = `journey-${kind}-roughness-bump`;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(kind === "floor" ? 14 : 3, kind === "floor" ? 10 : 3);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Roughness uses the green channel and bump uses luminance in existing Three PBR materials. */
export function createJourneySurfaceTextures() {
  const brushed = makeMap("brushed");
  const polymer = makeMap("polymer");
  const ceramic = makeMap("ceramic");
  const floor = makeMap("floor");
  return {
    brushed,
    polymer,
    ceramic,
    floor,
    dispose() {
      brushed.dispose();
      polymer.dispose();
      ceramic.dispose();
      floor.dispose();
    },
  };
}
