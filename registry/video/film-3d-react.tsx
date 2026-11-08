/** Draws the `shot-3d` scenes of a film document with the React Three Fiber recipes. Pass the result of `createShot3dRenderer` to
 * `FilmStage` as `renderShot3d`.
 *
 * Subjects are the crafted hero assets in `technology-3d.ts`. Asset files (photographed textures, a baked set, physics bakes, a splat
 * capture) are not bundled with this module: the app gives their URLs, so a film that uses none of them loads none of them. The splat
 * renderer is optional too (`capturedPlace`), so Spark is installed only by a film that shows a captured place.
 */
import type { ReactNode } from "react";
import type { RationalFps } from "../motion/types";
import type { BakedPhysicalActionSpec } from "../motion/baked-physical-motion";
import type { HeroAsset } from "../craft/hero-asset";
import { createLaptop, createSmartphone } from "../domains/technology-3d";
import { ManyIntoOne } from "../visual/assemble-recipes-react";
import { RealLightFlythrough } from "../visual/baked-recipes-react";
import type { FlythroughDetails } from "../visual/baked-recipes-react";
import { LightThroughIt } from "../visual/light-recipes-react";
import { PhysicsPoint } from "../visual/physics-recipes-react";
import type { PhysicsWoods } from "../visual/physics-recipes-react";
import type { PhysicsScene } from "../visual/physics-shots";
import type { CapturedPlaceSpec } from "../visual/place-shots";
import { StepInside } from "../visual/portal-recipes-react";
import { createDuskMeadow } from "../visual/portal-worlds";
import type { MeadowTextures } from "../visual/portal-worlds";
import { paintWeeklyEnergyScreen } from "../visual/screen-paints";
import { ExplodedView, FinishCompare, PartSpotlight, ProductHeroTurn, ScreenComesAlive, TwoAngleProof } from "../visual/studio-recipes-react";
import type { CompareSpec, ExplodeSpec, HeroTurnSpec, ManyIntoOneSpec, PartSpotlightSpec, ScreenAliveSpec, StepInsideSpec } from "../visual/studio-shots";
import type { LightThroughSpec } from "../visual/light-shots";
import type { FlythroughSpec } from "../visual/place-shots";
import type { PhysicsPointSpec } from "../visual/physics-shots";
import { ShadowReveal } from "../visual/shadow-reveal-react";
import { ChainReaction } from "../visual/chain-reaction-react";
import { PhysicalData } from "../visual/physical-data-react";
import type { ChainReactionSpec, PhysicalDataSpec, ShadowRevealSpec } from "../visual/story-3d-shots";
import { shot3dSpec } from "./film-3d";
import type { FilmShot3dContent, Shot3dBakedSetId, Shot3dCaptureId, Shot3dPhysicsId, Shot3dScreenId, Shot3dSubjectId, Shot3dWorldId } from "./film-3d";

/** Files the shots load, by the names a film uses. Give only what your films need; a shot whose files are missing fails with its name. */
export interface Shot3dAssets {
  /** Photographed ground for the meadow world. Without it the meadow is procedural. */
  meadow?: MeadowTextures;
  /** A baked set: its glTF, the camera path baked with it, and optional close-up grain (`<name>.path.json` holds both). */
  bakedSets?: Partial<Record<Shot3dBakedSetId, { src: string; path: readonly (readonly [number, number, number])[]; details?: FlythroughDetails }>>;
  /** A splat capture's file. */
  captures?: Partial<Record<Shot3dCaptureId, { src: string }>>;
  /** Draws a captured place. Pass `CapturedPlace` from `splat-stage-react`; it is the only shot that needs Spark. */
  capturedPlace?: (props: { frame: number; fps: RationalFps; src: string; spec: CapturedPlaceSpec; tone?: "light-on-dark" | "dark-on-light"; label?: string }) => ReactNode;
  /** A physics bake from `npm run physics:bake`. */
  physics?: Partial<Record<Shot3dPhysicsId, { scene: PhysicsScene; action: BakedPhysicalActionSpec }>>;
  /** Growing-domino bakes for chain reactions, by number of links (`domino-amplifier-<links>.json`). */
  chainBakes?: Partial<Record<number, { scene: PhysicsScene; action: BakedPhysicalActionSpec }>>;
  /** Photographed wood per bake, keyed by its body groups (`left` and `right` in `stack-compare`). Without it the blocks are painted. */
  woods?: Partial<Record<Shot3dPhysicsId, PhysicsWoods>>;
}
export interface Shot3dContext { frame: number; fps: RationalFps; durationFrames: number }

type Finish = { body?: string; trim?: string };
const SUBJECTS: Record<Shot3dSubjectId, (finish?: Finish) => HeroAsset> = {
  phone: finish => createSmartphone({ id: "phone", back: finish?.body, frame: finish?.trim }),
  laptop: finish => createLaptop({ id: "laptop", color: finish?.body }),
};
const SCREENS: Record<Shot3dScreenId, (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) => void> = { "weekly-energy": paintWeeklyEnergyScreen };
const FILL = { width: "100%", height: "100%" } as const;
const missing = (what: string) => { throw new Error(`This 3D shot needs ${what}. Pass it to createShot3dRenderer.`); };

/** A `renderShot3d` for `FilmStage`. Each call of the returned function draws one shot at one frame. */
export function createShot3dRenderer(assets: Shot3dAssets = {}) {
  const worlds: Record<Shot3dWorldId, () => ReturnType<typeof createDuskMeadow>> = { meadow: () => createDuskMeadow(7, { textures: assets.meadow }) };
  // Subject builders are made once per subject and finish, so the recipes' asset cache (keyed by `assetKey`) builds each asset once.
  const builders = new Map<string, () => HeroAsset>();
  const builder = (subject: Shot3dSubjectId, finish?: Finish) => {
    const key = `${subject}:${finish?.body ?? ""}:${finish?.trim ?? ""}`;
    if (!builders.has(key)) builders.set(key, () => SUBJECTS[subject](finish));
    return { create: builders.get(key)!, assetKey: key };
  };
  return function renderShot3d(content: FilmShot3dContent, { frame, fps, durationFrames }: Shot3dContext): ReactNode {
    const common = { frame, fps, label: content.label, tone: content.tone, style: FILL };
    const studio = "studio" in content ? content.studio : undefined;
    switch (content.shot) {
      case "hero-turn": return <ProductHeroTurn {...common} {...builder(content.subject)} studio={studio} spec={shot3dSpec(content, durationFrames) as HeroTurnSpec} action={content.action} />;
      case "part-spotlight": return <PartSpotlight {...common} {...builder(content.subject)} studio={studio} spec={shot3dSpec(content, durationFrames) as PartSpotlightSpec} />;
      case "exploded-view": return <ExplodedView {...common} {...builder(content.subject)} studio={studio} spec={shot3dSpec(content, durationFrames) as ExplodeSpec} />;
      case "finish-compare": return <FinishCompare {...common} studio={studio} spec={shot3dSpec(content, durationFrames) as CompareSpec} variants={content.finishes.map(finish => ({ create: builder(content.subject, finish).create }))} />;
      case "two-angle": return <TwoAngleProof {...common} {...builder(content.subject)} studio={studio} spec={shot3dSpec(content, durationFrames) as CompareSpec} action={content.action} />;
      case "screen-alive": return <ScreenComesAlive {...common} {...builder(content.subject)} studio={studio} spec={shot3dSpec(content, durationFrames) as ScreenAliveSpec} paint={SCREENS[content.screen]} />;
      case "step-inside": return <StepInside {...common} {...builder(content.subject)} studio={studio} spec={shot3dSpec(content, durationFrames) as StepInsideSpec} world={worlds[content.world]} worldKey={content.world + (assets.meadow ? "-photo" : "")} />;
      case "many-into-one": return <ManyIntoOne {...common} {...builder(content.subject)} studio={studio} spec={shot3dSpec(content, durationFrames) as ManyIntoOneSpec} />;
      case "light-through-water": return <LightThroughIt {...common} spec={shot3dSpec(content, durationFrames) as LightThroughSpec} />;
      case "baked-flythrough": {
        const set = assets.bakedSets?.[content.set] ?? missing(`the baked set "${content.set}" (bakedSets)`);
        return <RealLightFlythrough {...common} src={set.src} path={set.path} details={set.details} spec={shot3dSpec(content, durationFrames) as FlythroughSpec} />;
      }
      case "captured-place": {
        const capture = assets.captures?.[content.capture] ?? missing(`the capture "${content.capture}" (captures)`);
        const Place = assets.capturedPlace ?? missing("a splat renderer (capturedPlace)");
        return <Place frame={frame} fps={fps} src={capture.src} spec={shot3dSpec(content, durationFrames) as CapturedPlaceSpec} tone={content.tone} label={content.label} />;
      }
      case "shadow-reveal": return <ShadowReveal {...common} spec={shot3dSpec(content, durationFrames) as ShadowRevealSpec} />;
      case "chain-reaction": {
        const bake = assets.chainBakes?.[content.spec.links.length] ?? missing(`the growing-domino bake for ${content.spec.links.length} links (chainBakes)`);
        return <ChainReaction {...common} studio={studio} bake={bake} spec={shot3dSpec(content, durationFrames) as ChainReactionSpec} />;
      }
      case "physical-data": return <PhysicalData {...common} studio={studio} spec={shot3dSpec(content, durationFrames) as PhysicalDataSpec} />;
      case "physics-point": {
        const bake = assets.physics?.[content.bake] ?? missing(`the physics bake "${content.bake}" (physics)`);
        return <PhysicsPoint {...common} studio={studio} scene={bake.scene} action={bake.action} woods={assets.woods?.[content.bake]} spec={shot3dSpec(content, durationFrames) as PhysicsPointSpec} />;
      }
    }
  };
}
