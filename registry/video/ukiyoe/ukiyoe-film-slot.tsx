import type { ReactNode } from "react";
import { UkiyoeScene } from "./ukiyoe-react";
import { UkiyoeInkBleed, UkiyoeKasumi, UkiyoePrintIn, UkiyoeScrollRoll } from "./ukiyoe-transitions";
import { assertUkiyoeScene } from "./ukiyoe-scene";
import type { UkiyoeSceneSpec } from "./ukiyoe-scene";

type SlotContent = { slot: string; label: string; props?: Readonly<Record<string, unknown>> };
type SlotContext = { frame: number; durationFrames: number; width: number; height: number; reducedMotion: boolean };

function pick(props: Readonly<Record<string, unknown>>, key: string, context: SlotContext): UkiyoeSceneSpec {
  const aspect = context.width > context.height ? "landscape" : "portrait";
  const variants = props[key];
  const scene: unknown = variants && typeof variants === "object" && !Array.isArray(variants) && aspect in variants
    ? (variants as Record<string, unknown>)[aspect] : variants;
  assertUkiyoeScene(scene);
  if (Math.abs(scene.width / scene.height - context.width / context.height) > .01)
    throw new RangeError(`ukiyoe ${key} aspect ratio must match the FilmStage output`);
  return scene;
}
const offset = (props: Readonly<Record<string, unknown>>, key: string) => {
  const v = props[key] ?? 0;
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) throw new RangeError(`ukiyoe ${key} must be a nonnegative integer`);
  return v;
};

/**
 * FilmStage slots for UKIYO1 films:
 * - `ukiyoe-scene` `{ scenes: {landscape, portrait} | scene, startFrame? }` plays one scene from `startFrame`.
 * - `ukiyoe-kasumi` `{ from, to, fromFrame?, toStartFrame?, color? }` sweeps mist bands from the outgoing frame into the incoming scene.
 * - `ukiyoe-transition` `{ kind: "scroll" | "ink" | "print", from, to, fromFrame?, toStartFrame? }`: the handscroll unrolling, ink
 *   bleeding, or the next sheet printed block by block.
 * Returns undefined for any other slot so hosts can chain renderers.
 */
export function renderUkiyoeSlot(content: SlotContent, context: SlotContext): ReactNode | undefined {
  const props = content.props ?? {};
  if (content.slot === "ukiyoe-scene") {
    const scene = pick(props, "scenes", context), start = offset(props, "startFrame");
    if (start + context.durationFrames > scene.durationFrames) throw new RangeError("ukiyoe-scene durationFrames must cover its film shot");
    return <UkiyoeScene spec={scene} frame={Math.min(scene.durationFrames - 1, start + context.frame)} reducedMotion={context.reducedMotion} aria-label={content.label} />;
  }
  if (content.slot === "ukiyoe-transition") {
    const from = pick(props, "from", context), to = pick(props, "to", context);
    const fromFrame = Math.min(from.durationFrames - 1, offset(props, "fromFrame") || from.durationFrames - 1);
    const toStart = offset(props, "toStartFrame"), kind = props.kind;
    const common = { outgoing: from, incoming: to, outgoingFrame: fromFrame, incomingFrame: Math.min(to.durationFrames - 1, toStart + context.frame),
      progress: context.frame / Math.max(1, context.durationFrames - 1), seed: from.seed + to.seed, reducedMotion: context.reducedMotion, "aria-label": content.label };
    if (kind === "scroll") return <UkiyoeScrollRoll {...common} />;
    if (kind === "ink") return <UkiyoeInkBleed {...common} />;
    if (kind === "print") return <UkiyoePrintIn {...common} />;
    throw new RangeError("ukiyoe-transition kind must be scroll, ink or print");
  }
  if (content.slot === "ukiyoe-kasumi") {
    const from = pick(props, "from", context), to = pick(props, "to", context);
    const fromFrame = Math.min(from.durationFrames - 1, offset(props, "fromFrame") || from.durationFrames - 1);
    const toStart = offset(props, "toStartFrame");
    const color = typeof props.color === "string" ? props.color : undefined;
    return <UkiyoeKasumi outgoing={from} incoming={to} outgoingFrame={fromFrame} incomingFrame={Math.min(to.durationFrames - 1, toStart + context.frame)} color={color}
      progress={context.frame / Math.max(1, context.durationFrames - 1)} seed={from.seed + to.seed} reducedMotion={context.reducedMotion} aria-label={content.label} />;
  }
  return undefined;
}
