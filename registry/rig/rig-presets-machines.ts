/**
 * RIG1 machine presets: steam locomotive, vintage and modern cars with driving actions, bicycle with rider,
 * propeller plane, helicopter, hot-air balloon, sailing ship and pendulum clock. Original designs (CC0 dedication),
 * no brands, badges or plates with text.
 *
 * Car actions are physical, not keyed wobbles: braking pitches the body on a damped spring driven by the actual
 * deceleration (the nose dives, then rebounds when the car stops), a sudden stop locks the wheels into a skid with
 * tyre smoke and throws the driver forward, reversing rolls the wheels backward, and turning in depth foreshortens
 * the side by cos(yaw) while the rear or front face opens by sin(yaw) and the car shrinks into, or grows out of, the
 * distance.
 */
import type { RigDriver, RigRole, RigRootKey, RigSpec } from "./rig-spec";
import { Rig, alloyPath, at, cap, ell, finish, path, poly, rect, ring, sampledPath, travel, tube, wheelPath } from "./rig-kit";
import type { RigPresetOptions } from "./rig-kit";
import { addPersonBody } from "./rig-presets-living";

// ---- Car actions -----------------------------------------------------------------------------------------------------------------

export const CAR_MOTIONS = ["drive", "brake", "sudden-brake", "reverse", "turn-away", "turn-toward"] as const;
export const MODERN_CAR_MOTIONS = [...CAR_MOTIONS, "open-window", "flash-lights", "indicate", "hazards"] as const;
/** Motions that keep the car on screen (they start, stop or stay put): a locked camera reads them best. */
export const CAR_STAGED = new Set(["brake", "sudden-brake", "reverse", "turn-away", "turn-toward", "open-window", "flash-lights", "hazards"]);

interface CarBones {
  u: number; body: string; wheels: readonly string[]; head?: string; driver?: string;
  brake?: string[]; reverse?: string[];
  /** Indicators on the side facing the camera (the right side when the car faces right) and on the far side. */
  indicators?: string[]; farIndicators?: string[]; beam?: string[]; glass?: string; arm?: string; hand?: string; smoke?: string[];
}
/** Wire a car action: root path, suspension, lights, skids, turns. Returns the root keys. */
function carAction(rig: Rig, o: RigPresetOptions, m: string, c: CarBones, size: number): RigRootKey[] {
  const start = o.start ?? 0, end = o.end ?? 180, D = end - start, t = at(start, end), y = o.y ?? 0, u = c.u;
  const from = o.from ?? 0, to = o.to ?? from + 1200;
  const light = (bones: string[] | undefined, s: number, e: number, blink = false): void => {
    if (bones?.length && e > s) rig.drivers.push({ type: "flash", bones, start: s, end: e, ramp: 0, ...(blink ? { period: 20, duty: .5, fade: 1.5 } : {}) });
  };
  // Body pitch and heave from the real acceleration: nose dives under braking, squats under throttle, rebounds.
  rig.drivers.push({ type: "suspension", bone: c.body, pitch: 26 / u, heave: 16 / u, period: 24, damping: .3, max: 6 });
  if (c.head) rig.drivers.push({ type: "suspension", bone: c.head, pitch: 70 / u, period: 16, damping: .24, max: 16 });
  switch (m) {
    case "brake": case "sudden-brake": {
      const hard = m === "sudden-brake", tb = t(hard ? .3 : .2), ts = tb + Math.round(D * (hard ? .075 : .42));
      // Constant deceleration from cruise to rest: the braking segment starts at cruise speed (ease-out-quad).
      const v = (to - from) / ((tb - start) + (ts - tb) / 2), xb = from + v * (tb - start);
      light(c.brake, tb - 2, end);
      if (hard) {
        const wheel = rig.drivers.find(d => d.type === "wheel") as Extract<RigDriver, { type: "wheel" }> | undefined;
        if (wheel) Object.assign(wheel, { lock: [{ start: tb + 3, end: ts }] });
        light([...c.indicators ?? [], ...c.farIndicators ?? []], ts + 18, end, true);
        for (const [i, origin] of (c.smoke ?? []).entries()) {
          const puffs = Array.from({ length: 10 }, (_, k) => { const id = `skid-${i}-${k}`; rig.bone(id, "root", 0, 0); rig.part(id, id, ell(0, 0, 4.4, 3.4), "smoke", 9); return id; });
          rig.drivers.push({ type: "emitter", start: tb + 3, end: ts + 2, ramp: 0, puffs, origin, every: 1, life: 34, velocity: [-.05 * u, -.32 * u], growth: 3.4, drift: .8 * u });
        }
      }
      return [{ frame: start, x: from, y }, { frame: tb, x: xb, y, ease: "linear" }, { frame: ts, x: to, y, ease: "ease-out-quad" }];
    }
    case "reverse": {
      // Parked facing right, then backs up to `to`: wheels and feet run on signed travel, so they roll backward.
      light(c.reverse, t(.06), t(.84)); light(c.brake, t(.72), t(.9));
      if (c.head) rig.track(c.head, [{ frame: t(.06), scaleX: 1 }, { frame: t(.1), scaleX: -1, ease: "ease-in-out-cubic" }, { frame: t(.8), scaleX: -1 }, { frame: t(.84), scaleX: 1, ease: "ease-in-out-cubic" }]);
      return [{ frame: start, x: from, y, facing: 1 }, { frame: t(.12), x: from, y }, { frame: t(.78), x: to, y, ease: "ease-in-out-quad" }];
    }
    case "turn-away": case "turn-toward": {
      // Signal, then steer across lanes in depth: the yaw peaks mid-turn, the car shrinks (away) or grows (toward)
      // and rises or drops on screen with its distance; the side foreshortens and the end face shows.
      const away = m === "turn-away", s1 = away ? .62 : 1.3, yawMax = away ? 26 : -24, dy = away ? -.36 * size : .16 * size;
      const a = t(.36), b = t(.78);
      // Facing right we see the car's right side: turning away is a left turn, signalled by the far-side (left)
      // indicators, which only show on the corners once the car yaws; turning toward the camera is a right turn.
      light(away ? c.farIndicators : c.indicators, t(.1), t(.6), true);
      const shape = (f: number) => { const k = Math.min(1, Math.max(0, (f - a) / (b - a))); return { k: k * k * (3 - 2 * k), yaw: yawMax * Math.sin(Math.PI * k) ** 1.2 }; };
      // Integrate screen x for a constant ground speed so the car neither surges nor stalls through the turn.
      let total = 0;
      for (let f = start; f < end; f++) { const p = shape(f + .5); total += (1 + (s1 - 1) * p.k) * Math.cos(p.yaw * Math.PI / 180); }
      const v = (to - from) / total;
      let x = from, f0 = start;
      return sampledPath(start, end, 4, f => {
        for (; f0 < f; f0++) { const p = shape(f0 + .5); x += v * (1 + (s1 - 1) * p.k) * Math.cos(p.yaw * Math.PI / 180); }
        const p = shape(f);
        return { x, y: y + dy * p.k, scale: 1 + (s1 - 1) * p.k, yaw: p.yaw };
      });
    }
    case "open-window": {
      if (c.glass) rig.track(c.glass, [{ frame: t(.12), y: 0 }, { frame: t(.34), y: 9.6 * u, ease: "ease-in-out-cubic" }, { frame: t(.86), y: 9.6 * u }, { frame: t(.98), y: 0, ease: "ease-in-out-cubic" }]);
      if (c.arm) {
        // The forearm rises out of the open window (elbow on the sill), waves, and drops back in before it closes.
        rig.track(c.arm, [{ frame: start, opacity: 0, rotate: 40 }, { frame: t(.36), opacity: 0, rotate: 40 }, { frame: t(.37), opacity: 1 }, { frame: t(.45), rotate: 0, ease: "ease-out-back" },
          { frame: t(.8), rotate: 0 }, { frame: t(.85), opacity: 1, rotate: 40 }, { frame: t(.86), opacity: 0 }]);
        if (c.hand) rig.drivers.push({ type: "oscillate", start: t(.46), end: t(.8), bone: c.hand, property: "rotate", amplitude: 22, period: 14, ramp: 5 });
      }
      return [{ frame: start, x: from, y, facing: o.facing ?? 1 }];
    }
    case "flash-lights":
      for (const at0 of [t(.28), t(.62)]) rig.drivers.push({ type: "flash", bones: c.beam ?? [], start: at0, end: at0 + 22, ramp: 0, period: 11, duty: .55, fade: 1 });
      return [{ frame: start, x: from, y, facing: o.facing ?? 1 }];
    case "hazards":
      light([...c.indicators ?? [], ...c.farIndicators ?? []], t(.1), end, true);
      return [{ frame: start, x: from, y, facing: o.facing ?? 1 }];
    case "indicate":
      light(c.indicators, start, end, true);
      return [{ frame: start, x: from, y }, { frame: end, x: to, y, ease: "linear" }];
    default:
      return [{ frame: start, x: from, y }, { frame: end, x: to, y, ease: "linear" }];
  }
}
/** Duplicate parts onto the far side of a solid figure (far wheels under the body faces, the other lamps over them). */
function farCopy(rig: Rig, ids: string[], mode: "under" | "over") {
  for (const id of ids) { const q = rig.parts.find(p => p.id === id); if (q) rig.parts.push({ ...q, id: id + "-far", far3d: mode, far: mode === "under" ? true : q.far }); }
}
/** Lights are bones that only show while a `flash` driver switches them on: this registers them, switched off. */
const lightsOff = (bones: string[]): RigDriver => ({ type: "flash", bones, start: -2, end: -1, ramp: 0 });
/** Natural on-screen speed for a car of length `size`, px per frame (city speed, about 30 km/h). */
export const carPace = (motion: string, size: number) => motion === "indicate" ? size * .045 : CAR_STAGED.has(motion) ? 0 : size * .065;

/** A vintage car with spoked wheels and a driver: drive, brake, sudden brake, reverse and turn in depth. Length = `size`. */
export function carRig(o: RigPresetOptions = {}): RigSpec {
  const size = o.size ?? 380, u = size / 100, rig = new Rig(u), m = o.motion ?? "drive", R = 11;
  const palette: Partial<Record<RigRole, string>> = { paint: "#c8342b", "paint-dark": "#8f2219", metal: "#cfd2d4", "metal-dark": "#2a2a2e", rubber: "#1d1b1b", glass: "#bfd8e0", light: "#f2d98a", skin: "#d39b76", hair: "#2b211c", smoke: "#c9c4b6", accent: "#9e1d16" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, -R - 2);
  rig.part("body", "body", path("M-48 -4C-48 -12 -44 -16 -36 -16L-24 -16L-16 -34C-14 -38 -10 -40 -6 -40L16 -40C20 -40 22 -38 24 -34L30 -18L44 -16C50 -15 52 -10 52 -4L52 2C52 4 50 5 48 5L-46 5C-48 5 -48 4 -48 2Z"), "paint", 4, { extrude: true });
  rig.part("window-back", "body", path("M-14 -18L-8 -34C-7 -36 -5 -37 -3 -37L4 -37L4 -18Z"), "glass", 4.2);
  rig.part("window-front", "body", path("M8 -37L15 -37C17 -37 19 -36 20 -34L26 -18L8 -18Z"), "glass", 4.2);
  rig.part("mudguard-r", "body", path("M-44 4A15 15 0 0 1 -16 4Z"), "paint-dark", 5.2);
  rig.part("mudguard-f", "body", path("M18 4A15 15 0 0 1 46 4Z"), "paint-dark", 5.2);
  rig.part("bumper", "body", rect(48, 0, 7, 3, 1.4), "metal", 5.3);
  rig.part("lamp", "body", ell(49, -9, 2.6, 3), "light", 5.3);
  rig.part("tail-lamp", "body", ell(-47.4, -8, 1.6, 2), "accent", 5.3);
  rig.bone("brake", "body", -47.4, -8);
  rig.part("brake", "brake", ell(0, 0, 2, 2.4), "light", 5.35, { color: "#ff4a36" });
  rig.part("handle", "body", rect(-2, -14, 6, 1.4, .6), "metal", 4.3);
  rig.bone("driver", "body", -2, -26);
  rig.part("driver-head", "driver", ell(0, 0, 6.4, 7), "skin", 4.1);
  rig.part("driver-cap", "driver", path("M-7 -1C-7 -9 7 -9 7 -2L10 -1L-7 0Z"), "hair", 4.15);
  rig.part("driver-nose", "driver", ell(6.2, 1, 1.4, 1.4), "skin", 4.12);
  const wheels: string[] = [];
  for (const [id, x] of [["wheel-r", -30], ["wheel-f", 32]] as const) {
    rig.bone(id, "root", x, -R);
    wheels.push(id);
    rig.part(id, id, path(wheelPath(R, 14, .26)), "rubber", 5);
    rig.part(id + "-hub", id, ell(0, 0, 3.2, 3.2), "metal", 5.1);
    rig.bone(id + "-contact", "root", x, 0);
  }
  rig.drivers.push({ type: "wheel", bones: wheels, radius: R * u },
    { type: "oscillate", bone: "body", property: "y", amplitude: 1.1 * u, period: 11, wobble: .6, bySpeed: true },
    { type: "oscillate", bone: "body", property: "rotate", amplitude: .8, period: 17, wobble: .5, bySpeed: true },
    { type: "oscillate", bone: "driver", property: "rotate", amplitude: 4, period: 48, wobble: .5 });
  const puffs: string[] = [];
  for (let i = 0; i < 6; i++) { const id = "puff-" + i; rig.bone(id, "root", 0, 0); puffs.push(id); rig.part(id, id, ell(0, 0, 3, 2.6), "smoke", 2); }
  rig.bone("exhaust", "body", -48, 2);
  rig.drivers.push({ type: "emitter", puffs, origin: "exhaust", every: 8, life: 40, velocity: [-.2 * u, -.18 * u], growth: 2, drift: .6 * u });
  farCopy(rig, ["wheel-r", "wheel-r-hub", "wheel-f", "wheel-f-hub"], "under");
  farCopy(rig, ["lamp", "tail-lamp", "brake"], "over");
  rig.drivers.push(lightsOff(["brake"]));
  const root = carAction(rig, o, m, { u, body: "body", wheels, head: "driver", brake: ["brake"], smoke: ["wheel-r-contact", "wheel-f-contact"] }, size);
  return { ...finish("car", "car", rig, root, palette, { x: -50 * u, y: -56 * u, width: 108 * u, height: 58 * u }, o), depth3d: Math.round(36 * u * 100) / 100 };
}

/**
 * A modern compact car: alloy wheels with brake discs and calipers, LED headlight strip, tail lamps, indicators front,
 * rear and on the mirror, a driver behind tinted glass. Drive, brake, sudden brake, reverse, turn away or toward the
 * camera, open the window and wave, flash the headlights, indicate and hazards. Length = `size`.
 */
export function modernCarRig(o: RigPresetOptions = {}): RigSpec {
  const size = o.size ?? 440, u = size / 100, rig = new Rig(u), m = o.motion ?? "drive", R = 8.6;
  const palette: Partial<Record<RigRole, string>> = {
    paint: "#2f5f8f", "paint-dark": "#1f4266", metal: "#c9ced3", "metal-dark": "#2a2d33", rubber: "#17181b", glass: "#9db7c6", light: "#f6f1df",
    accent: "#8e1b1b", skin: "#c98d6a", hair: "#2b211c", cloth: "#d9d4c6", detail: "#16202b", smoke: "#d6d2c8",
  };
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, -R - 1);
  // Full silhouette behind everything: roof, pillars, hood, hatch; wheel arches cut out of the sill line.
  rig.part("shell", "body", path("M48.5 4.2L50.6 2.4Q51.6 -.4 51.2 -4.8L49.4 -7.4Q44 -9.4 30 -11.2L22.5 -12L8.6 -22.4Q6.6 -23.9 3 -24L-12 -24.4Q-22 -24.2 -30 -22.6L-35.4 -20.6L-44.6 -12.4Q-46.8 -10.2 -47.4 -6L-47.6 -1L-46.4 3.6L-41.52 4.2A11 11 0 0 1 -20.48 4.2L20.48 4.2A11 11 0 0 1 41.52 4.2Z"), "paint", 4, { extrude: true });
  rig.part("well-r", "body", ell(-31, 1, 10.4, 10.4), "metal-dark", 3.9);
  rig.part("well-f", "body", ell(31, 1, 10.4, 10.4), "metal-dark", 3.9);
  rig.part("cabin", "body", poly([[21, -12.8], [8.4, -21.8], [3.6, -23.2], [-12, -23.6], [-24, -23], [-38.4, -14.8]]), "detail", 4.1, { extrude: true });
  // Driver and headrest behind the glass.
  rig.part("headrest", "body", rect(-6.6, -21.2, 3.4, 5.6, 1.2), "metal-dark", 4.15);
  rig.bone("driver", "body", 1.4, -12.6);
  rig.part("driver-body", "driver", poly([[-4.6, 0], [-4.2, -4.2], [-1.6, -5.8], [2.6, -5.6], [4.6, -3], [4.6, 0]]), "cloth", 4.18);
  rig.bone("driver-head", "driver", .6, -7.4);
  rig.part("driver-head", "driver-head", ell(0, 0, 3.1, 3.5), "skin", 4.2);
  rig.part("driver-hair", "driver-head", path("M-3.2 .4Q-3.6 -4 0 -4Q3.4 -4.2 3.4 -1.6L1.2 -2.2Q-1 -1.2 -1.8 .8Z"), "hair", 4.21);
  rig.part("wheel-rim", "body", path("M10.4 -16.4L12.8 -12.6L12 -12.2L9.6 -16Z"), "metal-dark", 4.19);
  // Driver's arm, shown only when it rests on the open window sill to wave.
  rig.bone("driver-arm", "driver", 4.6, -.6, 168, 6.4);
  rig.bone("driver-hand", "driver-arm", 0, 6.4, -10);
  rig.part("driver-arm", "driver-arm", cap(6.6, 2.6, 2.2), "cloth", 4.7);
  rig.part("driver-hand", "driver-hand", ell(0, 1, 1.6, 1.9), "skin", 4.71);
  // Glass: the front door pane slides down behind the door skin; the others are fixed.
  rig.bone("glass-f", "body", 0, 0);
  rig.part("glass-f", "glass-f", poly([[19.6, -13.3], [8.2, -21.5], [4, -22.6], [-3, -22.9], [-3, -13.6]]), "glass", 4.3);
  rig.part("glass-r", "body", poly([[-5, -13.7], [-5, -22.95], [-14, -23.1], [-21.5, -22.5], [-23.5, -14]]), "glass", 4.3);
  rig.part("glass-q", "body", poly([[-25.4, -14.1], [-23.6, -22.1], [-29.6, -21.4], [-37.4, -15.1]]), "glass", 4.3);
  rig.part("glass-sheen", "body", poly([[14, -14], [9.4, -17.6], [-14, -18.6], [-16, -16.4]]), "light", 4.31, { color: "#c4d6df" });
  rig.part("b-pillar", "body", rect(-5, -23.2, 2, 9.8, .4), "rubber", 4.42);
  // Roof rail over the cabin: keeps heads and headrests inside the glasshouse.
  rig.part("roof-rail", "body", path("M8.6 -22.4Q6.6 -23.9 3 -24L-12 -24.4Q-22 -24.2 -30 -22.6L-35.4 -20.6L-37.4 -15.1L-29.6 -21.4Q-21 -23.1 -12 -23.3L3 -22.9Q5.8 -22.7 8.2 -21.5Z"), "paint", 4.44);
  // Door skin below the beltline, in front of the lowered glass.
  rig.part("lower", "body", path("M48.5 4.2L50.6 2.4Q51.6 -.4 51.2 -4.8L49.4 -7.4Q44 -9.4 30 -11.2L22.5 -12L21 -13.1L-3 -13.6L-38.4 -14.9L-44.6 -12.4Q-46.8 -10.2 -47.4 -6L-47.6 -1L-46.4 3.6L-41.52 4.2A11 11 0 0 1 -20.48 4.2L20.48 4.2A11 11 0 0 1 41.52 4.2Z"), "paint", 4.6);
  rig.part("lower-shade", "body", path("M-46.4 3.6L-41.52 4.2A11 11 0 0 1 -20.48 4.2L20.48 4.2A11 11 0 0 1 41.52 4.2L48.5 4.2L50.6 2.4L50.9 -1.4L42 -2.2A11.6 11.6 0 0 0 20 -2.2L-20 -2.6A11.6 11.6 0 0 0 -42 -2.4L-47.5 -2.2Z"), "paint-dark", 4.61);
  rig.part("belt-trim", "body", path("M21 -13.1L-3 -13.6L-38.4 -14.9"), "metal", 4.62, { line: true, lineWidth: .5 });
  rig.part("roof-trim", "body", path("M19.6 -13.3L8.2 -21.5Q5.8 -22.7 3 -22.9L-12 -23.3Q-21 -23.1 -29.6 -21.4L-37.4 -15.1"), "metal", 4.43, { line: true, lineWidth: .45 });
  rig.part("crease", "body", path("M47 -5.2Q12 -7.4 -46.2 -7.6"), "paint-dark", 4.63, { line: true, lineWidth: .45 });
  rig.part("seams", "body", path("M20.9 -12.4L20.4 3.6M-4 -13.5L-4.2 3.6M-24.4 -14.2Q-23.8 -8 -20.6 -4.4"), "paint-dark", 4.63, { line: true, lineWidth: .35 });
  rig.part("handles", "body", path("M5 -10.6h4.4v1.1h-4.4z M-16.4 -11h4.4v1.1h-4.4z"), "metal", 4.64);
  rig.part("arch-r", "body", path("M-42.6 4.2A12 12 0 0 1 -19.4 4.2L-20.48 4.2A11 11 0 0 0 -41.52 4.2Z"), "rubber", 4.7);
  rig.part("arch-f", "body", path("M19.4 4.2A12 12 0 0 1 42.6 4.2L41.52 4.2A11 11 0 0 0 20.48 4.2Z"), "rubber", 4.7);
  rig.part("skirt", "body", rect(-20.4, 2.4, 40.8, 1.9, .6), "rubber", 4.71);
  rig.part("bumper-f", "body", path("M50.6 2.4L48.5 4.2L41.6 4.2L42.6 1.4L50.9 .8Z"), "rubber", 4.71);
  rig.part("bumper-r", "body", path("M-46.4 3.6L-41.6 4.2L-42.4 1.4L-47.6 .6Z"), "rubber", 4.71);
  rig.part("mirror", "body", poly([[20.6, -13.6], [17.4, -16.8], [14.6, -16.4], [14.8, -13.4]]), "paint", 4.72);
  rig.part("headlamp", "body", poly([[51, -5.2], [49.4, -7.4], [43.8, -8.6], [43.2, -6.6], [48, -4.6]]), "glass", 4.73, { color: "#d6e1e6" });
  rig.part("drl", "body", path("M50.2 -5.4L44.2 -7.4"), "light", 4.74, { line: true, lineWidth: .7, color: "#ffffff" });
  rig.part("taillamp", "body", poly([[-47.2, -8.4], [-44.6, -12.2], [-40.6, -11.6], [-41.4, -8.2]]), "accent", 4.73);
  rig.part("rear-reflector", "body", rect(-47.4, -1.6, 2.4, 1, .3), "accent", 4.74);
  // Lights that switch: beam and flash glow, brake, reverse, indicators front, rear and on the mirror.
  rig.bone("beam", "body", 51, -5.8);
  rig.part("beam", "beam", poly([[0, -1.6], [64, -9], [70, 2], [64, 13], [0, 1.6]]), "light", 9, { color: "#fff6cf" });
  rig.bone("flash", "body", 47.4, -6.2);
  rig.part("flash-glow", "flash", ell(0, 0, 6.4, 3.4), "light", 9.1, { color: "#fffbe6" });
  rig.part("flash-core", "flash", ell(0, 0, 3.2, 1.6), "light", 9.2, { color: "#ffffff" });
  rig.bone("brake", "body", -44, -10);
  rig.part("brake", "brake", poly([[-3.2, 1.6], [-.6, -2.2], [3.4, -1.6], [2.6, 1.8]]), "light", 4.75, { color: "#ff2e24" });
  rig.part("brake-glow", "brake", ell(.4, 0, 2.8, 2.2), "light", 4.74, { color: "#ff7a62" });
  rig.bone("reverse", "body", -46.8, -3.2);
  rig.part("reverse", "reverse", rect(-.8, -1, 2.6, 2, .5), "light", 4.76, { color: "#ffffff" });
  rig.part("reverse-glow", "reverse", ell(-1, 0, 3.4, 2.6), "light", 9, { color: "#fff8e8" });
  const ind: string[] = [];
  for (const [id, x, yy, w, h] of [["ind-f", 47.6, -3.6, 3, 1.2], ["ind-r", -46.2, -6.2, 1.8, 1.6], ["ind-m", 16.4, -14.6, 3, .9]] as const) {
    rig.bone(id, "body", x, yy);
    rig.part(id, id, rect(-w / 2, -h / 2, w, h, .4), "light", 4.77, { color: "#ffb21f" });
    rig.part(id + "-glow", id, ell(0, 0, w * .62 + .5, h * .6 + .5), "light", 4.78, { color: "#ffd27a" });
    ind.push(id);
  }
  // The far side's indicators: they show only on the end corners when the car turns away from the camera.
  const farInd: string[] = [];
  for (const [id, x, yy] of [["ind-f-far", 47.6, -3.6], ["ind-r-far", -46.2, -6.2]] as const) {
    rig.bone(id, "body", x, yy);
    for (const q of rig.parts.filter(q => q.bone === id.replace("-far", ""))) rig.parts.push({ ...q, id: q.id.replace(id.replace("-far", ""), id), bone: id, far3d: "over" });
    farInd.push(id);
  }
  // End faces for turns in depth.
  // Wheels: tyre, brake disc, alloy; calipers ride with the body.
  const wheels: string[] = [];
  for (const [id, x] of [["wheel-r", -31], ["wheel-f", 31]] as const) {
    rig.bone(id, "root", x, -R);
    wheels.push(id);
    rig.part(id + "-tyre", id, ring(R, 6.1), "rubber", 5);
    rig.part(id + "-sidewall", id, ring(7.9, 6.3), "metal-dark", 5.01);
    rig.part(id + "-disc", id, ell(0, 0, 5, 5), "metal", 5.02, { color: "#8d9298" });
    rig.part(id + "-alloy", id, path(alloyPath(6.2, 5)), "metal", 5.1);
    rig.part(id + "-nut", id, ell(0, 0, 1.3, 1.3), "metal-dark", 5.12);
    rig.part(id + "-caliper", "body", path(`M${x - 4.6} -2.4Q${x - 5.6} 1 ${x - 4.2} 4L${x - 2.8} 3.4Q${x - 4} 1 ${x - 3.2} -1.8Z`), "accent", 5.05, { color: "#b8322a" });
    rig.bone(id + "-contact", "root", x, 0);
  }
  rig.drivers.push({ type: "wheel", bones: wheels, radius: R * u },
    { type: "oscillate", bone: "body", property: "y", amplitude: .35 * u, period: 9, wobble: .6, bySpeed: true },
    { type: "oscillate", bone: "body", property: "y", amplitude: .05 * u, period: 3 },
    { type: "oscillate", bone: "driver-head", property: "rotate", amplitude: 3, period: 70, wobble: .5 });
  rig.track("glass-f", [{ frame: 0, opacity: .62 }]);
  rig.part("glass-r-tint", "body", poly([[-5, -13.7], [-5, -22.95], [-14, -23.1], [-21.5, -22.5], [-23.5, -14]]), "detail", 4.29);
  const puffs: string[] = [];
  for (let i = 0; i < 5; i++) { const id = "puff-" + i; rig.bone(id, "root", 0, 0); puffs.push(id); rig.part(id, id, ell(0, 0, 2.4, 2), "smoke", 2); }
  rig.bone("exhaust", "body", -45, 3.4);
  rig.drivers.push({ type: "emitter", puffs, origin: "exhaust", every: 14, life: 34, velocity: [-.1 * u, -.12 * u], growth: 2.2, drift: .4 * u });
  // The beam and flash are lights, but the beam is a translucent cone: its bone carries a lower opacity.
  rig.track("beam", [{ frame: 0, opacity: .38 }]);
  farCopy(rig, ["wheel-r-tyre", "wheel-r-sidewall", "wheel-r-disc", "wheel-r-alloy", "wheel-f-tyre", "wheel-f-sidewall", "wheel-f-disc", "wheel-f-alloy"], "under");
  farCopy(rig, ["headlamp", "drl", "taillamp", "brake", "brake-glow", "reverse"], "over");
  rig.drivers.push(lightsOff(["brake", "reverse", ...ind, ...farInd, "beam", "flash"]));
  const root = carAction(rig, o, m, {
    u, body: "body", wheels, head: "driver-head", brake: ["brake"], reverse: ["reverse"], indicators: ind, farIndicators: farInd, beam: ["beam", "flash"],
    glass: "glass-f", arm: "driver-arm", hand: "driver-hand", smoke: ["wheel-r-contact", "wheel-f-contact"],
  }, size);
  if (m !== "open-window") rig.track("driver-arm", [{ frame: 0, opacity: 0 }]);
  return { ...finish("modern-car", "car", rig, root, palette, { x: -52 * u, y: -40 * u, width: 110 * u, height: 42 * u }, o), depth3d: Math.round(42 * u * 100) / 100 };
}

// ---- Bicycle ---------------------------------------------------------------------------------------------------------------------

export const BICYCLE_MOTIONS = ["ride", "coast", "stop", "sudden-stop"] as const;
/** A city bicycle with a rider: the crank turns by distance through the gearing, pedals stay level, feet ride the
 * pedals and hands hold the bar by IK. Coasting freewheels: the crank stops. Wheelbase = 58% of `size`. */
export function bicycleRig(o: RigPresetOptions = {}): RigSpec {
  const size = o.size ?? 360, u = size / 100, rig = new Rig(u), m = o.motion ?? "ride", start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { paint: "#2b7a78", "paint-dark": "#1d5654", metal: "#c3c7cc", "metal-dark": "#2a2d33", rubber: "#1b1b1d", wood: "#6b4a2c",
    skin: "#c98d6a", hair: "#2b211c", cloth: "#d8573a", "cloth-dark": "#2d3142", shoe: "#1f1b18", eye: "#1d1715", mouth: "#3b1714", detail: "#1d1715", accent: "#e2a62b" };
  const R = 18, G = 2.4;
  rig.bone("root", undefined, 0, 0);
  // The frame pitches about the front tyre's contact patch, so a hard front-brake stop lifts the rear wheel.
  rig.bone("pitch", "root", 29, 0);
  rig.bone("bike", "pitch", -29, 0);
  const wheels: string[] = [];
  for (const [id, x] of [["wheel-r", -29], ["wheel-f", 29]] as const) {
    rig.bone(id, "bike", x, -R);
    wheels.push(id);
    rig.part(id, id, path(wheelPath(R, 24, .1, .012)), "rubber", 1.6);
    rig.part(id + "-rim", id, ring(R * .9, R * .86), "metal", 1.61);
    rig.part(id + "-hub", id, ell(0, 0, 1.6, 1.6), "metal", 1.62);
  }
  const P = { bb: [-4, -16], seat: [-12.6, -43], head: [19.4, -44.6], headLow: [21, -38.4], rear: [-29, -18], front: [29, -18] } as const;
  const frame: [string, readonly number[], readonly number[], number][] = [
    ["chainstay", P.bb, P.rear, 1.6], ["seatstay", P.seat, P.rear, 1.4], ["seattube", P.bb, P.seat, 2.2], ["toptube", P.seat, P.head, 2.2], ["downtube", P.bb, P.headLow, 2.6],
    ["headtube", P.head, P.headLow, 3], ["fork", P.headLow, P.front, 1.8],
  ];
  for (const [id, a, b, w] of frame) rig.part(id, "bike", tube(a[0], a[1], b[0], b[1], w), id === "fork" ? "metal" : "paint", 2);
  rig.part("stem", "bike", tube(19.4, -44.6, 18.4, -50, 1.8), "metal", 2.05);
  rig.part("bar", "bike", path("M18.4 -50.6Q14 -52.6 12.4 -50.4L13 -49.4Q14.6 -51 17.8 -49.4Z"), "metal", 2.05);
  rig.part("grip", "bike", ell(12.6, -50, 1.4, 1), "rubber", 2.06);
  rig.part("seatpost", "bike", tube(-12.6, -43, -13.4, -46, 1.4), "metal", 2.05);
  rig.part("saddle", "bike", path("M-19 -47.4Q-14 -49.4 -7.6 -47.6L-8 -46.4Q-13 -45.8 -18.4 -46Z"), "rubber", 2.06);
  rig.part("mudguard", "bike", path("M-46 -20A18 18 0 0 1 -18 -34L-17.6 -33A17 17 0 0 0 -45 -20Z"), "paint-dark", 1.7);
  rig.part("chain", "bike", path("M-4 -21.6L-29 -22M-4 -10.4L-29 -14"), "metal-dark", 2.3, { line: true, lineWidth: .5 });
  rig.part("lamp", "bike", ell(22.4, -41.2, 1.4, 1.6), "accent", 2.07);
  rig.bone("bar-grip", "bike", 12.8, -50);
  rig.bone("crank", "bike", P.bb[0], P.bb[1]);
  rig.part("chainring", "crank", ring(5.6, 4.4), "metal", 2.4);
  for (const [side, rot, z] of [["n", 0, 2.6], ["f", 180, 1.5]] as const) {
    rig.bone("crank-" + side, "crank", 0, 0, rot, 9.5);
    rig.part("crank-" + side, "crank-" + side, cap(9.5, 2, 1.6), "metal", z, { far: side === "f" });
    rig.bone("pedal-" + side, "crank-" + side, 0, 9.5);
    rig.part("pedal-" + side, "pedal-" + side, rect(-3, -.8, 6, 1.6, .5), "metal-dark", z + .05, { far: side === "f" });
  }
  const crankRadius = R * G * u, stopping = m === "stop" || m === "sudden-stop", hard = m === "sudden-stop", t = at(start, end), D = end - start;
  // Stops: cruise, then brake at a constant rate to rest; the rider stops pedalling as soon as the brakes go on.
  const tb = t(hard ? .3 : .22), ts = tb + Math.round(D * (hard ? .1 : .42));
  const from = o.from ?? 0, to = o.to ?? from + 900, v = (to - from) / ((tb - start) + (ts - tb) / 2), decel = Math.max(.01, Math.abs(v) / (ts - tb));
  const freewheel = m === "coast" ? [{ start: start - 1000, end: end + 1000 }] : stopping ? [{ start: tb, end: end + 1000 }] : undefined;
  rig.drivers.push({ type: "wheel", bones: wheels, radius: R * u },
    { type: "wheel", bones: ["crank"], radius: crankRadius, lock: freewheel },
    { type: "wheel", bones: ["pedal-n", "pedal-f"], radius: -crankRadius, lock: freewheel });
  if (stopping) {
    // Front brake: the frame pitches forward about the front contact (a hard stop lifts the rear wheel, never sinks it);
    // the rider is thrown forward and settles back.
    rig.drivers.push({ type: "suspension", bone: "pitch", pitch: (hard ? 7.5 : .8) / decel, period: 26, damping: .42, range: [0, hard ? 10 : 1.2] },
      { type: "suspension", bone: "torso", pitch: (hard ? 14 : 5) / decel, period: 18, damping: .3, range: [-6, 18] });
  }
  // Rider: hips on the saddle, chest leaning to the bar.
  addPersonBody(rig, "bike", -12.6, -47.2);
  rig.track("torso", stopping ? [{ frame: start, rotate: 32 }, { frame: ts + 6, rotate: 32 }, { frame: ts + 26, rotate: 20, ease: "ease-in-out-cubic" }] : [{ frame: start, rotate: 32 }]);
  rig.track("head", stopping ? [{ frame: start, rotate: -26 }, { frame: ts + 6, rotate: -26 }, { frame: ts + 26, rotate: -16, ease: "ease-in-out-cubic" }] : [{ frame: start, rotate: -26 }]);
  for (const [side, pedal] of [["f", "pedal-n"], ["b", "pedal-f"]] as const) {
    rig.drivers.push({ type: "reach", upper: "thigh-" + side, lower: "shin-" + side, tip: "foot-" + side, tipAngle: 8, bend: 1, follow: pedal, offset: [-2.2 * u, -2.8 * u] });
    rig.drivers.push({ type: "reach", upper: "arm-" + side, lower: "fore-" + side, bend: -1, follow: "bar-grip", offset: [(side === "f" ? .4 : 1.4) * u, (side === "f" ? 0 : -.6) * u] });
  }
  // At rest the rider takes the near foot off the pedal and puts it down on the ground beside the bike.
  if (stopping) rig.drivers.push({ type: "reach", start: ts - 2, ramp: 12, upper: "thigh-f", lower: "shin-f", tip: "foot-f", tipAngle: 0, bend: 1,
    target: [{ frame: ts - 2, x: 4 * u, y: -12 * u }, { frame: ts + 10, x: 7 * u, y: -2.4 * u, ease: "ease-in-out-cubic" }] });
  rig.drivers.push({ type: "oscillate", bone: "torso", property: "rotate", amplitude: m === "coast" ? .3 : 1.1, period: 21 },
    { type: "oscillate", bone: "head", property: "rotate", amplitude: 1.4, period: 90, wobble: .5 },
    { type: "variant", part: "eye", name: "shut", mode: "blink", interval: [64, 130], duration: 4 });
  const y = o.y ?? 0;
  const root = stopping ? [{ frame: start, x: from, y }, { frame: tb, x: from + v * (tb - start), y, ease: "linear" as const }, { frame: ts, x: to, y, ease: "ease-out-quad" as const }]
    : travel(o, start, end, m === "coast" ? "ease-out-quad" : "linear");
  return finish("bicycle", "bicycle", rig, root, palette, { x: -50 * u, y: -100 * u, width: 100 * u, height: 102 * u }, o);
}
export const bicyclePace = (motion: string, size: number) => motion === "stop" || motion === "sudden-stop" ? 0 : size * (motion === "coast" ? .03 : .036);

// ---- Steam locomotive ------------------------------------------------------------------------------------------------------------

/** A steam locomotive: drivers roll by distance, coupling and main rods ride the crank pins, the crosshead slides,
 * smoke puffs are left behind as it moves. Length = `size`. */
export function locomotiveRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 600) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { paint: "#24384f", "paint-dark": "#182638", metal: "#2a2a2e", "metal-dark": "#141416", brass: "#c9a24f", accent: "#c8342b", glass: "#f2d98a", smoke: "#e9e4d8", light: "#f2d98a", wood: "#6b4a2c" };
  const R = 8.5;
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, -R);
  rig.part("frame", "body", rect(-44, -2, 92, 4.6), "metal-dark", 3);
  rig.part("boiler", "body", rect(-18, -26, 54, 20, 9), "paint", 4);
  rig.part("bands", "body", path("M-6 -26h1.6v20h-1.6z M8 -26h1.6v20h-1.6z M22 -26h1.6v20h-1.6z"), "brass", 4.1);
  rig.part("smokebox", "body", rect(32, -27, 12, 22, 4), "metal", 4.2);
  rig.part("chimney", "body", poly([[36, -27], [42, -27], [43.5, -40], [34.5, -40]]), "metal", 4.3);
  rig.part("chimney-cap", "body", rect(33.5, -42, 11, 3, 1), "metal-dark", 4.4);
  rig.part("dome", "body", path("M8 -26C8 -33 18 -33 18 -26Z"), "brass", 4.3);
  rig.part("cab", "body", rect(-40, -38, 24, 34, 2), "paint-dark", 4.5);
  rig.part("cab-roof", "body", rect(-42, -40.5, 28, 4, 1.5), "metal-dark", 4.6);
  rig.part("cab-window", "body", rect(-35, -33, 12, 10, 2), "glass", 4.7);
  rig.part("stripe", "body", rect(-40, -9, 84, 2.2), "accent", 4.8);
  rig.part("cowcatcher", "body", poly([[44, -2], [52, 6.5], [44, 6.5]]), "accent", 4.9);
  rig.part("headlamp", "body", ell(46, -22, 2.6, 3), "light", 4.9);
  rig.part("cylinder", "body", rect(26, -3, 16, 9, 2.5), "metal", 5.5);
  const drivers = [-26, -6, 14], wheels: string[] = [];
  drivers.forEach((x, i) => {
    rig.bone("drv-" + i, "body", x, 0);
    wheels.push("drv-" + i);
    rig.part("drv-" + i, "drv-" + i, path(wheelPath(R, 12)), "accent", 5);
    rig.part("cw-" + i, "drv-" + i, path("M-5 -5A7 7 0 0 1 5 -5L3 -2.6A4 4 0 0 0 -3 -2.6Z"), "metal", 5.1);
  });
  for (const [i, x] of [[0, 30], [1, 40]] as const) {
    rig.bone("lead-" + i, "body", x, R - 5);
    wheels.push("lead-" + i);
    rig.part("lead-" + i, "lead-" + i, path(wheelPath(5, 8)), "accent", 5);
  }
  rig.bone("coupling", "body", 0, 0, -90, 40);
  rig.part("coupling", "coupling", path("M-1.4 0L1.4 0L1.4 40L-1.4 40Z M-2.4 -2.4h4.8v4.8h-4.8z M-2.4 17.6h4.8v4.8h-4.8z M-2.4 37.6h4.8v4.8h-4.8z"), "metal", 6);
  rig.bone("mainrod", "body", 0, 0, -90, 30);
  rig.part("mainrod", "mainrod", cap(30, 3.2, 2.6), "metal", 6.2);
  rig.bone("crosshead", "body", 30, 0);
  rig.part("crosshead", "crosshead", rect(-3, -2.6, 6, 5.2, 1), "brass", 6.1);
  rig.part("piston", "crosshead", rect(0, -1, 14, 2), "metal-dark", 5.4);
  rig.drivers.push(
    { type: "wheel", bones: wheels.slice(0, 3), radius: R * u },
    { type: "wheel", bones: wheels.slice(3), radius: 5 * u },
    { type: "crank", wheel: "drv-0", rod: "coupling", radius: 5 * u, mode: "coupling" },
    { type: "crank", wheel: "drv-1", rod: "mainrod", radius: 5 * u, mode: "slide", length: 30 * u, slideY: -R * u + 1.5 * u, slider: "crosshead" },
    { type: "oscillate", bone: "body", property: "y", amplitude: .5 * u, period: 9, bySpeed: true, wobble: .4 },
  );
  const puffs: string[] = [];
  for (let i = 0; i < 10; i++) { const id = "puff-" + i; rig.bone(id, "root", 0, 0); puffs.push(id); rig.part(id, id, ell(0, 0, 5, 4.4), "smoke", 9); }
  rig.bone("stack", "body", 39, -42);
  rig.drivers.push({ type: "emitter", puffs, origin: "stack", every: 6, life: 58, velocity: [.15 * u, -.42 * u], growth: 2.6, drift: 1.4 * u });
  return finish("locomotive", "locomotive", rig, travel(o, start, end, "ease-in-out-quad"), palette, { x: -46 * u, y: -60 * u, width: 100 * u, height: 62 * u }, o);
}

// ---- Aircraft --------------------------------------------------------------------------------------------------------------------

/** A propeller plane: the prop spins inside a motion-blur disc, the pilot's scarf ripples, the plane banks with its climb. */
export function planeRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 380) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { paint: "#e2a62b", "paint-dark": "#b07c16", metal: "#3a3a3e", "metal-dark": "#1d1d20", glass: "#bfd8e0", skin: "#d39b76", cloth: "#c8342b", rubber: "#1d1b1b", accent: "#24384f", detail: "#1d1715" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, 0);
  rig.part("wing-far", "body", path("M-8 -2L30 -6C34 -6 34 -2 30 -1L-8 2Z"), "paint-dark", 2, { far: true });
  rig.part("fuselage", "body", path("M-50 -6C-40 -8 -20 -12 0 -12L30 -12C38 -12 44 -8 46 -2C44 4 38 7 30 7L0 7C-20 7 -40 3 -50 0Z"), "paint", 4);
  rig.part("tail-fin", "body", path("M-50 -6L-56 -22C-56 -24 -53 -25 -51 -23L-38 -8Z"), "paint", 3.9);
  rig.part("stabilizer", "body", path("M-52 -2L-34 -3L-36 1L-52 1Z"), "paint-dark", 4.1);
  rig.part("stripe", "body", path("M-30 -4L34 -6L36 -2L-30 0Z"), "accent", 4.2);
  rig.part("cowling", "body", path("M38 -11C44 -10 48 -6 48 -2C48 2 44 6 38 7Z"), "metal", 4.3);
  rig.part("wing", "body", path("M-10 2L34 -2C38 -2 38 3 34 4L-10 6Z"), "paint", 5);
  rig.part("cockpit", "body", path("M2 -12C4 -18 12 -20 18 -12Z"), "glass", 3.8);
  rig.bone("pilot", "body", 8, -14);
  rig.part("pilot-head", "pilot", ell(0, 0, 5.2, 5.6), "skin", 3.7);
  rig.part("goggles", "pilot", rect(-1, -2.6, 6.4, 2.6, 1.2), "metal-dark", 3.75);
  const scarf: string[] = [];
  for (let i = 0; i < 4; i++) { const id = "scarf-" + i; rig.bone(id, i ? "scarf-" + (i - 1) : "pilot", i ? 0 : -3, i ? 5 : 4, i ? 4 : 96, 5); scarf.push(id); rig.part(id, id, cap(6, 3.4 - i * .4, 3 - i * .4), "cloth", 3.6); }
  rig.bone("prop", "body", 49, -2);
  rig.part("prop-blur", "prop", ell(0, 0, 2.4, 19), "glass", 6, { color: "#e9e4d8" });
  rig.bone("blade", "prop", 0, 0, 90);
  rig.part("blade-a", "blade", ell(-9.5, 0, 9.5, 1.6), "metal-dark", 6.1);
  rig.part("blade-b", "blade", ell(9.5, 0, 9.5, 1.6), "metal-dark", 6.1);
  rig.part("spinner", "prop", ell(1.4, 0, 3, 3), "accent", 6.2);
  rig.bone("gear", "body", 18, 7);
  rig.part("strut", "gear", rect(-1, 0, 2, 12), "metal", 3.5);
  rig.bone("tyre", "gear", 0, 13);
  rig.part("tyre", "tyre", path(wheelPath(4.6, 6, .3)), "rubber", 3.6);
  // The prop turns in a plane facing the camera's side: edge-on, so each blade's length follows cos(angle).
  rig.drivers.push({ type: "spin", bone: "blade", speed: 47, project: true },
    { type: "chain", bones: scarf, amplitude: 12, period: 10, lag: .9, growth: 1.4, bias: -6 },
    { type: "oscillate", bone: "body", property: "rotate", amplitude: 1.4, period: 70, wobble: .6 }, { type: "bank", amount: .9, max: 22 },
    { type: "oscillate", bone: "pilot", property: "rotate", amplitude: 3, period: 50, wobble: .5 });
  const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from + 1000;
  return finish("plane", "plane", rig, [{ frame: start, x: from, y }, { frame: Math.round(start + (end - start) * .45), x: from + (to - from) * .45, y: y - 30 * u, ease: "ease-in-out-quad" }, { frame: end, x: to, y: y + 4 * u, ease: "ease-in-out-quad" }],
    palette, { x: -58 * u, y: -64 * u, width: 110 * u, height: 66 * u }, o);
}

export const HELICOPTER_MOTIONS = ["hover", "takeoff", "fly", "land"] as const;
/** A light helicopter: the main rotor is seen edge-on (blades sweep as cos(angle) inside a blur disc), the tail rotor
 * turns face-on, the cabin swings on its rotor, noses down to fly forward and flares to stop. Length = `size`. */
export function helicopterRig(o: RigPresetOptions = {}): RigSpec {
  const size = o.size ?? 420, u = size / 100, rig = new Rig(u), m = o.motion ?? "hover", start = o.start ?? 0, end = o.end ?? 180, t = at(start, end);
  const palette: Partial<Record<RigRole, string>> = { paint: "#d8473a", "paint-dark": "#9b2f26", metal: "#a9afb6", "metal-dark": "#2a2d33", glass: "#a9c6d4", rubber: "#1b1b1d", skin: "#c98d6a", detail: "#16202b", light: "#f6f1df" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, -17);
  rig.part("boom", "body", path("M-8 -8L-52 -6L-54 -2L-8 2Z"), "paint", 3.8);
  rig.part("fin", "body", path("M-48 -6L-56 -20L-53 -21L-44 -6Z"), "paint", 3.7);
  rig.part("stab", "body", path("M-46 -2L-38 -2.4L-38 -.6L-46 0Z"), "paint-dark", 3.9);
  rig.part("cabin", "body", path("M-12 -10Q-12 -22 4 -24L12 -24Q26 -22 30 -8Q31 2 22 5L-6 5Q-14 3 -12 -10Z"), "paint", 4);
  rig.part("canopy", "body", path("M8 -22.4Q22 -21 27.4 -9L27.6 -4L14 -4L10 -14Z"), "glass", 4.1);
  rig.part("door-glass", "body", path("M-4 -18L7 -21L10 -13L12 -4L-2 -4Z"), "glass", 4.1);
  rig.part("pilot", "body", ell(10, -12, 3.2, 3.6), "skin", 4.05);
  rig.part("pilot-helmet", "body", path("M6.6 -13Q7 -17 10.4 -17Q13.6 -16.6 13.4 -13.4Z"), "metal-dark", 4.06);
  rig.part("belly-stripe", "body", path("M-12 -2L29 -2.6L28 1.4L-10 2.6Z"), "paint-dark", 4.2);
  rig.part("engine", "body", path("M-10 -24L8 -26L10 -22L-10 -20Z"), "metal-dark", 3.95);
  rig.part("skid-struts", "body", path("M-6 4L-8 13L-6.6 13L-4.6 4Z M16 4L18 13L19.4 13L17.4 4Z"), "metal-dark", 3.6);
  rig.part("skid", "body", path("M-16 13L24 13Q28 13 29 10.6L30 11.4Q29 15 24 15L-16 15Z"), "metal-dark", 3.65);
  rig.part("beacon", "body", ell(-6, -24.6, 1.2, 1), "accent", 4.3, { color: "#ff3d2e" });
  rig.bone("mast", "body", 2, -26);
  rig.part("mast", "mast", rect(-1, -4, 2, 4), "metal-dark", 4.4);
  // Rotor spin: spun up on take-off, wound down after landing (the blur discs fade with the speed).
  const land = m === "land", spinOff = land ? { end: t(.95), spinDown: t(.95) - t(.64) } : {};
  rig.bone("rotor-blur", "mast", 0, -4);
  rig.part("rotor-blur", "rotor-blur", ell(0, 0, 50, 1.6), "glass", 4.45, { color: "#d9d6cf" });
  for (const [id, ph] of [["blade-a", 0], ["blade-b", 90]] as const) {
    rig.bone(id, "mast", 0, -4.2);
    rig.part(id, id, rect(-50, -.7, 100, 1.4, .7), "metal-dark", 4.5);
    rig.drivers.push({ type: "spin", bone: id, speed: 31, spinUp: m === "takeoff" ? 60 : 0, start: m === "takeoff" ? start : undefined, project: true, phase: ph, ...spinOff });
  }
  rig.part("hub", "mast", ell(0, -4.2, 2, 1.4), "metal", 4.55);
  rig.bone("tail-rotor", "body", -53, -6);
  rig.bone("tail-blur", "body", -53, -6);
  rig.part("tail-blur", "tail-blur", ell(0, 0, 7.4, 7.4), "glass", 4.6, { color: "#d9d6cf" });
  rig.part("tail-blades", "tail-rotor", path("M-7.4 -.6h14.8v1.2h-14.8z M-.6 -7.4h1.2v14.8h-1.2z"), "metal-dark", 4.65);
  rig.drivers.push({ type: "spin", bone: "tail-rotor", speed: 53, spinUp: m === "takeoff" ? 60 : 0, start: m === "takeoff" ? start : undefined, ...spinOff });
  for (const b of ["rotor-blur", "tail-blur"]) {
    if (m === "takeoff") rig.track(b, [{ frame: start, opacity: 0 }, { frame: start + 50, opacity: 1, ease: "ease-in-quad" }]);
    if (land) rig.track(b, [{ frame: t(.64), opacity: 1 }, { frame: t(.86), opacity: 0, ease: "ease-out-quad" }]);
  }
  const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from + 1400;
  let root;
  if (m === "takeoff") {
    // Rotor spins up on the skids, the cabin lightens and lifts, hovers, then climbs away.
    rig.drivers.push({ type: "oscillate", start: t(.3), bone: "body", property: "y", amplitude: 1.2 * u, period: 54, wobble: .4, ramp: 30 });
    root = [{ frame: start, x: from, y, facing: o.facing ?? 1 as const }, { frame: t(.3), x: from, y }, { frame: t(.6), x: from, y: y - 40 * u, ease: "ease-in-out-cubic" as const }, { frame: end, x: from + 30 * u, y: y - 80 * u, ease: "ease-in-quad" as const }];
    rig.track("body", [{ frame: t(.28), rotate: 0 }, { frame: t(.36), rotate: -2 }, { frame: t(.6), rotate: 1 }, { frame: end, rotate: 4 }]);
  } else if (land) {
    // Hover high, descend with a slight drift, flare nose-up to kill the sink, settle on the skids, wind the rotor down.
    rig.drivers.push({ type: "oscillate", end: t(.4), bone: "body", property: "y", amplitude: 1.4 * u, period: 60, wobble: .4, ramp: 20 });
    root = [{ frame: start, x: from, y: y - 70 * u, facing: o.facing ?? 1 as const }, { frame: t(.12), x: from, y: y - 70 * u },
      { frame: t(.56), x: from + 26 * u, y, ease: "ease-in-out-cubic" as const }];
    rig.track("body", [{ frame: t(.3), rotate: 0, y: 0 }, { frame: t(.46), rotate: -5, ease: "ease-in-out-cubic" }, { frame: t(.56), rotate: 0, y: 0 },
      { frame: t(.59), y: 1.4 * u, ease: "ease-out-quad" }, { frame: t(.66), y: 0, ease: "ease-in-out-cubic" }]);
  } else if (m === "fly") {
    rig.drivers.push({ type: "bank", amount: 0, lean: 9 / Math.max(1, (to - from) / Math.max(1, end - start)), max: 14 }, { type: "oscillate", bone: "body", property: "y", amplitude: 1 * u, period: 60, wobble: .4 });
    root = [{ frame: start, x: from, y }, { frame: end, x: to, y: y - 10 * u, ease: "ease-in-out-quad" as const }];
  } else {
    rig.drivers.push({ type: "oscillate", bone: "body", property: "y", amplitude: 1.6 * u, period: 64, wobble: .4 }, { type: "oscillate", bone: "body", property: "rotate", amplitude: 1.4, period: 90, wobble: .5 });
    root = [{ frame: start, x: from, y, facing: o.facing ?? 1 as const }];
  }
  return finish("helicopter", "helicopter", rig, root, palette, { x: -58 * u, y: -50 * u, width: 112 * u, height: 52 * u }, o);
}

export const BALLOON_MOTIONS = ["float", "burn"] as const;
/** A hot-air balloon: striped gores on a teardrop envelope, a wicker basket swinging on its ropes, the burner roaring
 * in bursts (flame, glow, a little lift). Height = `size`. */
export function balloonRig(o: RigPresetOptions = {}): RigSpec {
  const size = o.size ?? 420, u = size / 100, rig = new Rig(u), m = o.motion ?? "float", start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { paint: "#d8473a", accent: "#f0c23b", "paint-dark": "#2f5f8f", wood: "#9a6a3a", rope: "#4a3a2a", skin: "#c98d6a", hair: "#2b211c", light: "#ffd36b", smoke: "#ffb03a", metal: "#5a5d63", cloth: "#2f5f8f" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("envelope", "root", 0, -62);
  // Envelope gores: meridians of a teardrop seen from the side.
  const N = 7, prof = (s: number) => s < .55 ? 30 * Math.sqrt(1 - ((.55 - s) / .55) ** 2) : 30 + (7 - 30) * ((s - .55) / .45) ** 1.25;
  const pt = (s: number, th: number) => [Math.sin(th) * prof(s), -36 + 70 * s] as const;
  for (let k = 0; k < N; k++) {
    const a = -Math.PI / 2 + Math.PI * k / N, b = -Math.PI / 2 + Math.PI * (k + 1) / N, pts: (readonly [number, number])[] = [];
    for (let i = 0; i <= 20; i++) pts.push(pt(i / 20, a));
    for (let i = 20; i >= 0; i--) pts.push(pt(i / 20, b));
    rig.part("gore-" + k, "envelope", poly(pts), k % 3 === 0 ? "paint" : k % 3 === 1 ? "accent" : "paint-dark", 4 + k * .001);
  }
  rig.part("crown", "envelope", ell(0, -35.4, 6, 1.6), "paint-dark", 4.1);
  rig.part("skirt", "envelope", path("M-7 34L7 34L6 40L-6 40Z"), "paint-dark", 4.1);
  rig.bone("basket", "envelope", 0, 40, 0, 20);
  rig.part("ropes", "basket", path("M-6 0L-7.4 16M6 0L7.4 16M-2 0L-2.4 16M2 0L2.4 16"), "rope", 3.9, { line: true, lineWidth: .4 });
  rig.part("burner", "basket", rect(-3, 2, 6, 3, .8), "metal", 3.95);
  rig.part("basket", "basket", path("M-8.6 16L8.6 16L7.6 27L-7.6 27Z"), "wood", 4.2);
  rig.part("weave", "basket", path("M-8.2 19.6L8.2 19.6M-7.9 23.2L7.9 23.2M-4 16L-3.6 27M0 16L0 27M4 16L3.6 27"), "rope", 4.25, { line: true, lineWidth: .35 });
  rig.part("rim", "basket", rect(-9.2, 15, 18.4, 2, .8), "wood", 4.3, { color: "#7a5230" });
  rig.part("pilot", "basket", ell(-3.2, 12.4, 2.6, 2.9), "skin", 4.15);
  rig.part("pilot-hat", "basket", path("M-6 11.4Q-5.6 8.4 -3.2 8.4Q-.6 8.4 -.4 11.2Z"), "cloth", 4.16);
  rig.part("rider", "basket", ell(3.6, 12.8, 2.5, 2.8), "skin", 4.15);
  rig.part("rider-hair", "basket", path("M1.2 12Q1.2 9.2 3.6 9.2Q6 9.2 6.1 11.8L4 11Z"), "hair", 4.16);
  rig.part("sandbags", "basket", path("M-9 19a1.6 2 0 1 0 0.1 0Z M9 19a1.6 2 0 1 0 0.1 0Z"), "cloth", 4.31, { color: "#c9b48a" });
  // Burner: glow and flame tongues in bursts.
  rig.bone("flame", "basket", 0, 1.6);
  rig.part("flame-glow", "flame", ell(0, -4, 5, 7), "light", 3.98, { color: "#ffe9a8" });
  rig.part("flame", "flame", path("M-2.2 0Q-3 -5 0 -10Q3 -5 2.2 0Z"), "light", 3.99, { color: "#ff9a2e" });
  // Burner bursts at fractions of the window, so any window length gets the same rhythm.
  const tb = at(start, end), burns = m === "burn" ? [[tb(.04), tb(.3)], [tb(.46), tb(.96)]] : [[tb(.12), tb(.26)], [tb(.58), tb(.7)]];
  for (const [a, b] of burns) if (b > a) rig.drivers.push({ type: "flash", bones: ["flame"], start: a, end: Math.min(b, end), ramp: 0, period: 4, duty: .8, fade: 1.4 });
  rig.drivers.push({ type: "oscillate", bone: "flame", property: "scaleY", amplitude: .18, period: 5, wobble: .6 },
    { type: "pendulum", bone: "basket", amplitude: 2.2, period: 76 }, { type: "oscillate", bone: "envelope", property: "rotate", amplitude: .8, period: 76, phase: .5 },
    { type: "oscillate", bone: "envelope", property: "scaleX", amplitude: .008, period: 46 });
  const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from + 300;
  // Rise a little after each burn, sink slowly between.
  const lift = (f: number) => burns.reduce((s, [a, b]) => s + (f <= a ? 0 : Math.min(1, (f - a) / (b - a + 40)) ** 1.6) * 16 * u, 0);
  const keys = sampledPath(start, end, 6, f => { const k = (f - start) / Math.max(1, end - start); return { x: from + (to - from) * k, y: y + 6 * u * k - lift(f) }; });
  return finish("balloon", "balloon", rig, keys, palette, { x: -32 * u, y: -100 * u, width: 64 * u, height: 102 * u }, o);
}

// ---- Ship and clock --------------------------------------------------------------------------------------------------------------

/** A three-masted sailing ship: the hull rolls and heaves on the swell, sails breathe, pennants ripple. Length = `size`. */
export function shipRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 600) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { wood: "#7a4a2c", "paint-dark": "#3a2416", paint: "#24384f", sail: "#efe6d2", rope: "#3a2416", accent: "#c8342b", brass: "#c9a24f", glass: "#f2d98a", metal: "#2a2a2e" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("hull", "root", 0, -4);
  rig.part("hull", "hull", path("M-50 -10L46 -10C50 -10 52 -14 54 -18L56 -18C54 -6 46 6 34 8L-38 8C-46 6 -50 0 -52 -8Z"), "wood", 4);
  rig.part("wale", "hull", path("M-51 -6L52 -6L50 -3L-50 -3Z"), "paint-dark", 4.1);
  rig.part("stripe", "hull", path("M-48 -1L48 -1L45 2L-45 2Z"), "paint", 4.15);
  rig.part("ports", "hull", path("M-36 -1h4v2.4h-4z M-20 -1h4v2.4h-4z M-4 -1h4v2.4h-4z M12 -1h4v2.4h-4z M28 -1h4v2.4h-4z"), "brass", 4.2);
  rig.part("stern", "hull", path("M-52 -10L-52 -22L-40 -22L-38 -10Z"), "wood", 3.9);
  rig.part("stern-window", "hull", rect(-49, -19, 7, 5, 1), "glass", 4);
  rig.part("bowsprit", "hull", path("M50 -16L74 -26L74 -24L51 -13Z"), "wood", 3.8);
  const masts: [string, number, number][] = [["fore", 28, 62], ["main", 0, 78], ["mizzen", -30, 56]];
  for (const [id, x, h] of masts) {
    rig.bone("mast-" + id, "hull", x, -10, 180, h);
    rig.part("mast-" + id, "mast-" + id, cap(h, 2.6, 1.8), "wood", 2);
    for (const [k, atH, w] of [[0, .28, 30], [1, .62, 24]] as const) {
      const sail = `sail-${id}-${k}`;
      rig.bone(sail, "mast-" + id, 0, h * atH, 180);
      rig.part(sail, sail, path(`M${-w / 2} 0L${w / 2} 0C${w / 2 + 3} ${h * .14} ${w / 2 + 2} ${h * .22} ${w / 2 - 1} ${h * .3}L${-w / 2 + 1} ${h * .3}C${-w / 2 + 2} ${h * .22} ${-w / 2 - 3} ${h * .14} ${-w / 2} 0Z`), "sail", 5 + k * .1);
      rig.part(sail + "-yard", sail, rect(-w / 2 - 2, -1, w + 4, 2, .8), "wood", 5.2 + k * .1);
      rig.drivers.push({ type: "oscillate", bone: sail, property: "scaleX", amplitude: .05, period: 52, phase: k * .2 + x * .01, wobble: .5 });
    }
    const flag: string[] = [];
    for (let i = 0; i < 3; i++) { const fid = `flag-${id}-${i}`; rig.bone(fid, i ? `flag-${id}-${i - 1}` : "mast-" + id, 0, i ? 4 : h, i ? 0 : -90, 4); flag.push(fid); rig.part(fid, fid, poly([[-1.6 + i * .3, 0], [1.6 - i * .3, 0], [1.3 - i * .3, 4.4], [-1.3 + i * .3, 4.4]]), "accent", 5.5); }
    rig.drivers.push({ type: "chain", bones: flag, amplitude: 14, period: 16, lag: 1, growth: 1.2, phase: x * .01 });
  }
  rig.part("rigging", "hull", path("M50 -14L28 -72M-52 -20L-30 -66M28 -72L0 -88M0 -88L-30 -66"), "rope", 1.5, { line: true, lineWidth: .5 });
  rig.drivers.push({ type: "oscillate", bone: "hull", property: "rotate", amplitude: 2.6, period: 90, wobble: .35 }, { type: "oscillate", bone: "hull", property: "y", amplitude: 2.4 * u, period: 70, phase: .3, wobble: .3 });
  return finish("ship", "ship", rig, travel(o, start, end, "linear"), palette, { x: -56 * u, y: -100 * u, width: 132 * u, height: 112 * u }, o);
}

/** A pendulum wall clock: the pendulum swings a seconds beat, the seconds hand ticks, hour and minute hands follow time keys. */
export function clockRig(o: RigPresetOptions & { time?: { frame: number; hours: number }[] } = {}): RigSpec {
  const u = (o.size ?? 420) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { wood: "#6b4128", "paint-dark": "#4a2b1a", face: "#f2ead6", detail: "#2a2320", brass: "#c9a24f", metal: "#2a2320", glass: "#d9e6ea", accent: "#c8342b" };
  const r = (v: number) => Math.round(v * 100) / 100;
  rig.bone("root", undefined, 0, 0);
  rig.bone("case", "root", 0, -50);
  rig.part("case", "case", path("M-20 -46C-20 -54 -12 -60 0 -60C12 -60 20 -54 20 -46L20 44L-20 44Z"), "wood", 2);
  rig.part("case-inset", "case", rect(-14, -6, 28, 46, 2), "paint-dark", 2.1);
  rig.part("window", "case", rect(-12, -4, 24, 42, 2), "glass", 2.2, { color: "#3b2a22" });
  rig.part("face", "case", ell(0, -38, 15.5, 15.5), "face", 4);
  rig.part("bezel", "case", path("M-17 -38A17 17 0 1 0 17 -38A17 17 0 1 0 -17 -38ZM-15.5 -38A15.5 15.5 0 1 1 15.5 -38A15.5 15.5 0 1 1 -15.5 -38Z"), "brass", 4.1);
  const ticks: string[] = [];
  for (let k = 0; k < 60; k++) {
    const a = k / 60 * Math.PI * 2, long = k % 5 === 0, r0 = long ? 11.6 : 13, r1 = 14.2, w = long ? .55 : .22, s = Math.sin(a), c = -Math.cos(a);
    ticks.push(`M${r(s * r0 - c * w)} ${r(-38 + c * r0 + s * w)}L${r(s * r1 - c * w)} ${r(-38 + c * r1 + s * w)}L${r(s * r1 + c * w)} ${r(-38 + c * r1 - s * w)}L${r(s * r0 + c * w)} ${r(-38 + c * r0 - s * w)}Z`);
  }
  rig.part("ticks", "case", path(ticks.join("")), "detail", 4.2);
  for (const [id, len, w, role] of [["hour", 8.5, 1.2, "metal"], ["minute", 12, .8, "metal"], ["second", 12.6, .3, "accent"]] as const) {
    rig.bone(id, "case", 0, -38, 180, len);
    rig.part(id, id, poly([[-w, -2.4], [w, -2.4], [w * .6, len], [0, len + 1], [-w * .6, len]]), role, 5 + (id === "second" ? .2 : id === "minute" ? .1 : 0));
  }
  rig.part("arbor", "case", ell(0, -38, 1.3, 1.3), "brass", 5.4);
  rig.bone("pendulum", "case", 0, -14, 0, 44);
  rig.part("pendulum-rod", "pendulum", rect(-.5, 0, 1, 40), "brass", 2.5);
  rig.part("pendulum-bob", "pendulum", ell(0, 40, 6, 6), "brass", 2.6);
  const time = o.time ?? [{ frame: start, hours: 10 + 9 / 60 }, { frame: end, hours: 10 + 9 / 60 + (end - start) / 30 / 3600 }];
  rig.drivers.push({ type: "pendulum", bone: "pendulum", amplitude: 12, period: 60, start }, { type: "clock", hour: "hour", minute: "minute", second: "second", time, tick: { fps: 30 }, restAngles: { hour: 0, minute: 0, second: 0 } });
  return finish("clock", "clock", rig, travel({ ...o, to: o.from }, start, end), palette, { x: -22 * u, y: -112 * u, width: 44 * u, height: 112 * u }, o);
}
