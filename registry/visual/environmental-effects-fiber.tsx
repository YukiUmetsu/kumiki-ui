/** Environmental effects inside a `FiberStage`: rain, snow, dust, embers, sparks, bokeh, motes and fireflies as R3F children.
 * Particles are evaluated for the stage's frame before it draws, so they seek exactly. Point sizes follow the real viewport.
 */
import { useEffect, useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { createEnvironmentalEffectsThree } from "./environmental-effects-three";
import type { EffectPlan } from "./environmental-effects";
import { useStageFrame } from "./fiber-stage";

export interface EnvironmentalEffectsFiberProps {
  plans: readonly EffectPlan[];
  /** Freezes moving particles at a representative frame. */
  reducedMotion?: boolean;
}
export function EnvironmentalEffectsFiber({ plans, reducedMotion = false }: EnvironmentalEffectsFiberProps) {
  const { frame } = useStageFrame(), height = useThree(state => state.size.height), camera = useThree(state => state.camera), dpr = useThree(state => state.viewport.dpr);
  // Pixels per world unit at distance 1, so a particle's size in the plan means the same on any canvas.
  const fov = (camera as PerspectiveCamera).fov ?? 40, pointScale = height / (2 * Math.tan((fov * Math.PI) / 360)) * dpr;
  const effects = useMemo(() => createEnvironmentalEffectsThree(plans, { pointScale }), [plans, pointScale]);
  useEffect(() => () => effects.dispose(), [effects]);
  useLayoutEffect(() => { effects.update(frame, { reducedMotion }); }, [effects, frame, reducedMotion]);
  return <primitive object={effects.group} />;
}
