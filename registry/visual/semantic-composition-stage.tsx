/** Projection-aware explainer adapter.
 * A caller renders a Three/WebGL/SVG scene; this boundary supplies current-frame
 * semantic screen regions to the existing measured ExplainerStage.
 */
import { forwardRef, useMemo } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { ExplainerStage, ExplainerVisual, ExplainerText } from "./explainer-stage";
import type { ExplainerLayoutResult } from "./explainer-layout";
import type { Rect } from "../motion/types";
import type { SemanticComposition } from "./semantic-composition";

export interface SemanticCompositionStageProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  composition: SemanticComposition;
  /** Same integer frame used by the camera viewport and MG1 evaluation. */
  frame: number;
  children: ReactNode;
  explanation: string;
  language?: string;
  /** ExplainerStage uses fixed aspect authoring; specify only 16:9 or 9:16. */
  aspect?: "16:9" | "9:16";
  maxLines?: number;
  gapPx?: number;
  textStyle?: CSSProperties;
  /** A fixed editorial diagram footprint in normalized output coordinates.
   * Use for authored 2D/SVG canvases whose visible area cannot be derived from
   * the 3D camera target bounds. Camera/action visibility checks still run.
   */
  protectedVisualRegion?: Rect;
  /** Throw on any projection error rather than rendering a partial output. */
  strict?: boolean;
  onLayout?: (result: ExplainerLayoutResult) => void;
}

/** Rendering overlay text remains readable after a failure, never silently cropped. */
export const SemanticCompositionStage = forwardRef<HTMLDivElement, SemanticCompositionStageProps>(
  function SemanticCompositionStage({
    composition, frame, explanation, children, language, aspect, maxLines = 5,
    gapPx = 20, textStyle, protectedVisualRegion, strict = false, onLayout, style, ...props
  }, ref) {
    const state = useMemo(() => composition.sample(frame), [composition, frame]);
    if (strict && (composition.diagnostics.length || state.issues.length))
      throw new Error("Semantic composition is not export-ready: " +
        [...composition.diagnostics, ...state.issues].map(issue => issue.message).join("; "));
    const ratio = composition.camera.spec.output.width / composition.camera.spec.output.height;
    const mode = aspect ?? (ratio < 1 ? "9:16" : "16:9");
    const ideal = mode === "16:9" ? 16 / 9 : 9 / 16;
    if (Math.abs(ratio - ideal) > .02)
      throw new Error("SemanticCompositionStage supports authored 16:9 and 9:16 camera output. Use a matching camera or an alternate stage.");
    const issues = [...composition.diagnostics, ...state.issues];
    if (protectedVisualRegion && (
      ![protectedVisualRegion.x, protectedVisualRegion.y,
        protectedVisualRegion.width, protectedVisualRegion.height].every(Number.isFinite) ||
      protectedVisualRegion.x < 0 || protectedVisualRegion.y < 0 ||
      protectedVisualRegion.width <= 0 || protectedVisualRegion.height <= 0 ||
      protectedVisualRegion.x + protectedVisualRegion.width > 1 ||
      protectedVisualRegion.y + protectedVisualRegion.height > 1
    )) throw new Error("protectedVisualRegion needs a positive normalized rectangle within the output.");
    // For SVG diagrams, the actual content is authored directly in output
    // coordinates. Protect that entire region, rather than a fictional 3D
    // camera target's projected bounds, which caused unpredictable caption
    // placement and text covering the real artwork.
    const layoutRegions = protectedVisualRegion
      ? [{ id: "__authored-visual-region", region: protectedVisualRegion }]
      : state.regions;
    const layoutProtection = protectedVisualRegion ? ["__authored-visual-region"] : state.protect;
    return <div {...props} ref={ref} data-km-semantic-composition="" data-frame={frame}
      data-composition-valid={issues.length === 0 ? "true" : "false"}
      style={{ position: "relative", width: "100%", containerType: "inline-size", ...style }}>
      <ExplainerStage subjects={layoutRegions} protect={layoutProtection} aspect={mode}
        gapPx={gapPx} onLayout={onLayout}>
        <ExplainerVisual>{children}</ExplainerVisual>
        <ExplainerText lang={language} maxLines={maxLines} style={textStyle}>{explanation}</ExplainerText>
      </ExplainerStage>
      {issues.length > 0 ? <div role="alert" data-km-composition-diagnostics=""
        style={{ padding: 12, overflowWrap: "anywhere" }}>
        {issues.map((problem, index) => <p key={index}>{problem.code}: {problem.message}</p>)}
      </div> : null}
    </div>;
  },
);
