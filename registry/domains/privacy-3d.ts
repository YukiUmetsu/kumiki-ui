/** Crafted privacy and security hero assets: padlock with key, and a security shield.
 *
 * Padlock (1 unit = 1 cm): solid-brass body with radiused edges, hardened
 * chromed shackle with a long retaining leg, a pin-tumbler cylinder plug with a
 * warded keyway on the front, and a brass key with real bitting that inserts,
 * turns and releases the shackle. Shield: beveled brushed-steel rim around a
 * glossy enamel field with a raised glyph, standing in a turned pedestal.
 */
import {
  CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Group, LatheGeometry, Mesh, MeshBasicMaterial,
  MeshPhysicalMaterial, Path, Shape, ShapeGeometry, TubeGeometry, Vector2, Vector3,
} from "three";
import type { BufferGeometry, Material } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "../craft/hero-asset";
import type { AssetResources, HeroAsset } from "../craft/hero-asset";
import { applySurfaceDetail } from "../craft/surface-detail";
import { actionTime, captureRest, easeInOut, easeOutCubic, findAction, pulse, smooth, spring, window01 } from "../craft/hero-action";
import type { HeroActionSpec, HeroActionState } from "../craft/hero-action";

function add(res: AssetResources, parent: Group, geometry: BufferGeometry, material: Material, name: string, at?: [number, number, number]) {
  const mesh = new Mesh(res.own(geometry), material);
  if (at) mesh.position.set(...at);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(res.name(mesh, name));
  return mesh;
}

const brass = (res: AssetResources, color = "#c9a24f") => res.own(applySurfaceDetail(
  new MeshPhysicalMaterial({ color, metalness: 1, roughness: .28 }), { kind: "brushed", frequency: 120, strength: .00012, flow: [0, 1, 0] }));
const chrome = (res: AssetResources) => res.own(new MeshPhysicalMaterial({ color: "#e2e6ea", metalness: 1, roughness: .1 }));

const Z_AXIS = new Vector3(0, 0, 1);

// ------------------------------------------------------------------ key

/** Pin-tumbler key outline (XY, blade along +X, tip at x = bladeEnd). Cuts follow `bitting` depths. */
function keyShape(bitting: readonly number[]): Shape {
  const s = new Shape();
  const bow = 1.45, blade = 3.2, bh = .78;
  // Bow: rounded head with a hanging hole.
  s.moveTo(-bow * .2, -bh / 2 - .25);
  s.bezierCurveTo(-bow * 1.2, -bh / 2 - .45, -bow * 1.25, bh / 2 + .45, -bow * .2, bh / 2 + .25);
  s.lineTo(0, bh / 2 + .12); s.lineTo(.18, bh / 2); // shoulder
  // Top edge with bitting cuts (V-cuts at even spacing).
  const spacing = (blade - .7) / bitting.length;
  let x = .45;
  s.lineTo(x, bh / 2);
  for (const depth of bitting) {
    s.lineTo(x + spacing * .5, bh / 2 - depth * .32);
    s.lineTo(x + spacing, bh / 2);
    x += spacing;
  }
  s.lineTo(blade - .15, bh / 2); s.lineTo(blade, 0); s.lineTo(blade - .12, -bh / 2 + .05);
  s.lineTo(.18, -bh / 2); s.lineTo(0, -bh / 2 - .12); s.closePath();
  const hole = new Path(); hole.absarc(-bow * .72, 0, .26, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

function buildKey(res: AssetResources, material: Material, name: string): Group {
  const key = new Group();
  const g = new ExtrudeGeometry(keyShape([.9, .4, 1, .55, .8]), { depth: .16, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2, curveSegments: 16 });
  g.translate(0, 0, -.08);
  add(res, key, g, material, `${name}-blade-and-bow`);
  // Milled warding grooves along both faces of the blade.
  const groove = res.own(new MeshPhysicalMaterial({ color: "#6e5a2a", metalness: 1, roughness: .5 }));
  for (const z of [-.105, .105]) add(res, key, new RoundedBoxGeometry(2.8, .07, .02, 1, .008), groove, `${name}-warding-groove`, [1.65, -.05, z]);
  return key;
}

// ------------------------------------------------------------------ padlock

export const PADLOCK_ACTIONS: readonly HeroActionSpec[] = [
  { id: "unlock", label: "Unlock with key", durationFrames: 72, loop: false, meaning: "Access granted / decryption: the key turns and the shackle springs open." },
  { id: "lock", label: "Snap shut", durationFrames: 36, loop: false, meaning: "Secured / encrypted: the open shackle swings back and snaps closed." },
];

export function createPadlock(options: { id?: string; withKey?: boolean } = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "padlock";
  const BW = 5, BH = 5.4, BD = 2.4, legX = 1.55, shackleR = .36;
  const body = brass(res);
  add(res, group, new RoundedBoxGeometry(BW, BH, BD, 6, .45), body, "padlock-brass-body", [0, BH / 2, 0]);
  // Shoulder band: a slightly darker machined step around the top of the body.
  add(res, group, new RoundedBoxGeometry(BW - .2, .18, BD + .04, 3, .08), brass(res, "#a8853d"), "padlock-machined-band", [0, BH - .7, 0]);
  // Cylinder plug with warded keyway on the front face.
  const plug = brass(res, "#b8913f");
  const plugGeo = new LatheGeometry([new Vector2(.95, 0), new Vector2(.95, .08), new Vector2(.85, .14), new Vector2(.7, .12), new Vector2(0, .12)], 48);
  plugGeo.rotateX(Math.PI / 2);
  add(res, group, plugGeo, plug, "padlock-cylinder-plug", [0, 1.9, BD / 2 - .02]);
  const keyway = new Shape();
  keyway.moveTo(-.09, .55); keyway.lineTo(.09, .55); keyway.lineTo(.12, .2); keyway.lineTo(.04, .05); keyway.lineTo(.12, -.15);
  keyway.lineTo(.05, -.5); keyway.lineTo(-.09, -.5); keyway.lineTo(-.03, -.2); keyway.lineTo(-.12, 0); keyway.closePath();
  const slot = add(res, group, new ShapeGeometry(keyway), res.own(new MeshBasicMaterial({ color: "#050403" })), "padlock-warded-keyway", [0, 1.9, BD / 2 + .105]);
  slot.castShadow = false;
  // Hardened chrome shackle: U-tube with a long retaining leg (left) and a short leg (right).
  const top = BH + 2.6;
  const path = new CatmullRomCurve3([
    new Vector3(-legX, BH - 1.6, 0), new Vector3(-legX, top - legX, 0),
    ...Array.from({ length: 13 }, (_, i) => { const a = Math.PI - i / 12 * Math.PI; return new Vector3(Math.cos(a) * legX, top - legX + Math.sin(a) * legX, 0); }),
    new Vector3(legX, top - legX, 0), new Vector3(legX, BH - .45, 0),
  ], false, "centripetal");
  const shackle = new Group();
  shackle.position.set(-legX, 0, 0);
  group.add(res.name(shackle, "padlock-shackle-pivot"));
  const tube = add(res, shackle, new TubeGeometry(path, 160, shackleR, 20, false), chrome(res), "padlock-hardened-shackle");
  tube.position.set(legX, 0, 0);
  for (const x of [-legX, legX]) add(res, shackle, new CylinderGeometry(shackleR, shackleR, .02, 20), chrome(res), "padlock-shackle-end", [x + legX, x < 0 ? BH - 1.6 : BH - .45, 0]);
  let key: Group | undefined;
  if (options.withKey ?? true) {
    key = buildKey(res, brass(res, "#d4af5e"), "padlock-key");
    // Key held in front of the keyway: blade points into the lock (-Z), bitting up, thin across the slot.
    key.rotation.set(0, Math.PI / 2, 0);
    key.position.set(0, 1.9, BD / 2 + 3.4);
    group.add(res.name(key, "padlock-key"));
  }
  const rest = captureRest([shackle, ...(key ? [key] : [])]);
  return {
    id: group.name, group, parts: res.parts, tier: "hero", metersPerUnit: .01, exposure: 1,
    bounds: { min: [-BW / 2 - .5, 0, -BD / 2 - .5], max: [BW / 2 + .5, top + shackleR, BD / 2 + 6] },
    studio: { palette: "graphite", keyAzimuth: -35 },
    craft: {
      materials: ["solid brass body (brushed)", "hardened chromed shackle", "brass key with milled warding grooves"],
      details: ["radiused body with machined shoulder band", "lathe-turned cylinder plug with warded keyway", "long retaining leg on a real swing pivot",
        "key outline with five bitting cuts and a bow hole"],
    },
    actions: PADLOCK_ACTIONS,
    pose(state: HeroActionState) {
      rest.restore();
      if (!state.id) return;
      const spec = findAction(PADLOCK_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
      if (spec.id === "unlock") {
        if (key) {
          const kr = rest.of(key);
          const insert = easeInOut(t / .35), turn = easeInOut(window01(t, .38, .55));
          key.position.z = kr.position.z - 2.2 * insert;
          // Turn about the blade axis (world Z), composed on top of the rest orientation.
          key.quaternion.setFromAxisAngle(Z_AXIS, -turn * Math.PI / 2).multiply(kr.quaternion);
        }
        const pop = spring(Math.max(0, t - .55) * 2.2, 2.2, .4);
        shackle.position.y = .9 * pop;
        shackle.rotation.y = -easeOutCubic(window01(t, .7, .95)) * Math.PI * .55;
      } else {
        // Starts open (raised and swung), swings home, then snaps down.
        const swing = 1 - easeInOut(t / .5), drop = window01(t, .5, .62);
        shackle.position.y = .9 * (1 - drop) - .06 * pulse(t, .6, .63, .66, .75);
        shackle.rotation.y = -swing * Math.PI * .55;
        if (key) key.visible = false;
      }
    },
    dispose: res.dispose,
  };
}

// ------------------------------------------------------------------ shield

export const SHIELD_ACTIONS: readonly HeroActionSpec[] = [
  { id: "protect", label: "Raise shield", durationFrames: 45, loop: false, meaning: "Protection switches on: the shield spins up into place and locks." },
  { id: "pulse", label: "Protective pulse", durationFrames: 60, loop: true, meaning: "Ongoing protection: an energy ripple radiates from the shield." },
];

function shieldOutline(scale = 1): Shape {
  const w = 1.8 * scale, top = 1.75 * scale, shoulder = 1.48 * scale, bottom = -2.25 * scale;
  const s = new Shape();
  s.moveTo(-w, shoulder);
  s.quadraticCurveTo(-w * .45, shoulder + .02 * scale, 0, top);
  s.quadraticCurveTo(w * .45, shoulder + .02 * scale, w, shoulder);
  s.lineTo(w * .97, .1 * scale);
  s.bezierCurveTo(w * .9, -1.15 * scale, w * .45, -1.8 * scale, 0, bottom);
  s.bezierCurveTo(-w * .45, -1.8 * scale, -w * .9, -1.15 * scale, -w * .97, .1 * scale);
  s.closePath();
  return s;
}

/** Security shield emblem (abstract tier) in a turned pedestal; 1 unit ≈ 5 cm. */
export function createSecurityShield(options: { id?: string; enamel?: string; glyph?: "check" | "lock" } = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "security-shield";
  const shield = new Group();
  shield.position.y = 3.15;
  group.add(res.name(shield, "shield-emblem"));
  const steel = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#c3c8cf", metalness: 1, roughness: .24 }), { kind: "brushed", frequency: 90, strength: .0002, flow: [1, 0, 0] }));
  const rimShape = shieldOutline(1);
  rimShape.holes.push(shieldOutline(.84) as unknown as Path);
  const rim = new ExtrudeGeometry(rimShape, { depth: .42, bevelEnabled: true, bevelSize: .07, bevelThickness: .07, bevelSegments: 4, curveSegments: 24 });
  rim.translate(0, 0, -.21);
  add(res, shield, rim, steel, "shield-brushed-rim");
  const enamel = res.own(new MeshPhysicalMaterial({ color: options.enamel ?? "#14507a", roughness: .12, metalness: .1, clearcoat: 1, clearcoatRoughness: .04, sheen: .3, sheenColor: "#66b8ff" }));
  const field = new ExtrudeGeometry(shieldOutline(.85), { depth: .3, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2, curveSegments: 24 });
  field.translate(0, 0, -.18);
  add(res, shield, field, enamel, "shield-enamel-field");
  // Raised glyph.
  const glyph = new Shape();
  if ((options.glyph ?? "check") === "check") {
    glyph.moveTo(-.95, .05); glyph.lineTo(-.55, .45); glyph.lineTo(-.22, .12); glyph.lineTo(.7, 1.05); glyph.lineTo(1.1, .65); glyph.lineTo(-.22, -.68); glyph.closePath();
  } else {
    glyph.absarc(0, -.35, .75, 0, Math.PI * 2, false);
  }
  const glyphGeo = new ExtrudeGeometry(glyph, { depth: .12, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 3 });
  glyphGeo.translate(0, -.2, .17);
  add(res, shield, glyphGeo, steel, "shield-raised-glyph");
  // Ripple: a thin shield-shaped ring that expands and fades (pulse action).
  const rippleShape = shieldOutline(1.04); rippleShape.holes.push(shieldOutline(.99) as unknown as Path);
  const rippleMat = res.own(new MeshBasicMaterial({ color: "#7fd0ff", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const ripple = add(res, shield, new ShapeGeometry(rippleShape, 24), rippleMat, "shield-energy-ripple");
  ripple.castShadow = false;
  // Turned pedestal with a slot that holds the shield's point.
  const pedestal = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#2a2d31", metalness: .8, roughness: .35 }), { kind: "brushed", frequency: 80, flow: [0, 1, 0] }));
  add(res, group, new LatheGeometry([new Vector2(1.5, 0), new Vector2(1.5, .12), new Vector2(1.35, .2), new Vector2(1.0, .35), new Vector2(.9, .7),
    new Vector2(1.05, .85), new Vector2(1.05, .95), new Vector2(0, .95)], 64), pedestal, "shield-turned-pedestal");
  const rest = captureRest([shield, ripple]);
  return {
    id: group.name, group, parts: res.parts, tier: "hero", metersPerUnit: .05, exposure: 1,
    bounds: { min: [-2.2, 0, -1.6], max: [2.2, 5.2, 1.6] },
    studio: { palette: "midnight", keyAzimuth: -35 },
    craft: {
      materials: ["brushed steel rim and glyph", "glossy enamel field with clearcoat", "turned pedestal"],
      details: ["beveled shield outline with shoulders and point", "recessed enamel field", "raised check glyph", "energy ripple for the pulse action"],
      stylization: "Abstract emblem tier: a security metaphor, not a medieval shield.",
    },
    actions: SHIELD_ACTIONS,
    pose(state: HeroActionState) {
      rest.restore();
      rippleMat.opacity = 0;
      if (!state.id) return;
      const spec = findAction(SHIELD_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
      const r = rest.of(shield);
      if (spec.id === "protect") {
        const rise = spring(t * 1.3, 1.3, .45);
        shield.position.y = r.position.y - 1.2 * (1 - rise);
        shield.rotation.y = (1 - easeOutCubic(t / .7)) * Math.PI * 2.5;
        shield.scale.setScalar(.6 + .4 * smooth(t / .5));
      } else {
        const k = t;
        ripple.scale.setScalar(1 + k * .55);
        rippleMat.opacity = .85 * (1 - k) * smooth(k / .1);
        shield.position.y = r.position.y + .05 * Math.sin(t * Math.PI * 2);
      }
    },
    dispose: res.dispose,
  };
}
