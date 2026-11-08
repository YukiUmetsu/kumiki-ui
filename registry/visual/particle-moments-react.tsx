/** Particle moments as React components. Each is a `FiberStage` with its particles, camera and text timing, a pure function of `frame`. */
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { RationalFps } from "../motion/types";
import { compileEffect, sampleShapeTargets } from "./environmental-effects";
import type { Vec3 } from "./environmental-effects";
import { CameraMove, FiberStage } from "./fiber-stage";
import { EnvironmentalEffectsFiber } from "./environmental-effects-fiber";
import { assembleIntoMark, embersRising, firefliesAtDusk, lensBokeh, motesInTheLight, particleFlow, sparksOnImpact } from "./particle-moments";
import type { ParticleMomentPlan } from "./particle-moments";

export interface ParticleMomentProps {
  frame: number;
  fps: RationalFps;
  /** What sits behind the particles: a photograph, a gradient, a scene. */
  backdrop?: ReactNode;
  /** What sits in front: a title, a label. */
  children?: ReactNode;
  label?: string;
  reducedMotion?: boolean;
  style?: CSSProperties;
}
const FILL: CSSProperties = { position: "absolute", inset: 0 };
/** Plays one moment plan on a frame clock. */
export function ParticleShot({ plan, frame, fps, backdrop, children, label, reducedMotion, style }: ParticleMomentProps & { plan: ParticleMomentPlan }) {
  const plans = useMemo(() => plan.specs.map(compileEffect), [plan]);
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", ...style }}>
    {backdrop && <div style={FILL}>{backdrop}</div>}
    <FiberStage frame={frame} fps={fps} label={label} style={FILL}>
      {plan.camera && <CameraMove from={plan.camera.from} to={plan.camera.to} endFrame={plan.camera.endFrame} />}
      <EnvironmentalEffectsFiber plans={plans} reducedMotion={reducedMotion} />
    </FiberStage>
    {children && <div style={{ ...FILL, pointerEvents: "none" }}>{children}</div>}
  </div>;
}
const useStable = <T,>(make: () => T, key: string) => useMemo(make, [key]); // eslint-disable-line react-hooks/exhaustive-deps
export const MotesInTheLight = (props: ParticleMomentProps) => <ParticleShot {...props} label={props.label ?? "Dust glinting in a shaft of light"} plan={useStable(() => motesInTheLight(), "motes")} />;
export const EmbersRising = (props: ParticleMomentProps) => <ParticleShot {...props} label={props.label ?? "Embers rising and cooling"} plan={useStable(() => embersRising(), "embers")} />;
export const LensBokeh = (props: ParticleMomentProps) => <ParticleShot {...props} label={props.label ?? "Soft lights in front of the picture"} plan={useStable(() => lensBokeh(), "bokeh")} />;
export const FirefliesAtDusk = (props: ParticleMomentProps) => <ParticleShot {...props} label={props.label ?? "Fireflies blinking at dusk"} plan={useStable(() => firefliesAtDusk(), "fireflies")} />;
/** One burst on `impactFrame`, with a glow on the same frame. */
export function SparksOnImpact({ impactFrame = 30, ...props }: ParticleMomentProps & { impactFrame?: number }) {
  const moment = useMemo(() => sparksOnImpact({ impactFrame }), [impactFrame]);
  return <ParticleShot {...props} label={props.label ?? "A burst of sparks on impact"} plan={moment}
    backdrop={<>{props.backdrop}<div style={{ ...FILL, background: "radial-gradient(ellipse at 50% 72%, rgba(255,200,140,.75), transparent 45%)", opacity: moment.flash(props.frame) }} /></>} />;
}
/** Read a silhouette's points for `assemble`. Undefined until the picture has loaded. */
export function useShapeTargets(src: string, count = 1400, width = 2.2): Vec3[] | undefined {
  const [targets, setTargets] = useState<Vec3[]>();
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    image.decode().then(() => {
      const w = 220, h = Math.max(1, Math.round(w * (image.naturalHeight || 1) / (image.naturalWidth || 1))), canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      context.drawImage(image, 0, 0, w, h);
      if (alive) setTargets(sampleShapeTargets(context.getImageData(0, 0, w, h).data, w, h, count, { width }));
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [src, count, width]);
  return targets;
}
/** Many particles form `mark`, a silhouette with a transparent background. `name` lands once it settles. */
export function AssembleIntoMark({ mark, name, color, dissolve, ...props }: ParticleMomentProps & { mark: string; name?: ReactNode; color?: string; dissolve?: boolean }) {
  const targets = useShapeTargets(mark);
  const moment = useMemo(() => targets && assembleIntoMark({ targets, color, dissolve }), [targets, color, dissolve]);
  if (!moment) return <div style={{ position: "relative", width: "100%", height: "100%", ...props.style }}>{props.backdrop}</div>;
  const shown = Math.min(1, Math.max(0, (props.frame - (moment.titleFrame ?? 0)) / 24));
  return <ParticleShot {...props} label={props.label ?? "Particles forming a mark"} plan={moment}>
    {props.children}
    {name && <span style={{ position: "absolute", left: 0, right: 0, top: "74%", textAlign: "center", color: "#eef3f6", font: "500 clamp(14px, 4cqh, 34px)/1 var(--km-font-body, system-ui)", letterSpacing: ".3em", opacity: 1 - (1 - shown) ** 3 }}>{name}</span>}
  </ParticleShot>;
}
/** Particles stream from one labelled thing to another. `value` is written on the flow, because density is only approximate. */
export function ParticleFlow({ fromLabel, toLabel, value, volume = .6, ...props }: ParticleMomentProps & { fromLabel: ReactNode; toLabel: ReactNode; value?: ReactNode; volume?: number }) {
  const moment = useMemo(() => particleFlow({ volume }), [volume]);
  const tag: CSSProperties = { position: "absolute", top: "50%", transform: "translateY(-50%)", padding: ".5em .9em", borderRadius: 10, background: "rgba(10,24,36,.88)", border: "1px solid rgba(159,227,255,.45)", color: "#e8f6fb", font: "600 clamp(12px, 3.2cqh, 24px)/1.2 var(--km-font-body, system-ui)" };
  return <ParticleShot {...props} label={props.label ?? "Particles flowing from one thing to another"} plan={moment}>
    <span style={{ ...tag, left: "5%" }}>{fromLabel}</span>
    <span style={{ ...tag, right: "5%" }}>{toLabel}</span>
    {value && <span style={{ position: "absolute", left: 0, right: 0, top: "24%", textAlign: "center", color: "#e8f6fb", font: "700 clamp(16px, 5cqh, 40px)/1 var(--km-font-body, system-ui)" }}>{value}</span>}
  </ParticleShot>;
}
