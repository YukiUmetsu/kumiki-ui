/** Product reveal over an authored clip. Blender, footage, and other renderers
 * enter through the existing ClipPlacement/ClipFrameAdapter boundary. */
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { FrameAccurateClip } from "../frame-accurate-clip";
import type { ClipPlacement } from "../frame-clip";
import type { ClipFrameAdapter } from "../frame-clip-adapters";
import type { RationalFps } from "../../motion/types";

export interface ProductHeroRevealSceneProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  clip: ClipPlacement;
  adapter: ClipFrameAdapter;
  /** Continuous preview slot. Drive frame from the media element time; omit for frame-verified export. */
  renderMedia?: () => ReactNode;
  frame: number;
  fps: RationalFps;
  width: number;
  height: number;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  /** Absolute frame where editorial copy begins; place it in the supplied clip's hero hold. */
  copyAtFrame: number;
  copyFadeFrames?: number;
  description: string;
  reducedMotion?: boolean;
}
export const ProductHeroRevealScene = forwardRef<HTMLDivElement, ProductHeroRevealSceneProps>(function ProductHeroRevealScene({
  clip, adapter, renderMedia, frame, fps, width, height, title, eyebrow, subtitle, copyAtFrame, copyFadeFrames = 18,
  description, reducedMotion = false, style, ...props
}, ref) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error("Product reveal needs positive finite output dimensions. Match them to the authored clip.");
  if (!Number.isSafeInteger(copyAtFrame) || copyAtFrame < clip.startFrame || copyAtFrame >= clip.startFrame + clip.durationFrames)
    throw new Error("Product reveal copyAtFrame must be an integer inside the clip. Set it to the authored hero hold.");
  if (!Number.isSafeInteger(copyFadeFrames) || copyFadeFrames < 0)
    throw new Error("Product reveal copyFadeFrames must be a nonnegative integer; use 0 for a cut.");
  if (copyAtFrame + copyFadeFrames >= clip.startFrame + clip.durationFrames)
    throw new Error("Product reveal copy fades past the clip ending. Move copyAtFrame earlier or shorten copyFadeFrames so the final composition is readable.");
  if (Math.abs(width / height - clip.source.width / clip.source.height) > .01)
    throw new Error("Product reveal footage does not match the output aspect. Supply a separately authored portrait or landscape clip instead of cropping away the product.");
  const shown = reducedMotion ? clip.startFrame + clip.durationFrames - 1 : frame;
  const opacity = copyFadeFrames === 0 ? Number(shown >= copyAtFrame) : Math.max(0, Math.min(1, (shown - copyAtFrame) / copyFadeFrames));
  const portrait = height > width;
  return <div {...props} ref={ref} data-km-product-hero-reveal="" data-copy-visible={opacity === 1 ? "true" : "false"}
    style={{ position: "relative", width: "100%", aspectRatio: `${width}/${height}`, containerType: "inline-size",
      overflow: "hidden", color: "var(--km-product-ink, #f6f2e9)", background: "var(--km-product-background, #101719)", ...style }}>
    {renderMedia ? renderMedia() : <FrameAccurateClip placement={clip} adapter={adapter} frame={shown} fps={fps} width={width} height={height}
      description={description} requireExact framing={{ fit: "contain" }}/> }
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity,
      background: portrait ? "linear-gradient(180deg, var(--km-product-copy-shade, rgba(4,8,10,.68)), transparent 32%)"
        : "linear-gradient(90deg, var(--km-product-copy-shade, rgba(4,8,10,.68)), transparent 45%)" }}/>
    <div data-km-product-copy="" aria-hidden={opacity < 1 || undefined} style={{ position: "absolute", left: "6%",
      top: portrait ? "6%" : "15%", width: portrait ? "88%" : "32%", opacity, pointerEvents: "none" }}>
      {eyebrow && <p style={{ margin: "0 0 1.6cqw", font: `500 ${portrait ? 2.6 : 1}cqw/1.5 system-ui`,
        letterSpacing: ".20em", color: "var(--km-product-accent, #d6b88d)" }}>{eyebrow}</p>}
      <h2 style={{ margin: 0, font: `500 ${portrait ? 8.5 : 4.1}cqw/1.05 var(--km-product-font, "Newsreader Variable", Georgia, serif)`,
        letterSpacing: "-.035em", whiteSpace: "pre-line", overflowWrap: "anywhere", textWrap: "balance" }}>{title}</h2>
      {subtitle && <p style={{ margin: "2cqw 0 0", maxWidth: "32em", font: `400 ${portrait ? 3 : 1.12}cqw/1.6 system-ui`,
        color: "var(--km-product-muted, #c9d0cf)", textWrap: "pretty" }}>{subtitle}</p>}
    </div>
  </div>;
});
