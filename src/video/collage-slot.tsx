import type { ReactNode } from "react";
import { CollageScene } from "../../registry/video/collage/collage-react";
import { CollageTear } from "../../registry/video/collage/collage-tear";
import { assertCollageScene } from "../../registry/video/collage/collage-scene";
import type { CollageSceneSpec } from "../../registry/video/collage/collage-scene";

type SlotContent = { slot: string; label: string; props?: Readonly<Record<string, unknown>> };
type SlotContext = { frame: number; durationFrames: number; width: number; height: number; reducedMotion: boolean };

function pick(props: Readonly<Record<string, unknown>>, key: string, context: SlotContext): CollageSceneSpec {
  const aspect = context.width > context.height ? "landscape" : "portrait";
  const variants = props[key];
  const scene: unknown = variants && typeof variants === "object" && !Array.isArray(variants) && aspect in variants
    ? (variants as Record<string, unknown>)[aspect] : variants;
  assertCollageScene(scene);
  if (Math.abs(scene.width / scene.height - context.width / context.height) > .01)
    throw new RangeError(`collage ${key} aspect ratio must match the FilmStage output`);
  return scene;
}
const offset = (props: Readonly<Record<string, unknown>>, key: string) => {
  const v = props[key] ?? 0;
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) throw new RangeError(`collage ${key} must be a nonnegative integer`);
  return v;
};

/**
 * FilmStage slots for COLLAGE1 films:
 * - `collage-scene` `{ scenes: {landscape, portrait} | scene, startFrame? }` plays one scene from `startFrame`.
 * - `collage-tear` `{ from, to, fromFrame?, toStartFrame? }` tears the outgoing frame open over the incoming scene.
 * Returns undefined for any other slot so hosts can chain renderers.
 */
export function renderCollageSlot(content: SlotContent, context: SlotContext): ReactNode | undefined {
  const props = content.props ?? {};
  if (content.slot === "collage-scene") {
    const scene = pick(props, "scenes", context), start = offset(props, "startFrame");
    if (start + context.durationFrames > scene.durationFrames) throw new RangeError("collage-scene durationFrames must cover its film shot");
    return <CollageScene spec={scene} frame={Math.min(scene.durationFrames - 1, start + context.frame)} reducedMotion={context.reducedMotion} aria-label={content.label} />;
  }
  if (content.slot === "collage-tear") {
    const from = pick(props, "from", context), to = pick(props, "to", context);
    const fromFrame = Math.min(from.durationFrames - 1, offset(props, "fromFrame") || from.durationFrames - 1);
    const toStart = offset(props, "toStartFrame");
    return <CollageTear outgoing={from} incoming={to} outgoingFrame={fromFrame} incomingFrame={Math.min(to.durationFrames - 1, toStart + context.frame)}
      progress={context.frame / Math.max(1, context.durationFrames - 1)} seed={from.seed + to.seed} reducedMotion={context.reducedMotion} aria-label={content.label} />;
  }
  return undefined;
}
