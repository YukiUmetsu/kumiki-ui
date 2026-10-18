/** The followed subject is a visible signal traveling along a link,
 * not a fictional solid "IP packet." Internet traffic may cross electrical,
 * optical, and radio links; this is a deliberately labeled light-pulse metaphor.
 *
 * Three.js sprites share one procedural radial texture, avoid external assets,
 * preserve the semantic root for CC1 framing, and can be evaluated at any MG1
 * frame without accumulated velocity or particle simulation.
 */
import {
  AdditiveBlending, DataTexture, Group, RGBAFormat, Sprite, SpriteMaterial,
  UnsignedByteType, Vector3,
} from "three";

function radialTexture(): DataTexture {
  const side = 64, pixels = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const dx = (x + .5 - side / 2) / (side / 2);
    const dy = (y + .5 - side / 2) / (side / 2);
    const radius = Math.sqrt(dx * dx + dy * dy);
    const fade = Math.pow(Math.max(0, 1 - radius), 2.4);
    const i = (y * side + x) * 4;
    pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255;
    pixels[i + 3] = Math.round(fade * 255);
  }
  const texture = new DataTexture(pixels, side, side, RGBAFormat, UnsignedByteType);
  texture.name = "journey-link-signal-glow";
  texture.needsUpdate = true;
  return texture;
}

export interface JourneySignalPulse {
  root: Group;
  /** Position relative to the same root CC1 tracks by semantic ID. */
  update(frame: number, travelDirection: readonly [number, number, number]): void;
  dispose(): void;
}

export function createJourneySignalPulse(): JourneySignalPulse {
  const texture = radialTexture();
  const root = new Group();
  root.name = "signal-pulse-metaphor";
  const materials: SpriteMaterial[] = [];
  const make = (color: string, opacity: number, size: number) => {
    const material = new SpriteMaterial({
      map: texture, color, transparent: true, opacity,
      blending: AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    materials.push(material);
    const sprite = new Sprite(material);
    sprite.scale.set(size, size, 1);
    root.add(sprite);
    return sprite;
  };
  const halo = make("#5fd3d1", .18, .95);
  const core = make("#fff0c7", .94, .37);
  const trail = [
    make("#e4be80", .38, .35),
    make("#71c9c2", .25, .27),
    make("#71c9c2", .13, .18),
  ];
  const direction = new Vector3(1, 0, 0);
  function update(frame: number, tangent: readonly [number, number, number]) {
    direction.set(...tangent);
    if (direction.lengthSq() < 1e-9) direction.set(1, 0, 0);
    direction.normalize();
    const intensity = .93 + .07 * Math.cos(frame * .115);
    core.material.opacity = .94 * intensity;
    halo.material.opacity = .17 * intensity;
    core.position.set(0, 0, 0);
    halo.position.set(0, 0, 0);
    for (let i = 0; i < trail.length; i++) {
      trail[i].position.copy(direction).multiplyScalar(-.20 * (i + 1));
      trail[i].material.opacity = [.38, .25, .13][i] * intensity;
    }
  }
  update(0, [1, 0, 0]);
  return {
    root, update,
    dispose() {
      for (const material of materials) material.dispose();
      texture.dispose();
    },
  };
}
