import { forwardRef, useEffect, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import type { RationalFps } from "../motion/types";
import type { ImageAsset } from "./scene-templates";
import { ShaderFxLayer } from "./shader-fx-react";
import { causticReveal, findLightSource, lightWithASource, livingStill, markSting, resolveIntoMark, resolveIntoPicture, signatureGradient } from "./shader-fx-moments";
import type { LightSource, SignatureBrand } from "./shader-fx-moments";

/** Every moment is a pure function of `frame`, so it scrubs, captures and exports frame for frame. */
interface MomentProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  frame: number;
  fps: RationalFps;
  /** Frames in the host shot. */
  durationFrames: number;
  reducedMotion?: boolean;
}
const FILL: CSSProperties = { position: "absolute", inset: 0 };
/** Text inherits its colour, so a caller sets it with `style.color`: white by default, dark over a bright sky. */
const ROOT: CSSProperties = { position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", color: "var(--km-on-accent, #f3f6f8)" };
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const appear = (frame: number, at: number, length = 18) => { const t = clamp((frame - at) / length); return 1 - (1 - t) ** 3; };
const text: CSSProperties = { font: "600 clamp(14px, 4.2cqh, 44px)/1.2 var(--km-font-body, system-ui, sans-serif)", color: "inherit" };

/** Printed dots sharpen into the photograph; `label` lands once the picture is clear. */
export const ResolveIntoPicture = forwardRef<HTMLDivElement, MomentProps & { image: ImageAsset; label?: ReactNode; ink?: string; paper?: string }>(function ResolveIntoPicture({ frame, fps, durationFrames, reducedMotion, image, label, ink, paper, style, ...props }, ref) {
  const { fx, labelFrame } = resolveIntoPicture({ image, ink, paper });
  return <div ref={ref} {...props} style={{ ...ROOT, ...style }}>
    <ShaderFxLayer spec={fx} frame={reducedMotion ? durationFrames - 1 : frame} fps={fps} hostDurationFrames={durationFrames} style={FILL} />
    {label && <span style={{ position: "absolute", left: "6%", bottom: "8%", padding: ".35em .8em", borderRadius: 6, background: ink ?? "#1d1a16", color: paper ?? "#efe8da",
      font: "600 clamp(11px, 2.6cqh, 24px)/1.2 var(--km-font-body, system-ui)", letterSpacing: ".1em", opacity: reducedMotion ? 1 : appear(frame, labelFrame) }}>{label}</span>}
  </div>;
});

/** Coloured beams gather into the mark, which appears backlit; `name` follows. The mark should be a dark or solid silhouette. */
export const ResolveIntoMark = forwardRef<HTMLDivElement, MomentProps & { mark: ImageAsset; name?: ReactNode; colors?: readonly string[] }>(function ResolveIntoMark({ frame, fps, durationFrames, reducedMotion, mark, name, colors, style, ...props }, ref) {
  const { fx, markFrame, nameFrame } = resolveIntoMark({ colors }), f = reducedMotion ? durationFrames - 1 : frame, shown = appear(f, markFrame, 20);
  return <div ref={ref} {...props} style={{ ...ROOT, background: "#05090e", ...style }}>
    <ShaderFxLayer spec={fx} frame={f} fps={fps} hostDurationFrames={durationFrames} style={FILL} />
    <img src={mark.src} alt={mark.alt} style={{ position: "absolute", left: "50%", top: "50%", height: "18%", transform: `translate(-50%, -54%) scale(${.86 + .14 * shown})`, opacity: shown }} />
    {name && <span style={{ ...text, position: "absolute", left: 0, right: 0, top: "70%", textAlign: "center", letterSpacing: ".3em", opacity: appear(f, nameFrame, 24) }}>{name}</span>}
  </div>;
});

/** A chrome mark that rushes in and settles on its own dark field before `name` appears. */
export const MarkSting = forwardRef<HTMLDivElement, MomentProps & { mark: ImageAsset; name?: ReactNode; tint?: string }>(function MarkSting({ frame, fps, durationFrames, reducedMotion, mark, name, tint, style, ...props }, ref) {
  const { fx, markFrame, nameFrame, settle } = markSting({ mark, tint }), f = reducedMotion ? durationFrames - 1 : frame;
  const grow = appear(f, markFrame, 26);
  return <div ref={ref} {...props} style={{ ...ROOT, background: "radial-gradient(ellipse at 50% 42%, #142636 0%, #070f17 70%)", ...style }}>
    <div style={{ ...FILL, opacity: clamp((f - markFrame) / 8), transform: `scale(${.9 + .1 * grow})` }}>
      <ShaderFxLayer spec={fx} frame={settle(f)} fps={fps} hostDurationFrames={Math.max(durationFrames, Math.ceil(settle(durationFrames)) + 1)} style={FILL} />
    </div>
    {name && <span style={{ ...text, position: "absolute", left: 0, right: 0, top: "68%", textAlign: "center", letterSpacing: `${.32 - .14 * appear(f, nameFrame, 40)}em`, opacity: appear(f, nameFrame, 28) }}>{name}</span>}
  </div>;
});

/** Only the water moves, below `waterline`, with a very slow push. */
export const LivingStill = forwardRef<HTMLDivElement, MomentProps & { image: ImageAsset; waterline: number; title?: ReactNode }>(function LivingStill({ frame, fps, durationFrames, reducedMotion, image, waterline, title, style, ...props }, ref) {
  const { fx } = livingStill({ image, waterline }), t = reducedMotion ? 0 : clamp(frame / durationFrames), push = 1 + .03 * t * t * (3 - 2 * t);
  return <div ref={ref} {...props} style={{ ...ROOT, ...style }}>
    <div style={{ ...FILL, transform: `scale(${push})` }}><ShaderFxLayer spec={fx} frame={frame} fps={fps} hostDurationFrames={durationFrames} reducedMotion={reducedMotion} style={FILL} /></div>
    {title && <span style={{ ...text, position: "absolute", left: "7%", top: "9%", zIndex: 2, opacity: reducedMotion ? 1 : appear(frame, 30) }}>{title}</span>}
  </div>;
});

/** The picture comes up through calming water; `title` lands as the surface settles. */
export const CausticReveal = forwardRef<HTMLDivElement, MomentProps & { image: ImageAsset; title?: ReactNode }>(function CausticReveal({ frame, fps, durationFrames, reducedMotion, image, title, style, ...props }, ref) {
  const { fx, titleFrame } = causticReveal({ image }), f = reducedMotion ? durationFrames - 1 : frame;
  return <div ref={ref} {...props} style={{ ...ROOT, ...style }}>
    <ShaderFxLayer spec={fx} frame={f} fps={fps} hostDurationFrames={durationFrames} style={FILL} />
    {/* Water light is busy, so the words get a soft band of their own. */}
    {title && <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", background: "linear-gradient(transparent, rgba(2,10,18,.72))", opacity: appear(f, titleFrame - 10, 22) }} />}
    {title && <span style={{ ...text, position: "absolute", left: "7%", bottom: "9%", opacity: appear(f, titleFrame, 22) }}>{title}</span>}
  </div>;
});

/** The brand's gradient. Pass the same `brand` everywhere, and put content in `children`. */
export const SignatureGradient = forwardRef<HTMLDivElement, MomentProps & { brand: SignatureBrand; children?: ReactNode }>(function SignatureGradient({ frame, fps, durationFrames, reducedMotion, brand, children, style, ...props }, ref) {
  return <div ref={ref} {...props} style={{ ...ROOT, ...style }}>
    <ShaderFxLayer spec={signatureGradient(brand).fx} frame={frame} fps={fps} hostDurationFrames={durationFrames} reducedMotion={reducedMotion} style={FILL} />
    <div style={{ ...FILL }}>{children}</div>
  </div>;
});

/** Read a picture and find its light, for the frame's shape. Undefined until the picture has loaded. */
export function useLightSource(src: string, aspect: number): LightSource | undefined {
  const [light, setLight] = useState<LightSource>();
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    image.decode().then(() => {
      const width = 320, height = Math.round(width * image.naturalHeight / image.naturalWidth), canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      context.drawImage(image, 0, 0, width, height);
      if (alive) setLight(findLightSource(context.getImageData(0, 0, width, height).data, width, height, aspect));
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [src, aspect]);
  return light;
}
/** Rays from the real light in a photograph, found automatically, fading in before `title` lands. Pass `light` to skip the search. */
export const LightWithASource = forwardRef<HTMLDivElement, MomentProps & { image: ImageAsset; title?: ReactNode; light?: LightSource }>(function LightWithASource({ frame, fps, durationFrames, reducedMotion, image, title, light, style, ...props }, ref) {
  const [box, setBox] = useState<HTMLDivElement | null>(null), aspect = box ? box.clientWidth / Math.max(1, box.clientHeight) : 16 / 9;
  const found = useLightSource(image.src, aspect), source = light ?? found;
  const moment = source && lightWithASource({ light: source, aspect }), f = reducedMotion ? durationFrames - 1 : frame;
  const t = reducedMotion ? 1 : clamp(f / durationFrames), push = 1 + .05 * t * t * (3 - 2 * t);
  return <div ref={node => { setBox(node); if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }} {...props} style={{ ...ROOT, ...style }}>
    <div style={{ ...FILL, transform: `scale(${push})`, transformOrigin: source ? `${source.x * 100}% ${source.y * 100}%` : "50% 40%" }}>
      <img src={image.src} alt={image.alt} style={{ ...FILL, width: "100%", height: "100%", objectFit: "cover" }} />
      {moment && <ShaderFxLayer spec={moment.fx} frame={f} fps={fps} hostDurationFrames={durationFrames} style={FILL} />}
    </div>
    {title && moment && <span style={{ ...text, position: "absolute", left: "7%", bottom: "9%", textShadow: "0 1px 14px rgba(0,20,40,.55)", opacity: appear(f, moment.titleFrame, 22) }}>{title}</span>}
  </div>;
});

/** One fine grain over a whole film, so separate layers read as one made piece. Seeded by frame, so a frame always looks the same. */
export function GrainFinish({ frame, amount = .06, style }: { frame: number; amount?: number; style?: CSSProperties }) {
  const seed = (frame % 24) + 1;
  return <svg aria-hidden width="100%" height="100%" style={{ ...FILL, pointerEvents: "none", mixBlendMode: "overlay", opacity: Math.min(.2, Math.max(0, amount)) * 4, ...style }}>
    <filter id={`km-grain-${seed}`}><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={2} seed={seed} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
    <rect width="100%" height="100%" filter={`url(#km-grain-${seed})`} />
  </svg>;
}
