/**
 * RIG1 presets: original, parametric rigs for people, animals, creatures and machines, and the catalogue that lists
 * them with their motions and natural speeds.
 *
 * Each builder returns a plain `RigSpec` (JSON) with the motion you ask for already wired: root travel, gait,
 * wingbeats, wave chains, rolling wheels, linkages, lights, emitters. Designs are original (CC0 dedication); colours
 * are a neutral default palette that every film-look painter restyles.
 */
import type { RigSpec } from "./rig-spec";
import type { RigPresetOptions } from "./rig-kit";
import { BIRD_MOTIONS, DRAGON_MOTIONS, PERSON_MOTIONS, PERSON_PACE, QUADRUPED_MOTIONS, birdRig, butterflyRig, dragonRig, fishRig, personRig, quadPace, quadrupedRig } from "./rig-presets-living";
import { FROG_MOTIONS, LEAF_MOTIONS, PETAL_MOTIONS, SNAKE_MOTIONS, frogRig, leafRig, petalsRig, snakeRig } from "./rig-presets-nature";
import { BALLOON_MOTIONS, BICYCLE_MOTIONS, CAR_MOTIONS, CAR_STAGED, HELICOPTER_MOTIONS, MODERN_CAR_MOTIONS, balloonRig, bicyclePace, bicycleRig, carPace, carRig, clockRig, helicopterRig, locomotiveRig, modernCarRig, planeRig, shipRig } from "./rig-presets-machines";

export type { RigPresetOptions } from "./rig-kit";
export { scalePath } from "./rig-kit";
export * from "./rig-presets-living";
export * from "./rig-presets-machines";
export * from "./rig-presets-nature";

export type RigPresetGroup = "people" | "animals" | "creatures" | "nature" | "vehicles" | "objects";
export interface RigPresetEntry {
  id: string; label: string; group: RigPresetGroup; motions: readonly string[];
  /** Whether the motion moves across the scene. */
  travels: (motion: string) => boolean;
  build: (o: RigPresetOptions) => RigSpec;
  /** Default size in design px. */
  size: number;
  /** Natural travel speed in px per frame at `size` (0 for motions that stay in place or stage their own path). */
  pace?: (motion: string, size: number) => number;
  /** Flies or swims (its `y` is a height, not a ground line). */
  airborne?: (motion: string) => boolean;
  /** Motions that start, stop, reverse or turn on screen: a locked camera reads them best. */
  staged?: (motion: string) => boolean;
}

const inPlace = new Set(["idle", "wave", "talk", "cheer", "sit", "sit-down", "stand-up", "jump", "point", "think", "clap", "bow", "dance", "phone", "shoot", "box", "kick", "sword", "chop", "pan-toss"]);
/** Every preset with its motions. */
export const RIG_PRESETS: readonly RigPresetEntry[] = [
  { id: "person", label: "Person", group: "people", motions: PERSON_MOTIONS, size: 360, travels: m => !inPlace.has(m), build: personRig, pace: (m, s) => (PERSON_PACE[m] ?? 0) * s / 100 },
  { id: "dog", label: "Dog", group: "animals", motions: QUADRUPED_MOTIONS, size: 320, travels: m => m !== "idle" && m !== "sit", build: o => quadrupedRig("dog", o), pace: (m, s) => quadPace("dog", m, s) },
  { id: "horse", label: "Horse", group: "animals", motions: QUADRUPED_MOTIONS.filter(m => m !== "sit"), size: 430, travels: m => m !== "idle", build: o => quadrupedRig("horse", o), pace: (m, s) => quadPace("horse", m, s) },
  { id: "cat", label: "Cat", group: "animals", motions: QUADRUPED_MOTIONS, size: 280, travels: m => m !== "idle" && m !== "sit", build: o => quadrupedRig("cat", o), pace: (m, s) => quadPace("cat", m, s) },
  { id: "bird", label: "Songbird", group: "animals", motions: BIRD_MOTIONS, size: 170, travels: m => m === "fly" || m === "glide" || m === "hop", build: birdRig,
    pace: (m, s) => m === "fly" ? s * .055 : m === "glide" ? s * .06 : m === "hop" ? s * .014 : 0, airborne: m => m === "fly" || m === "glide" },
  { id: "butterfly", label: "Butterfly", group: "animals", motions: ["flutter"], size: 150, travels: () => true, build: butterflyRig, pace: (_m, s) => s * .02, airborne: () => true },
  { id: "fish", label: "Koi", group: "animals", motions: ["swim"], size: 300, travels: () => true, build: fishRig, pace: (_m, s) => s * .012, airborne: () => true },
  { id: "frog", label: "Frog", group: "animals", motions: FROG_MOTIONS, size: 160, travels: m => m === "hop", build: frogRig, pace: (m, s) => m === "hop" ? 234 * (s / 60) / 49 : 0 },
  { id: "snake", label: "Snake", group: "animals", motions: SNAKE_MOTIONS, size: 360, travels: m => m === "slither", build: snakeRig, pace: (m, s) => m === "slither" ? s * .011 : 0 },
  { id: "dragon", label: "Dragon", group: "creatures", motions: DRAGON_MOTIONS, size: 620, travels: m => m !== "roar", build: dragonRig,
    pace: (m, s) => m === "fly" ? s * .02 : m === "glide" ? s * .024 : m === "walk" ? s * .006 : 0, airborne: m => m === "fly" || m === "glide" },
  { id: "leaf", label: "Leaf", group: "nature", motions: LEAF_MOTIONS, size: 420, travels: () => false, build: leafRig, staged: m => m !== "sway" },
  { id: "petals", label: "Cherry-blossom petals", group: "nature", motions: PETAL_MOTIONS, size: 500, travels: () => false, build: petalsRig },
  { id: "modern-car", label: "Modern car", group: "vehicles", motions: MODERN_CAR_MOTIONS, size: 470, travels: m => !["open-window", "flash-lights", "hazards"].includes(m), build: modernCarRig, pace: carPace, staged: m => CAR_STAGED.has(m) },
  { id: "car", label: "Vintage car", group: "vehicles", motions: CAR_MOTIONS, size: 440, travels: () => true, build: carRig, pace: carPace, staged: m => CAR_STAGED.has(m) },
  { id: "bicycle", label: "Bicycle", group: "vehicles", motions: BICYCLE_MOTIONS, size: 380, travels: () => true, build: bicycleRig, pace: bicyclePace, staged: m => m === "stop" || m === "sudden-stop" },
  { id: "locomotive", label: "Steam locomotive", group: "vehicles", motions: ["run"], size: 760, travels: () => true, build: locomotiveRig, pace: (_m, s) => s * .02 },
  { id: "plane", label: "Propeller plane", group: "vehicles", motions: ["fly"], size: 520, travels: () => true, build: planeRig, pace: (_m, s) => s * .025, airborne: () => true },
  { id: "helicopter", label: "Helicopter", group: "vehicles", motions: HELICOPTER_MOTIONS, size: 480, travels: m => m === "fly", build: helicopterRig, pace: (m, s) => m === "fly" ? s * .02 : 0, airborne: m => m === "hover" || m === "fly", staged: m => m === "takeoff" || m === "land" },
  { id: "balloon", label: "Hot-air balloon", group: "vehicles", motions: BALLOON_MOTIONS, size: 520, travels: () => true, build: balloonRig, pace: (_m, s) => s * .0016, airborne: () => true },
  { id: "ship", label: "Sailing ship", group: "vehicles", motions: ["sail"], size: 760, travels: () => true, build: shipRig, pace: (_m, s) => s * .006 },
  { id: "clock", label: "Pendulum clock", group: "objects", motions: ["tick"], size: 520, travels: () => false, build: clockRig },
];
